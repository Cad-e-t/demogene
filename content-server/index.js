import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { generateStorySegments, generateImage, editImage, generateFullVoiceover } from './gemini.js';
import { assembleVideo } from './video-assembler.js';
import { generateSubtitles, burnSubtitles } from './subtitle-generator.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';

// --- Setup ---
const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEMP_DIR = os.tmpdir();

// --- Constants & Pricing ---
const COST_IMAGE_FAST = 2; // Credits per image
const COST_IMAGE_ULTRA = 4; // Credits per image
const COST_IMAGE_EDIT = 4; // Credits per edit
const COST_AUDIO_PER_SECOND = 0.05; // Credits per second (3 credits per minute)
const COST_SUBTITLE_PER_SECOND = 0.017; // Credits per second (1 credit per minute)
const MIN_BALANCE = 10; // Minimum credits required to start

// --- Helper: Credits ---
async function getCredits(userId) {
    const { data } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    return data?.credits || 0;
}

async function chargeUser(userId, amount, description) {
    // Direct flexible charge to profiles table
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    if (!profile) throw new Error("User profile not found");
    
    const newBalance = (profile.credits || 0) - amount;
    
    const { error } = await supabase.from('profiles').update({ 
        credits: newBalance,
        updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (error) throw new Error(`Credit charge failed: ${error.message}`);
    
    // Log transaction if table exists (optional, keeping for audit)
    // Assuming a unified transaction log or reusing creator_transactions for now if desired, 
    // but the prompt emphasized `profiles` table. Let's log to credit_transactions if available in main app schema.
    await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -amount,
        type: 'usage',
        description: description
    }).catch(err => console.error("Failed to log transaction", err));
}

async function refundUser(userId, amount, description) {
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    if (!profile) return;

    const newBalance = (profile.credits || 0) + amount;
    
    await supabase.from('profiles').update({ 
        credits: newBalance,
        updated_at: new Date().toISOString()
    }).eq('id', userId);

    await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'refund',
        description: description
    }).catch(err => console.error("Failed to log refund", err));
}

// --- Helper: Calculate Audio Durations ---
function calculateAudioLineDurations(lines, totalAudioDuration) {
  if (!lines || lines.length === 0) return [];
  const totalChars = lines.reduce((acc, line) => acc + line.narration.length, 0);
  const unit = totalAudioDuration / totalChars;
  return lines.map(line => line.narration.length * unit);
}

// --- Helper: Download URL to File ---
async function downloadUrlToFile(url, dest) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
}

// --- Helper: Extract Key from URL ---
function getKeyFromUrl(url) {
    if (!url) return null;
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    if (url.startsWith(baseUrl)) {
        return url.replace(baseUrl, '');
    }
    return null;
}

// --- Background Processors ---

async function processImagesBackground(projectId, segments, aspectRatio, pictureQuality, costPerImage, userId) {
    console.log(`[ContentServer] Starting background image generation for project ${projectId} with quality ${pictureQuality}`);
    
    let failedCount = 0;

    await Promise.all(segments.map(async (seg) => {
        try {
            console.log(`[ContentServer] Generating image for segment ${seg.order_index} (Project: ${projectId})`);
            const base64Img = await generateImage(seg.image_prompt, aspectRatio, pictureQuality);
            
            console.log(`[ContentServer] Uploading image for segment ${seg.order_index}`);
            const buffer = Buffer.from(base64Img, 'base64');
            const key = `content/${projectId}/${seg.order_index}_${uuidv4()}.png`;
            
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: 'image/png'
            }));
            
            const imageUrl = `${R2_PUBLIC_URL}/${key}`;
            
            console.log(`[ContentServer] Updating DB for segment ${seg.order_index}`);
            const { error } = await supabase.from('content_segments')
                .update({ image_url: imageUrl })
                .eq('id', seg.id);
            
            if (error) console.error(`[ContentServer] DB Update Error for seg ${seg.id}:`, error);

        } catch (e) {
            console.error(`[ContentServer] Image gen failed for segment ${seg.order_index}`, e);
            failedCount++;
        }
    }));
    
    // Refund for failures
    if (failedCount > 0) {
        console.log(`[ContentServer] Refunding ${failedCount} failed images for user ${userId}`);
        await refundUser(userId, failedCount * costPerImage, `Refund: Failed Images (${failedCount})`);
    }

    // UPDATE PROJECT STATUS
    const finalStatus = failedCount === 0 ? 'completed' : 'draft';
    await supabase.from('content_projects').update({ status: finalStatus }).eq('id', projectId);

    console.log(`[ContentServer] Background image generation complete for project ${projectId}. Status set to: ${finalStatus}`);
}

// --- Routes ---

// 1. Generate Story Segments (Text First, Images Background)
app.post('/generate-segments', async (req, res) => {
    try {
        const { prompt, aspectRatio, style, effect, userId, narrationStyle, visualDensity, pictureQuality, subtitles } = req.body;
        console.log(`[ContentServer] Received generate request: "${prompt.substring(0, 30)}..." with density ${visualDensity}, quality ${pictureQuality}, subtitles ${subtitles}`);
        
        // 0. Pre-check Balance
        const userCredits = await getCredits(userId);
        if (userCredits < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits. Minimum 10 credits required." });
        }

        // 1. Create Project
        const { data: project, error } = await supabase.from('content_projects').insert({
            user_id: userId,
            title: prompt.substring(0, 50),
            aspect_ratio: aspectRatio,
            image_style: style,
            effect: effect || 'zoom_pulse',
            narration_style: narrationStyle, // Save style to DB
            picture_quality: pictureQuality || 'Fast', // Save picture quality to DB
            subtitles: subtitles || 'none', // Save subtitles to DB
            status: 'draft'
        }).select().single();
        
        if (error) throw error;
        console.log(`[ContentServer] Project created: ${project.id}`);

        // 2. Generate Text Segments
        console.log(`[ContentServer] Generating text segments...`);
        const segmentsData = await generateStorySegments(prompt, aspectRatio, style, visualDensity);
        console.log(`[ContentServer] Text segments generated: ${segmentsData.length}`);

        // 3. Determine Cost & Charge
        const costPerImage = (pictureQuality === 'Ultra') ? COST_IMAGE_ULTRA : COST_IMAGE_FAST;
        const totalCost = segmentsData.length * costPerImage;

        // Check balance again before charging
        const currentBalance = await getCredits(userId);
        if (currentBalance < totalCost) {
            // Delete the draft project to keep it clean? Or leave it. Leaving it is fine.
            return res.status(402).json({ error: `Insufficient credits. Need ${totalCost} credits for ${segmentsData.length} images.` });
        }

        await chargeUser(userId, totalCost, `Image Gen Batch (${pictureQuality}) - ${segmentsData.length} images`);

        // 4. Save Text Segments to DB (Image NULL)
        const segmentsToInsert = segmentsData.map((s, idx) => ({
            project_id: project.id,
            narration: s.narration,
            image_prompt: s.image_prompt,
            image_url: null, // Placeholder, images come later
            order_index: idx
        }));

        const { data: insertedSegments, error: segError } = await supabase
            .from('content_segments')
            .insert(segmentsToInsert)
            .select();

        if (segError) throw segError;
        console.log(`[ContentServer] Segments saved to DB. Returning early response.`);

        // 5. Set status to generating
        await supabase.from('content_projects').update({ status: 'generating' }).eq('id', project.id);

        // 6. Return Response IMMEDIATELY
        res.json({ projectId: project.id, segments: insertedSegments });

        // 7. Trigger Background Image Gen (Pass cost for refunds)
        processImagesBackground(project.id, insertedSegments, aspectRatio, pictureQuality || 'Fast', costPerImage, userId);

    } catch (e) {
        console.error("[ContentServer] Error in generate-segments:", e);
        res.status(500).json({ error: e.message });
    }
});

// New Route: Regenerate Single Image
app.post('/regenerate-image', async (req, res) => {
    const { segmentId, projectId, imagePrompt, aspectRatio, currentImageUrl } = req.body;
    
    // We need userId to charge. It should be passed or fetched. 
    // Assuming we fetch it from project to be secure.
    let userId = null;
    let quality = 'Fast';

    try {
        console.log(`[ContentServer] Regenerating image for segment ${segmentId}`);

        // 0. Fetch Project
        const { data: project, error: projError } = await supabase
            .from('content_projects')
            .select('user_id, picture_quality')
            .eq('id', projectId)
            .single();
        
        if (projError || !project) throw new Error("Project not found");
        userId = project.user_id;
        quality = project.picture_quality || 'Fast';

        // 1. Calculate Cost & Charge
        const cost = quality === 'Ultra' ? COST_IMAGE_ULTRA : COST_IMAGE_FAST;
        const balance = await getCredits(userId);
        
        if (balance < cost) {
            return res.status(402).json({ error: `Insufficient credits. Need ${cost} credits.` });
        }

        await chargeUser(userId, cost, `Image Regeneration (${quality})`);

        // 2. Generate new image
        const base64Img = await generateImage(imagePrompt, aspectRatio, quality);
        const buffer = Buffer.from(base64Img, 'base64');

        // 3. Determine Key
        let key;
        const existingKey = getKeyFromUrl(currentImageUrl);
        if (existingKey) {
            key = existingKey;
        } else {
            key = `content/${projectId}/${segmentId}_${uuidv4()}.png`;
        }

        // 4. Upload
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/png'
        }));

        const newImageUrl = `${R2_PUBLIC_URL}/${key}`;

        // 5. Update DB
        const { error } = await supabase.from('content_segments')
            .update({ image_url: newImageUrl })
            .eq('id', segmentId);

        if (error) throw error;

        res.json({ imageUrl: newImageUrl });

    } catch (e) {
        console.error("[ContentServer] Regeneration failed", e);
        // Refund on failure
        if (userId) {
            const cost = quality === 'Ultra' ? COST_IMAGE_ULTRA : COST_IMAGE_FAST;
            await refundUser(userId, cost, "Refund: Failed Regeneration");
        }
        res.status(500).json({ error: e.message });
    }
});

// 2. Edit Image
app.post('/edit-image', async (req, res) => {
    const { segmentId, editPrompt, currentImageUrl } = req.body;
    let userId = null;

    try {
        console.log(`[ContentServer] Editing image for segment ${segmentId}`);
        
        // Fetch segment to get project -> userId
        const { data: segment } = await supabase.from('content_segments').select('project_id').eq('id', segmentId).single();
        if (!segment) throw new Error("Segment not found");
        
        const { data: project } = await supabase.from('content_projects').select('user_id').eq('id', segment.project_id).single();
        if (!project) throw new Error("Project not found");
        userId = project.user_id;

        // 1. Check & Charge
        const cost = COST_IMAGE_EDIT;
        const balance = await getCredits(userId);
        if (balance < cost) {
            return res.status(402).json({ error: `Insufficient credits. Need ${cost} credits.` });
        }
        
        await chargeUser(userId, cost, "Image Edit");

        // 2. Generate
        const resp = await fetch(currentImageUrl);
        const arrayBuf = await resp.arrayBuffer();
        const base64Original = Buffer.from(arrayBuf).toString('base64');

        const base64New = await editImage(base64Original, editPrompt);
        
        // 3. Upload
        const buffer = Buffer.from(base64New, 'base64');
        const key = `content/edits/${uuidv4()}.png`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/png'
        }));
        
        const newUrl = `${R2_PUBLIC_URL}/${key}`;

        // 4. Update DB
        await supabase.from('content_segments').update({ image_url: newUrl }).eq('id', segmentId);

        res.json({ imageUrl: newUrl });

    } catch (e) {
        console.error(e);
        // Refund on failure
        if (userId) {
            await refundUser(userId, COST_IMAGE_EDIT, "Refund: Failed Image Edit");
        }
        res.status(500).json({ error: e.message });
    }
});

// 3. Delete Project
app.delete('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        console.log(`[ContentServer] Deleting project ${id} for user ${userId}`);

        // Verify ownership
        const { data: project } = await supabase.from('content_projects').select('user_id').eq('id', id).single();
        if (!project || project.user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        // Get segments to find images to delete
        const { data: segments } = await supabase.from('content_segments').select('image_url').eq('project_id', id);
        
        // Delete images from S3
        if (segments && segments.length > 0) {
            const keys = segments
                .map(s => getKeyFromUrl(s.image_url))
                .filter(k => k !== null);
                
            await Promise.allSettled(keys.map(key => 
                s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
            ));
        }

        // Delete DB record (cascade will handle segments)
        await supabase.from('content_projects').delete().eq('id', id);
        
        res.json({ success: true });
    } catch (e) {
        console.error("Delete Project Error", e);
        res.status(500).json({ error: e.message });
    }
});

// 4. Delete Story
app.delete('/stories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        console.log(`[ContentServer] Deleting story ${id} for user ${userId}`);

        const { data: story } = await supabase.from('content_stories').select('*').eq('id', id).single();
        if (!story || story.user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        // Delete video from S3
        const key = getKeyFromUrl(story.video_url);
        if (key) {
            await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(err => console.error("S3 Delete Error", err));
        }

        // Delete DB record
        await supabase.from('content_stories').delete().eq('id', id);
        
        res.json({ success: true });
    } catch (e) {
        console.error("Delete Story Error", e);
        res.status(500).json({ error: e.message });
    }
});

// 5. Generate Video
app.post('/generate-video', async (req, res) => {
    const { projectId, voiceId, userId } = req.body;
    console.log(`[ContentServer] Starting video generation for project ${projectId}`);
    
    // 0. Pre-check Balance
    try {
        const userCredits = await getCredits(userId);
        if (userCredits < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits. Minimum 10 credits required." });
        }
    } catch(e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to check credits" });
    }

    let storyId = null;

    try {
        // Fetch segments to get a thumbnail
        const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');
        const thumbnail = segments[0]?.image_url || null;

        // Create placeholder story entry
        const { data: story } = await supabase.from('content_stories').insert({
            user_id: userId,
            project_id: projectId,
            video_url: '', // Placeholder
            thumbnail_url: thumbnail,
            status: 'generating'
        }).select().single();
        
        storyId = story.id;
        
        // Respond to client immediately
        res.status(202).json({ message: "Processing started", storyId });

    } catch (e) {
        console.error("Failed to start generation", e);
        return res.status(500).json({ error: "Failed to start generation" });
    }

    // Background Processing
    (async () => {
        const workDir = path.join(TEMP_DIR, `content_${uuidv4()}`);
        if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

        let subtitleCost = 0;

        try {
            await supabase.from('content_projects').update({ status: 'generating' }).eq('id', projectId);

            // Fetch Data
            const { data: project } = await supabase.from('content_projects').select('*').eq('id', projectId).single();
            const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');

            // 1. Generate Full Audio
            console.log(`[ContentServer] Generating full audio...`);
            const fullScript = segments.map(s => s.narration).join(" ");
            const finalVoice = voiceId || project.voice_id;
            const stylePrompt = project.narration_style || "Read aloud in a lively, confident, and magnetic tone";
            
            const audioBuffer = await generateFullVoiceover(fullScript, finalVoice, stylePrompt);
            
            const rawAudioPath = path.join(workDir, 'raw_audio.pcm');
            fs.writeFileSync(rawAudioPath, audioBuffer);
            
            const audioPath = path.join(workDir, 'full_audio.wav');
            const { execSync } = await import('child_process');
            
            try {
                execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${audioPath}"`, { stdio: 'ignore' });
            } catch (e) {
                console.error("FFmpeg PCM Conversion Failed:", e);
                throw new Error("Failed to convert TTS audio");
            }

            // 2. Charge for Audio & Subtitles
            const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
            const totalDuration = parseFloat(out.toString());
            const audioCost = Math.ceil(totalDuration * COST_AUDIO_PER_SECOND);
            
            // Check for subtitles preference
            const useSubtitles = project.subtitles && project.subtitles !== 'none';
            if (useSubtitles) {
                subtitleCost = Math.ceil(totalDuration * COST_SUBTITLE_PER_SECOND);
            }

            const totalCharge = audioCost + subtitleCost;
            
            console.log(`[ContentServer] Audio Duration: ${totalDuration}s. Charge: ${audioCost} (Audio) + ${subtitleCost} (Subtitles) = ${totalCharge} credits.`);
            
            const chargeDesc = useSubtitles 
                ? `Audio + Subtitles Generation (${totalDuration.toFixed(1)}s)`
                : `Audio Voiceover (${totalDuration.toFixed(1)}s)`;

            // Allows negative balance
            await chargeUser(userId, totalCharge, chargeDesc);

            // Update status to rendering
            await supabase.from('content_stories').update({ status: 'rendering' }).eq('id', storyId);

            // 3. Calc Splits
            const segmentDurations = calculateAudioLineDurations(segments, totalDuration);

            // 4. Download Images
            console.log(`[ContentServer] Downloading images...`);
            for (let i = 0; i < segments.length; i++) {
                if (segments[i].image_url) {
                    await downloadUrlToFile(segments[i].image_url, path.join(workDir, `img_${i}.png`));
                }
            }

            // 5. Assemble Visuals
            console.log(`[ContentServer] Assembling video with effect: ${project.effect}`);
            const assembledPath = await assembleVideo(segments, audioPath, segmentDurations, workDir, project.aspect_ratio, project.effect);

            let finalPath = assembledPath;

            // 6. Generate & Burn Subtitles (if requested)
            if (useSubtitles) {
                console.log(`[ContentServer] Generating subtitles: ${project.subtitles}`);
                try {
                    const assPath = await generateSubtitles(audioPath, project.subtitles, project.aspect_ratio);
                    
                    if (assPath) {
                        const burnedPath = path.join(workDir, `burned_${uuidv4()}.mp4`);
                        await burnSubtitles(assembledPath, assPath, burnedPath);
                        finalPath = burnedPath;
                    } else {
                        throw new Error("Subtitle generation returned no file");
                    }
                } catch (subError) {
                    console.warn(`[ContentServer] Subtitle pipeline failed: ${subError.message}. Proceeding without subtitles.`);
                    
                    // Graceful Failure: Refund subtitle portion ONLY
                    if (subtitleCost > 0) {
                        console.log(`[ContentServer] Refunding subtitle cost: ${subtitleCost}`);
                        await refundUser(userId, subtitleCost, "Refund: Subtitle Generation Failure");
                    }
                    // Fallback: finalPath remains assembledPath (video without subtitles)
                }
            }

            // 7. Upload Final
            console.log(`[ContentServer] Uploading final video...`);
            const finalBuffer = fs.readFileSync(finalPath);
            const finalKey = `content/stories/${uuidv4()}.mp4`;
            
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: finalKey,
                Body: finalBuffer,
                ContentType: 'video/mp4'
            }));

            const videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;

            // 8. Update Story with Result
            await supabase.from('content_stories').update({
                video_url: videoUrl,
                status: 'completed'
            }).eq('id', storyId);

            await supabase.from('content_projects').update({ status: 'completed' }).eq('id', projectId);
            console.log(`[ContentServer] Video generation complete: ${videoUrl}`);

        } catch (e) {
            console.error("[ContentServer] Video Gen Failed", e);
            await supabase.from('content_projects').update({ status: 'failed' }).eq('id', projectId);
            await supabase.from('content_stories').update({ status: 'failed' }).eq('id', storyId);
            
            // Note: We deliberately don't refund audio cost if assembly fails mid-way to prevent abuse,
            // but we could implement smarter refund logic here if needed.
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    })();
});

const PORT = 8001;
app.listen(PORT, () => console.log(`Content Creator Server on ${PORT}`));