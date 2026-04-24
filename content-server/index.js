
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { generateStorySegments, generateImage, editImage, generateFullVoiceover, generateGeminiVideo } from './gemini.js';
import { generateVideo } from './replicate.js';
import { assembleVideo } from './video-assembler.js';
import { generateSubtitles, burnSubtitles } from './subtitle-generator.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { AssemblyAI } from 'assemblyai';
import numberToWords from 'number-to-words';

import { generateUploadUrl as demoGenerateUploadUrl, deleteVideo as demoDeleteVideo, processVideo as demoProcessVideo, exportDemoVideo, generateHookUploadUrl, generateHookImage, deleteHookAsset } from './demo-maker/controllers.js';

// --- Setup ---
const app = express();
app.use(express.json());

// --- MIDDLEWARE ---
const allowedOrigins = new Set([
  'https://productcam.site',
  'https://creator.productcam.site',
  'https://demogene.vercel.app',
  'https://www.productcam.site',
  'http://localhost:3000',
  'https://crappik.site'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));


const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const client = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });

const TEMP_DIR = os.tmpdir();

// --- Constants & Pricing ---
const COST_VIDEO_GEMINI = 20;
const COST_IMAGE_ULTRA = 4; // Credits per image
const COST_IMAGE_EDIT = 4; // Credits per edit
const COST_AUDIO_PER_SECOND = 0.05; // Credits per second (3 credits per minute)
const COST_SUBTITLE_PER_SECOND = 0.017; // Credits per second (1 credit per minute)
const COST_PER_THOUSAND_TOKENS = 1.2;
const COST_PER_THOUSAND_INPUT_TOKENS = 0.2;
const MAX_ANALYSIS_COST = 7;
const MIN_BALANCE = 4; // Minimum credits required to start
const MAX_CONCURRENT_IMAGES = 2; // Max parallel image generations to avoid rate limits

// --- Helper: Credits ---
async function getCredits(userId) {
    const { data } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    return data?.credits || 0;
}

async function chargeUser(userId, amount, description) {
    const { error } = await supabase.rpc('charge_creator_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });
    if (error) throw new Error(`Credit charge failed: ${error.message}`);
}

async function refundUser(userId, amount, description) {
    const { error } = await supabase.rpc('refund_creator_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });
    if (error) console.error("Refund failed", error);
}

// --- Helper: Calculate Audio Durations ---
function calculateAudioLineDurations(lines, totalAudioDuration) {
  if (!lines || lines.length === 0) return [];
  const totalChars = lines.reduce((acc, line) => acc + line.narration.length, 0);
  const unit = totalAudioDuration / totalChars;
  return lines.map(line => line.narration.length * unit);
}

// --- Helper: Align Segments with Transcription ---
function alignSegmentsWithTranscription(segments, transcription, totalAudioDuration) {
    console.log("[Alignment] Starting alignment process.");
    if (!transcription || !transcription.words || transcription.words.length === 0) {
        console.log("[Alignment] No transcription words found. Falling back to heuristic.");
        return null;
    }
    
    // 1. Clean transcription words (remove punctuation, lowercase, convert numbers)
    const tWords = [];
    transcription.words.forEach(w => {
        let cleanText = w.text.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
        if (/^\d+$/.test(cleanText)) {
            try {
                cleanText = numberToWords.toWords(parseInt(cleanText, 10)).replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
            } catch (e) {}
        }
        const splitWords = cleanText.split(/\s+/).filter(x => x.length > 0);
        splitWords.forEach(sw => {
            tWords.push({
                ...w,
                clean: sw
            });
        });
    });

    console.log(`[Alignment] Normalized ${tWords.length} transcription words.`);

    if (tWords.length === 0) return null;

    const result = [];
    let tIndex = 0;
    let lastEndTimeMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        console.log(`\n[Alignment] Processing Segment ${i + 1}: "${seg.narration.substring(0, 30)}..."`);
        
        // Clean segment words (remove punctuation, lowercase, convert numbers)
        const segWordsRaw = seg.narration.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        const segWords = [];
        segWordsRaw.forEach(w => {
            if (/^\d+$/.test(w)) {
                try {
                    const converted = numberToWords.toWords(parseInt(w, 10)).replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
                    converted.split(/\s+/).filter(x => x.length > 0).forEach(sw => segWords.push(sw));
                } catch (e) {
                    segWords.push(w);
                }
            } else {
                segWords.push(w);
            }
        });

        console.log(`[Alignment] Segment ${i + 1} normalized words: ${segWords.length}`);

        if (segWords.length === 0) {
            console.log(`[Alignment] Segment ${i + 1} has no words. Duration: 0s`);
            result.push(0);
            continue;
        }

        let sIndex = 0;
        let currentTIndex = tIndex;

        // Two-pointer approach with lookahead for fuzzy matching
        while (sIndex < segWords.length && currentTIndex < tWords.length) {
            const sWord = segWords[sIndex];
            const tWord = tWords[currentTIndex].clean;

            if (sWord === tWord) {
                console.log(`[Alignment] Matched: "${sWord}"`);
                sIndex++;
                currentTIndex++;
            } else {
                let found = false;
                // Lookahead in transcription (e.g. TTS expanded "100" to "one hundred")
                for (let lookahead = 1; lookahead <= 5; lookahead++) {
                    if (currentTIndex + lookahead < tWords.length && tWords[currentTIndex + lookahead].clean === sWord) {
                        console.log(`[Alignment] Lookahead matched transcription word "${sWord}" at offset +${lookahead}`);
                        currentTIndex += lookahead; // Advance to the match
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Lookahead in segment (e.g. TTS skipped a word)
                    for (let lookahead = 1; lookahead <= 5; lookahead++) {
                        if (sIndex + lookahead < segWords.length && segWords[sIndex + lookahead] === tWord) {
                            console.log(`[Alignment] Lookahead matched segment word "${tWord}" at offset +${lookahead}`);
                            sIndex += lookahead; // Advance to the match
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    // Force advance both if completely lost
                    console.log(`[Alignment] Mismatch at sWord="${sWord}", tWord="${tWord}". Forcing advance.`);
                    sIndex++;
                    currentTIndex++;
                }
            }
        }

        // The end of this segment is the word we just passed
        let endWordIndex = currentTIndex > tIndex ? currentTIndex - 1 : currentTIndex;
        endWordIndex = Math.min(endWordIndex, tWords.length - 1);
        
        let endTimeMs = tWords[endWordIndex].end;
        
        // If this is the last segment, ensure it captures the very end of the audio
        if (i === segments.length - 1) {
            endTimeMs = totalAudioDuration * 1000;
            console.log(`[Alignment] Final segment. Forcing end time to total audio duration: ${endTimeMs}ms`);
        }

        const durationSec = (endTimeMs - lastEndTimeMs) / 1000;
        console.log(`[Alignment] Segment ${i + 1} mapped to transcription words [${tIndex} ... ${endWordIndex}]. Duration: ${durationSec}s`);
        
        result.push(Math.max(0, durationSec)); // Ensure no negative durations
        
        lastEndTimeMs = endTimeMs;
        tIndex = currentTIndex;
    }

    console.log(`[Alignment] Final Segment Durations: ${JSON.stringify(result)}`);
    return result;
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

async function processAnimationsBackground(projectId, segments, aspectRatio, costPerVideo, userId) {
    let failedCount = 0;
    
    for (let i = 0; i < segments.length; i += 2) {
        const batch = segments.slice(i, i + 2);
        console.log(`[ContentServer] Processing video batch ${Math.floor(i / 2) + 1} for project ${projectId}`);
        
        await Promise.all(batch.map(async (seg) => {
            try {
                // Generate video via Gemini
                const videoBuffer = await generateGeminiVideo(seg.image_url, seg.animation_prompt || '', aspectRatio || "16:9");

                // Upload to R2
                const key = `content/videos/${seg.id}_${uuidv4()}.mp4`;
                await s3.send(new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key,
                    Body: Buffer.from(videoBuffer),
                    ContentType: 'video/mp4'
                }));
                const videoUrl = `${R2_PUBLIC_URL}/${key}`;

                // Delete old image
                const oldKey = getKeyFromUrl(seg.image_url);
                if (oldKey) {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: R2_BUCKET,
                        Key: oldKey
                    })).catch(err => console.error("Failed to delete old image during video generation", err));
                }

                // Update row
                await supabase.from('content_segments')
                    .update({ image_url: videoUrl })
                    .eq('id', seg.id);
            } catch (e) {
                console.error(`[ContentServer] Video gen failed for segment ${seg.id}`, e);
                failedCount++;
            }
        }));

        // Delay 2-3s between batches if there are more
        if (i + 2 < segments.length) {
            const delay = Math.floor(Math.random() * 1000) + 2000; // 2000-3000ms
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // Refund for failed videos
    if (failedCount > 0) {
        const totalRefund = failedCount * costPerVideo;
        console.log(`[ContentServer] Partial failure in video generation (${failedCount} failed). Refunding ${totalRefund}`);
        await refundUser(userId, totalRefund, `Refund: Failed Batch Video Generation (${failedCount} videos)`);
    }

    // Update project status to ready
    await supabase.from('content_projects').update({ render_status: 'ready' }).eq('id', projectId);
}

async function processAssetsBackground(projectId, segments, voiceId, userId) {
    console.log(`[ContentServer] Starting background asset generation for project ${projectId}`);
    let workDir = null;
    let chargedAmount = 0;
    try {
        // Fetch Project Data (to get subtitles config, narration style, etc)
        const { data: project } = await supabase.from('content_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error("Project not found");

        // 1. Generate Full Audio
        const fullScript = segments.map(s => s.narration).join(" ");
        const finalVoice = voiceId || project.voice_id;
        const stylePrompt = project.narration_style || "Read aloud in a lively, confident, and magnetic tone";
        
        const audioBuffer = await generateFullVoiceover(fullScript, finalVoice, stylePrompt);
        
        workDir = path.join(TEMP_DIR, `assets_${uuidv4()}`);
        if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

        const rawAudioPath = path.join(workDir, 'raw_audio.pcm');
        fs.writeFileSync(rawAudioPath, audioBuffer);
        
        const audioFilename = `audio_${uuidv4()}.wav`;
        const audioPath = path.join(workDir, audioFilename);
        
        const { execSync } = await import('child_process');
        try {
            execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${audioPath}"`, { stdio: 'ignore' });
        } catch (e) {
            console.error("FFmpeg PCM Conversion Failed:", e);
            throw new Error("Failed to convert TTS audio");
        }

        // 2. Calculate Duration & Charge
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
        const totalDuration = parseFloat(out.toString());
        
        const audioCost = totalDuration * COST_AUDIO_PER_SECOND;
        const subtitleCost = project.subtitles ? totalDuration * COST_SUBTITLE_PER_SECOND : 0;
        const totalCharge = Math.round((audioCost + subtitleCost) * 100) / 100;

        chargedAmount = totalCharge;
        await chargeUser(userId, totalCharge, `Asset Gen (Audio+Subs) ${totalDuration.toFixed(1)}s`);

        // 3. Upload Audio
        const audioKey = `content/${projectId}/${audioFilename}`;
        const audioBufferFile = fs.readFileSync(audioPath);
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: audioKey,
            Body: audioBufferFile,
            ContentType: 'audio/wav'
        }));
        const audioUrl = `${R2_PUBLIC_URL}/${audioKey}`;

        // 4. Generate/Save Transcription
        let transcription = null;
        if (project.subtitles) {
            console.log(`[ContentServer] Transcribing audio for project ${projectId}...`);
            const transcript = await client.transcripts.transcribe({
                audio: audioPath,
                speech_models: ["universal-3-pro", "universal-2"],
                language_detection: true,
            });

            if (transcript.status === 'error') {
                throw new Error(`Transcription failed: ${transcript.error}`);
            }
            transcription = transcript;
            // Clean transcription: remove specific punctuations
            if (transcription.words) {
                transcription.words.forEach(w => {
                    if (w.text) w.text = w.text.replace(/— |;|:|(?<!\d)[.,]|[.,](?!\d)/g, '');
                });
            }
        }

        // 5. Calculate Segment Durations
        let segmentDurations;
        try {
            segmentDurations = alignSegmentsWithTranscription(segments, transcription, totalDuration);
            if (!segmentDurations) {
                throw new Error("Transcription alignment failed or no transcription available");
            }
        } catch (e) {
            console.warn("[ContentServer] Transcription alignment failed, falling back to heuristic", e);
            segmentDurations = calculateAudioLineDurations(segments, totalDuration);
        }

        // 6. Update Project
        await supabase.from('content_projects').update({
            voice_file_path: audioUrl,
            transcription: transcription, // Store transcription JSON
            segment_durations: segmentDurations,
            render_status: 'ready' // Assets ready
        }).eq('id', projectId);

        // 7. Discard old audio if it exists to prevent storage bloat and caching issues
        if (project.voice_file_path) {
            const oldKey = getKeyFromUrl(project.voice_file_path);
            if (oldKey) {
                console.log(`[ContentServer] Deleting old audio: ${oldKey}`);
                await s3.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: oldKey
                })).catch(err => console.error("[ContentServer] Failed to delete old audio", err));
            }
        }

        console.log(`[ContentServer] Background asset generation complete for project ${projectId}`);
        
        return { audioUrl, transcription, segmentDurations };

    } catch (e) {
        console.error(`[ContentServer] Asset generation failed for project ${projectId}`, e);
        // Set render_status to failed so frontend can notify
        await supabase.from('content_projects').update({ render_status: 'failed' }).eq('id', projectId);
        
        // Refund if charged
        if (chargedAmount > 0) {
            await refundUser(userId, chargedAmount, `Refund: Failed Asset Gen (${projectId})`);
        }

        // Isolation: failure here doesn't affect images
        throw e;
    } finally {
        if (workDir && fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    }
}

async function processImagesBackground(projectId, segments, aspectRatio, costPerImage, userId) {
    console.log(`[ContentServer] Starting background image generation for project ${projectId}`);
    
    let failedCount = 0;
    const queue = [...segments];

    // Worker function to process segments from the queue
    const runWorker = async () => {
        while (queue.length > 0) {
            const seg = queue.shift();
            if (!seg) continue;

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
                failedCount++;
            }
        }
    };

    // Spawn workers up to the concurrency limit
    const workerCount = Math.min(MAX_CONCURRENT_IMAGES, segments.length);
    const workers = Array(workerCount).fill(null).map(() => runWorker());

    // Wait for all workers to finish the queue
    await Promise.all(workers);
    
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
        const { prompt, aspectRatio, style, effect, userId, narrationStyle, subtitles, voiceId } = req.body;
        console.log(`[ContentServer] Received generate request: "${prompt.substring(0, 30)}..." with subtitles ${subtitles}`);
        
        // 0. Pre-check Balance
        const userCredits = await getCredits(userId);
        const requiredMinBalance = COST_IMAGE_ULTRA;
        if (userCredits < requiredMinBalance) {
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        // 1. Create Project
        const { data: project, error } = await supabase.from('content_projects').insert({
            user_id: userId,
            title: prompt.substring(0, 50),
            aspect_ratio: aspectRatio,
            image_style: style,
            effect: effect || 'chaos',
            narration_style: narrationStyle, // Save style to DB
            subtitles: subtitles || 'none', // Save subtitles to DB
            voice_id: voiceId || 'Charon', // Save voice to DB
            status: 'draft'
        }).select().single();
        
        if (error) throw error;
        console.log(`[ContentServer] Project created: ${project.id}`);

        // 2. Generate Text Segments
        console.log(`[ContentServer] Generating text segments...`);
        const { segments: segmentsData, usageMetadata } = await generateStorySegments(prompt, aspectRatio, style);
        console.log(`[ContentServer] Text segments generated: ${segmentsData.length}`);

        // 3. Determine Cost & Charge
        const outputTokens = usageMetadata?.candidatesTokenCount || 0;
        const inputTokens = usageMetadata?.promptTokenCount || 0;
        
        const outputAnalysisCost = (outputTokens / 1000) * COST_PER_THOUSAND_TOKENS;
        const inputAnalysisCost = (inputTokens / 1000) * COST_PER_THOUSAND_INPUT_TOKENS;
        let analysisCost = outputAnalysisCost + inputAnalysisCost;

        let isCapped = false;
        if (analysisCost > MAX_ANALYSIS_COST) {
            analysisCost = MAX_ANALYSIS_COST;
            isCapped = true;
        }

        const costPerImage = COST_IMAGE_ULTRA;
        const totalCost = (segmentsData.length * costPerImage) + analysisCost;

        console.log(`[Billing] Analysis Tokens - Input: ${inputTokens}, Output: ${outputTokens}`);
        console.log(`[Billing] Calculated Analysis Cost: ${analysisCost.toFixed(4)} credits (Capped: ${isCapped})`);
        console.log(`[Billing] Total Potential Cost: ${totalCost.toFixed(2)} credits`);

        // Check balance again before charging
        const currentBalance = await getCredits(userId);
        
        let finalSegmentsData = segmentsData;
        let maxImages = segmentsData.length;
        let creditsLow = false;

        if (currentBalance < totalCost) {
            creditsLow = true;
            const availableForImages = currentBalance - analysisCost;
            maxImages = Math.floor(Math.max(0, availableForImages) / costPerImage);
            
            finalSegmentsData = segmentsData.slice(0, maxImages);
        }

        const finalTotalCost = (finalSegmentsData.length * costPerImage) + analysisCost;
        console.log(`[Billing] Final Total Charged: ${finalTotalCost.toFixed(2)} credits (Images: ${finalSegmentsData.length}, Analysis: ${analysisCost.toFixed(2)})`);

        await chargeUser(userId, finalTotalCost, `Image Gen Batch - ${finalSegmentsData.length} images + AI Analysis`);

        // 4. Save Text Segments to DB (Image NULL)
        // We save ALL segments to avoid waste, even if we don't generate images for all
        const segmentsToInsert = segmentsData.map((s, idx) => ({
            project_id: project.id,
            narration: s.narration,
            image_prompt: s.image_prompt,
            animation_prompt: s.animation_prompt,
            image_url: null, // Placeholder, images come later
            order_index: idx
        }));

        const { data: insertedSegments, error: segError } = await supabase
            .from('content_segments')
            .insert(segmentsToInsert)
            .select();

        if (segError) throw segError;
        console.log(`[ContentServer] Segments saved to DB. Triggering background tasks.`);

        // 5. Set status to generating
        await supabase.from('content_projects').update({ 
            status: 'generating',
            render_status: 'generating'
        }).eq('id', project.id);

        // 6. Trigger Background Image Gen (Pass cost for refunds)
        // Only process the segments we actually charged for
        const segmentsToProcess = insertedSegments.slice(0, maxImages);
        processImagesBackground(project.id, segmentsToProcess, aspectRatio, costPerImage, userId);

        // 7. Trigger Background Asset Gen (Audio/Subtitles) - ONLY if NOT creditsLow
        if (!creditsLow) {
            processAssetsBackground(project.id, insertedSegments, voiceId, userId).catch(e => {
                console.error(`[ContentServer] Parallel Asset Gen failed for project ${project.id}`, e);
            });
        }

        // 8. Return Response
        if (creditsLow) {
            return res.status(402).json({ 
                error: "Credits low, top up to continue.",
                projectId: project.id, 
                segments: insertedSegments 
            });
        }

        res.json({ projectId: project.id, segments: insertedSegments });

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

    try {
        console.log(`[ContentServer] Regenerating image for segment ${segmentId}`);

        // 0. Fetch Project
        const { data: project, error: projError } = await supabase
            .from('content_projects')
            .select('user_id')
            .eq('id', projectId)
            .single();
        
        if (projError || !project) throw new Error("Project not found");
        userId = project.user_id;

        // 1. Calculate Cost & Charge
        const cost = COST_IMAGE_ULTRA;
        const balance = await getCredits(userId);
        
        if (balance < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }
        
        if (balance < cost) {
            return res.status(402).json({ error: `Insufficient credits for this request. Need ${cost} credits.` });
        }

        await chargeUser(userId, cost, `Image Regeneration`);

        // 2. Generate new image
        const base64Img = await generateImage(imagePrompt, aspectRatio);
        const buffer = Buffer.from(base64Img, 'base64');

        // 3. Determine New Key & Delete Old
        const newKey = `content/${projectId}/${segmentId}_${uuidv4()}.png`;
        const existingKey = getKeyFromUrl(currentImageUrl);
        
        if (existingKey) {
            await s3.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: existingKey
            })).catch(err => console.error("Failed to delete old image during regeneration", err));
        }

        // 4. Upload
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: newKey,
            Body: buffer,
            ContentType: 'image/png'
        }));

        const newImageUrl = `${R2_PUBLIC_URL}/${newKey}`;

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
            const cost = COST_IMAGE_ULTRA;
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
        
        if (balance < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        if (balance < cost) {
            return res.status(402).json({ error: `Insufficient credits for this request. Need ${cost} credits.` });
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

// Generate Upload URL
app.post('/generate-upload-url', async (req, res) => {
    try {
        const { projectId, segmentId, filename, contentType } = req.body;
        const ext = filename.split('.').pop();
        const key = `content/uploads/${projectId}/${segmentId}_${Date.now()}.${ext}`;
        
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            ContentType: contentType
        });
        
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        res.json({ signedUrl, key, publicUrl: `${R2_PUBLIC_URL}/${key}` });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update Segment Image
app.post('/update-segment-image', async (req, res) => {
    try {
        const { segmentId, newImageUrl, oldImageUrl } = req.body;
        
        // Delete old image if it exists and is from our R2 bucket
        if (oldImageUrl && oldImageUrl.includes(R2_PUBLIC_URL)) {
            const oldKey = oldImageUrl.replace(`${R2_PUBLIC_URL}/`, '');
            try {
                await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
                console.log(`[ContentServer] Deleted old image: ${oldKey}`);
            } catch (err) {
                console.error(`[ContentServer] Failed to delete old image ${oldKey}:`, err);
            }
        }
        
        // Update DB
        await supabase.from('content_segments').update({ image_url: newImageUrl }).eq('id', segmentId);
        
        res.json({ success: true, imageUrl: newImageUrl });
    } catch (error) {
        console.error("Error updating segment image:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Delete Project
app.delete('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        console.log(`[ContentServer] Deleting project ${id} for user ${userId}`);

        // Verify ownership and get file paths
        const { data: project } = await supabase.from('content_projects').select('user_id, voice_file_path').eq('id', id).single();
        if (!project || project.user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        // Get segments to find images to delete
        const { data: segments } = await supabase.from('content_segments').select('image_url').eq('project_id', id);
        
        // Collect all storage keys to delete
        const keysToDelete = [];

        // Add image keys
        if (segments && segments.length > 0) {
            segments.forEach(s => {
                const key = getKeyFromUrl(s.image_url);
                if (key) keysToDelete.push(key);
            });
        }

        // Add audio key
        if (project.voice_file_path) {
            const audioKey = getKeyFromUrl(project.voice_file_path);
            if (audioKey) keysToDelete.push(audioKey);
        }
        
        // Delete all files from S3
        if (keysToDelete.length > 0) {
            await Promise.allSettled(keysToDelete.map(key => 
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

// 5. Generate Assets (Audio, Subtitles, Metadata) - No Video Assembly
app.post('/video-generation', async (req, res) => {
    const { segmentId, imageUrl, animationPrompt } = req.body;
    let userId = null;
    let charged = false;
    
    try {
        // Fetch segment to get project -> userId
        const { data: segment } = await supabase.from('content_segments').select('project_id').eq('id', segmentId).single();
        if (!segment) throw new Error("Segment not found");
        
        const { data: project } = await supabase.from('content_projects').select('user_id, aspect_ratio').eq('id', segment.project_id).single();
        if (!project) throw new Error("Project not found");
        userId = project.user_id;

        // 1. Check balance
        const balance = await getCredits(userId);
        if (balance < COST_VIDEO_GEMINI) {
            return res.status(402).json({ error: `Insufficient credits. Need ${COST_VIDEO_GEMINI} credits for video generation.` });
        }

        // 2. Charge credits
        await chargeUser(userId, COST_VIDEO_GEMINI, "Gemini Video Generation");
        charged = true;

        // 3. Generate video using Gemini
        const videoBuffer = await generateGeminiVideo(imageUrl, animationPrompt, project.aspect_ratio || "16:9");

        // After the video is generated:
        // 1. Upload the generated video to the R2 bucket
        const key = `content/videos/${segmentId}_${uuidv4()}.mp4`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: Buffer.from(videoBuffer),
            ContentType: 'video/mp4'
        }));
        const videoUrl = `${R2_PUBLIC_URL}/${key}`;

        // 2. Delete the segment's previous image from the R2 bucket
        const oldKey = getKeyFromUrl(imageUrl);
        if (oldKey) {
            await s3.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: oldKey
            })).catch(err => console.error("Failed to delete old image during video generation", err));
        }

        // 3. Upsert the image_url column in content_segments with the new video URL
        const { error } = await supabase.from('content_segments')
            .update({ image_url: videoUrl })
            .eq('id', segmentId);

        if (error) throw error;

        res.json({ success: true, videoUrl });
    } catch (e) {
        console.error("Video Generation Route Error", e);
        // 4. Refund if charged
        if (charged && userId) {
            await refundUser(userId, COST_VIDEO_GEMINI, "Refund: Failed Video Generation");
        }
        res.status(500).json({ error: e.message });
    }
});

app.post('/generate-assets', async (req, res) => {
    const { projectId, voiceId, userId } = req.body;
    console.log(`[ContentServer] Manual asset generation request for project ${projectId}`);

    try {
        // 0. Pre-check Balance for regeneration
        const userCredits = await getCredits(userId);
        if (userCredits < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');
        if (!segments || segments.length === 0) throw new Error("No segments found for project");

        const result = await processAssetsBackground(projectId, segments, voiceId, userId);
        res.json({ 
            success: true, 
            ...result
        });

    } catch (e) {
        console.error("Manual Generate Assets Failed", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/animate-all', async (req, res) => {
    const { projectId, userId } = req.body;
    
    try {
        // 1. Fetch Project and Segments
        const { data: project } = await supabase.from('content_projects').select('user_id, aspect_ratio').eq('id', projectId).single();
        if (!project) throw new Error("Project not found");
        
        const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');
        if (!segments || segments.length === 0) throw new Error("No segments found for project");

        // 2. Identify qualifying segments (not ending in .mp4)
        const qualifyingSegments = segments.filter(seg => seg.image_url && !seg.image_url.toLowerCase().endsWith('.mp4'));
        if (qualifyingSegments.length === 0) {
            return res.status(400).json({ error: "No image segments left to animate." });
        }

        // 3. Calculate Cost & Check Credits
        const totalCost = qualifyingSegments.length * COST_VIDEO_GEMINI;
        const balance = await getCredits(userId);
        if (balance < totalCost) {
            return res.status(402).json({ error: `Insufficient credits. Need ${totalCost} credits to animate ${qualifyingSegments.length} segments.` });
        }

        // 4. Charge user
        await chargeUser(userId, totalCost, `Batch Video Generation (${qualifyingSegments.length} segments)`);

        // 5. Set render_status to 'Animating'
        await supabase.from('content_projects').update({ render_status: 'Animating' }).eq('id', projectId);

        // 6. Start processing in background
        processAnimationsBackground(projectId, qualifyingSegments, project.aspect_ratio, COST_VIDEO_GEMINI, userId).catch(e => {
            console.error(`[ContentServer] Batch animation failed for project ${projectId}`, e);
        });

        res.json({ success: true, count: qualifyingSegments.length, totalCost });
    } catch (e) {
        console.error("Animate All Route Error", e);
        res.status(500).json({ error: e.message });
    }
});

// 6. Export Video (Stitch Assets)
app.post('/export-video', async (req, res) => {
    const { projectId, userId } = req.body;
    console.log(`[ContentServer] Exporting video for project ${projectId}`);

    try {
        // Fetch Project Data
        const { data: project } = await supabase.from('content_projects').select('*').eq('id', projectId).single();
        const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');

        if (!project.voice_file_path || !project.segment_durations) {
            return res.status(400).json({ error: "Assets not generated. Please generate assets first." });
        }

        // Create Story Entry
        const { data: story } = await supabase.from('content_stories').insert({
            user_id: userId,
            project_id: projectId,
            video_url: '',
            thumbnail_url: segments[0]?.image_url,
            status: 'rendering'
        }).select().single();

        res.status(202).json({ message: "Export started", storyId: story.id });

        // Background Processing
        (async () => {
            const workDir = path.join(TEMP_DIR, `export_${uuidv4()}`);
            if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

            try {
                // Download Assets
                const audioPath = path.join(workDir, 'audio.wav');
                await downloadUrlToFile(project.voice_file_path, audioPath);

                // Download Images
                for (let i = 0; i < segments.length; i++) {
                    if (segments[i].image_url) {
                        await downloadUrlToFile(segments[i].image_url, path.join(workDir, `img_${i}.png`));
                    }
                }

                // Assemble
                const assembledPath = await assembleVideo(segments, audioPath, project.segment_durations, workDir, project.aspect_ratio, project.effect);
                let finalPath = assembledPath;

        // 4. Generate/Burn Subtitles
                if (project.subtitle_state === 'enabled' && project.subtitles && project.subtitles !== 'none' && project.transcription) {
                    // Ensure config is an object (handle potential double-stringification)
                    let subConfig = project.subtitles;
                    if (typeof subConfig === 'string') {
                        try {
                            subConfig = JSON.parse(subConfig);
                        } catch (e) {
                            console.error("[Export] Failed to parse subtitle config string:", e);
                        }
                    }

                    console.log("[Export] Generating subtitles from stored transcription...");
                    const assContent = await generateSubtitles(project.transcription, subConfig, project.aspect_ratio);
                    if (assContent) {
                        const assPath = path.join(workDir, `subtitles_${uuidv4()}.ass`);
                        fs.writeFileSync(assPath, assContent);
                        
                        const burnedPath = path.join(workDir, `burned_${uuidv4()}.mp4`);
                        await burnSubtitles(assembledPath, assPath, burnedPath);
                        finalPath = burnedPath;
                    }
                }

                // Upload
                const finalBuffer = fs.readFileSync(finalPath);
                const finalKey = `content/stories/${uuidv4()}.mp4`;
                await s3.send(new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: finalKey,
                    Body: finalBuffer,
                    ContentType: 'video/mp4'
                }));
                const videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;

                // Update Story
                await supabase.from('content_stories').update({
                    video_url: videoUrl,
                    status: 'completed'
                }).eq('id', story.id);

            } catch (e) {
                console.error("Export Failed", e);
                await supabase.from('content_stories').update({ status: 'failed' }).eq('id', story.id);
            } finally {
                fs.rmSync(workDir, { recursive: true, force: true });
            }
        })();

    } catch (e) {
        console.error("Export Request Failed", e);
        res.status(500).json({ error: e.message });
    }
});

// --- Demo Maker Routes ---
app.post('/demo/generate-upload-url', demoGenerateUploadUrl);
app.delete('/demo/videos/:id', demoDeleteVideo);
app.post('/demo/process-video', demoProcessVideo);
app.post('/demo/export', exportDemoVideo);
app.post('/demo/generate-hook-upload-url', generateHookUploadUrl);
app.post('/demo/generate-hook-image', generateHookImage);
app.post('/demo/delete-hook-asset', deleteHookAsset);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));