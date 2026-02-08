





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
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';

// --- Setup ---
const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEMP_DIR = os.tmpdir();

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

async function processImagesBackground(projectId, segments, aspectRatio) {
    console.log(`[ContentServer] Starting background image generation for project ${projectId}`);
    
    // We process sequentially or in small batches to avoid rate limits, or parallel if quota allows.
    // Parallel for speed as per user request for "instantly".
    await Promise.all(segments.map(async (seg) => {
        try {
            console.log(`[ContentServer] Generating image for segment ${seg.order_index} (Project: ${projectId})`);
            const base64Img = await generateImage(seg.image_prompt, aspectRatio);
            
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
            // Optionally set a placeholder or error status in DB
        }
    }));
    
    console.log(`[ContentServer] Background image generation complete for project ${projectId}`);
}

// --- Routes ---

// 1. Generate Story Segments (Text First, Images Background)
app.post('/generate-segments', async (req, res) => {
    try {
        const { prompt, aspectRatio, style, effect, userId, narrationStyle, visualDensity } = req.body;
        console.log(`[ContentServer] Received generate request: "${prompt.substring(0, 30)}..." with density ${visualDensity}`);
        
        // 1. Create Project
        const { data: project, error } = await supabase.from('content_projects').insert({
            user_id: userId,
            title: prompt.substring(0, 50),
            aspect_ratio: aspectRatio,
            image_style: style,
            effect: effect || 'zoom_pulse',
            narration_style: narrationStyle, // Save style to DB
            status: 'draft'
        }).select().single();
        
        if (error) throw error;
        console.log(`[ContentServer] Project created: ${project.id}`);

        // 2. Generate Text Segments
        console.log(`[ContentServer] Generating text segments...`);
        const segmentsData = await generateStorySegments(prompt, aspectRatio, style, visualDensity);
        console.log(`[ContentServer] Text segments generated: ${segmentsData.length}`);

        // 3. Save Text Segments to DB (Image NULL)
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

        // 4. Return Response IMMEDIATELY
        res.json({ projectId: project.id, segments: insertedSegments });

        // 5. Trigger Background Image Gen
        processImagesBackground(project.id, insertedSegments, aspectRatio);

    } catch (e) {
        console.error("[ContentServer] Error in generate-segments:", e);
        res.status(500).json({ error: e.message });
    }
});

// New Route: Regenerate Single Image
app.post('/regenerate-image', async (req, res) => {
    try {
        const { segmentId, projectId, imagePrompt, aspectRatio, currentImageUrl } = req.body;
        console.log(`[ContentServer] Regenerating image for segment ${segmentId}`);

        // 1. Generate new image
        const base64Img = await generateImage(imagePrompt, aspectRatio);
        const buffer = Buffer.from(base64Img, 'base64');

        // 2. Determine Key (Overwrite if exists, else create new)
        let key;
        const existingKey = getKeyFromUrl(currentImageUrl);
        
        if (existingKey) {
            console.log(`[ContentServer] Overwriting existing image key: ${existingKey}`);
            key = existingKey;
        } else {
            console.log(`[ContentServer] Creating new image key`);
            key = `content/${projectId}/${segmentId}_${uuidv4()}.png`;
        }

        // 3. Upload
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/png'
        }));

        const newImageUrl = `${R2_PUBLIC_URL}/${key}`;

        // 4. Update DB (Required even if overwriting R2 to ensure consistency/timestamps if applicable, and definitely required if new key)
        const { error } = await supabase.from('content_segments')
            .update({ image_url: newImageUrl })
            .eq('id', segmentId);

        if (error) throw error;

        console.log(`[ContentServer] Regeneration success: ${newImageUrl}`);
        res.json({ imageUrl: newImageUrl });

    } catch (e) {
        console.error("[ContentServer] Regeneration failed", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Edit Image
app.post('/edit-image', async (req, res) => {
    try {
        const { segmentId, editPrompt, currentImageUrl } = req.body;
        console.log(`[ContentServer] Editing image for segment ${segmentId}`);
        
        // Fetch current image
        const resp = await fetch(currentImageUrl);
        const arrayBuf = await resp.arrayBuffer();
        const base64Original = Buffer.from(arrayBuf).toString('base64');

        // Edit
        const base64New = await editImage(base64Original, editPrompt);
        
        // Upload
        const buffer = Buffer.from(base64New, 'base64');
        const key = `content/edits/${uuidv4()}.png`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/png'
        }));
        
        const newUrl = `${R2_PUBLIC_URL}/${key}`;

        // Update DB
        await supabase.from('content_segments').update({ image_url: newUrl }).eq('id', segmentId);
        console.log(`[ContentServer] Image edited and saved: ${newUrl}`);

        res.json({ imageUrl: newUrl });
    } catch (e) {
        console.error(e);
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

        try {
            await supabase.from('content_projects').update({ status: 'generating' }).eq('id', projectId);

            // Fetch Data
            const { data: project } = await supabase.from('content_projects').select('*').eq('id', projectId).single();
            const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');

            // 1. Generate Full Audio
            console.log(`[ContentServer] Generating full audio...`);
            const fullScript = segments.map(s => s.narration).join(" ");
            
            // Prefer voice passed in body (latest) over project default
            const finalVoice = voiceId || project.voice_id;
            
            // Get narration style prompt from project, use new default if null
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

            // Update status to rendering
            await supabase.from('content_stories').update({ status: 'rendering' }).eq('id', storyId);

            // 2. Get Audio Duration & Calc Splits
            const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
            const totalDuration = parseFloat(out.toString());
            const segmentDurations = calculateAudioLineDurations(segments, totalDuration);

            // 3. Download Images
            console.log(`[ContentServer] Downloading images...`);
            for (let i = 0; i < segments.length; i++) {
                if (segments[i].image_url) {
                    await downloadUrlToFile(segments[i].image_url, path.join(workDir, `img_${i}.png`));
                }
            }

            // 4. Assemble
            console.log(`[ContentServer] Assembling video with effect: ${project.effect}`);
            const finalPath = await assembleVideo(segments, audioPath, segmentDurations, workDir, project.aspect_ratio, project.effect);

            // 5. Upload Final
            console.log(`[ContentServer] Uploading final video...`);
            const finalBuffer = fs.readFileSync(finalPath);
            // Unique key per generation to prevent overwrites
            const finalKey = `content/stories/${uuidv4()}.mp4`;
            
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: finalKey,
                Body: finalBuffer,
                ContentType: 'video/mp4'
            }));

            const videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;

            // 6. Update Story with Result
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
        } finally {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    })();
});

const PORT = 8001;
app.listen(PORT, () => console.log(`Content Creator Server on ${PORT}`));