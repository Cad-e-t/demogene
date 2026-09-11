import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { generateStorySegments, generateCharacterImagesData, generateImage, editImage, generateFullVoiceover, generateGeminiVideo, generateDescription } from './gemini.js';
import { generateVideo } from './replicate.js';
import { assembleVideo } from './video-assembler.js';
import { generateSubtitles, burnSubtitles } from './subtitle-generator.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { AssemblyAI } from 'assemblyai';
import numberToWords from 'number-to-words';

import { generateUploadUrl as demoGenerateUploadUrl, deleteVideo as demoDeleteVideo, processVideo as demoProcessVideo, exportDemoVideo, generateHookUploadUrl, generateHookImage, deleteHookAsset, demoGenerateMotionGraphics, saveHookAsset, getHookAssets, regenerateDemoAudio } from './demo-maker/controllers.js';
import { generateAvatarUploadUrl, saveAvatar, getAvatars, deleteAvatar, generateAvatarImage } from './avatar-controllers.js';


// --- Setup ---
const app = express();
app.use(express.json());
if (process.env.LOCAL === 'true') {
    app.use('/exports', express.static(path.join(process.cwd(), 'exports')));
}

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
const COST_VIDEO_GROK = 20;
const COST_IMAGE_ULTRA = 4; // Credits per image
const COST_IMAGE_EDIT = 4; // Credits per edit
const COST_AUDIO_PER_SECOND = 0.05; // Credits per second (3 credits per minute)
const COST_SUBTITLE_PER_SECOND = 0.017; // Credits per second (1 credit per minute)
const COST_PER_THOUSAND_TOKENS = 0.85;
const COST_PER_THOUSAND_INPUT_TOKENS = 0.2;
const FLASH_COST_THOUSAND_INPUT_TOKENS = 0.2;
const FLASH_COST_THOUSAND_OUTPUT_TOKENS = 0.85;
const MAX_ANALYSIS_COST = 100;
const MIN_BALANCE = 4; // Minimum credits required to start
const MAX_CONCURRENT_IMAGES = 2; // Max parallel image generations to avoid rate limits
const MAX_CONCURRENT_VIDEOS = 3; // Max parallel video generations (batch size)

// --- Helper: Credits ---
async function getCredits(userId) {
    const { data } = await supabase.rpc('get_active_credits', { p_user_id: userId });
    return data || 0;
}

async function chargeUser(userId, amount, description) {
    console.log(`[Billing] Charging user ${userId}: ${amount} credits ("${description}")`);
    const { error } = await supabase.rpc('charge_creator_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });
    if (error) {
        console.error(`[Billing] Credit charge failed for user ${userId} (${amount} credits): ${error.message}`);
        throw new Error(`Credit charge failed: ${error.message}`);
    }
    console.log(`[Billing] Successfully charged user ${userId}: ${amount} credits ("${description}")`);
}

async function refundUser(userId, amount, description) {
    console.log(`[Billing] Refunding user ${userId}: ${amount} credits ("${description}")`);
    const { error } = await supabase.rpc('refund_creator_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });
    if (error) {
        console.error(`[Billing] Refund failed for user ${userId} (${amount} credits):`, error);
    } else {
        console.log(`[Billing] Successfully refunded user ${userId}: ${amount} credits ("${description}")`);
    }
}

// Synchronizes the project status: sets 'completed' if all assets/images are generated, or 'draft' if anything is missing
async function syncProjectStatus(projectId) {
    try {
        const { data: project } = await supabase.from('content_projects').select('*').eq('id', projectId).single();
        if (!project) return;

        const { data: segments } = await supabase.from('content_segments').select('image_url').eq('project_id', projectId);
        const { data: characters } = await supabase.from('content_characters').select('image_url').eq('project_id', projectId);

        const hasMissingSegment = !segments || segments.length === 0 || segments.some(s => !s.image_url);
        const hasMissingCharacter = characters && characters.length > 0 && characters.some(c => !c.image_url);
        const hasAudio = !!project.voice_file_path;
        const isAudioFailed = project.render_status === 'failed';

        if (!hasMissingSegment && !hasMissingCharacter && hasAudio && !isAudioFailed) {
            console.log(`[ContentServer] Project ${projectId} is fully generated. Setting status: 'completed', render_status: 'ready'`);
            await supabase.from('content_projects').update({
                status: 'completed',
                render_status: 'ready'
            }).eq('id', projectId);
        } else if (isAudioFailed || hasMissingSegment || hasMissingCharacter) {
            if (project.status !== 'generating' && project.render_status !== 'generating' && project.status !== 'insufficient') {
                console.log(`[ContentServer] Project ${projectId} has missing elements. Setting status: 'draft', render_status: 'failed'`);
                await supabase.from('content_projects').update({
                    status: 'draft',
                    render_status: 'failed'
                }).eq('id', projectId);
            }
        }
    } catch (err) {
        console.error(`[ContentServer] Error in syncProjectStatus for ${projectId}:`, err);
    }
}

async function processCharacters(projectId, userId, rawVisualData, style, avatarUrl) {
    console.log(`[ContentServer] Checking / processing character images for project ${projectId}...`);

    // Check if characters already exist in DB for this project (e.g. Retry or resumed generation)
    const { data: existingChars } = await supabase
        .from('content_characters')
        .select('*')
        .eq('project_id', projectId);

    let charsToGenerate = [];

    if (existingChars && existingChars.length > 0) {
        const missing = existingChars.filter(c => !c.image_url);
        if (missing.length === 0) {
            console.log(`[ContentServer] All ${existingChars.length} existing characters already have images.`);
            return;
        }

        let avatarImageBase64 = null;
        if (avatarUrl && missing.some(c => c.character_id === 'AVATAR')) {
            try {
                const cleanAvatarUrl = avatarUrl.trim().replace(/\s+/g, '%20');
                const resp = await fetch(cleanAvatarUrl);
                const arrayBuf = await resp.arrayBuffer();
                avatarImageBase64 = Buffer.from(arrayBuf).toString('base64');
            } catch (e) {
                console.error("Failed to fetch avatar image for character retry:", e);
            }
        }

        charsToGenerate = missing.map(c => ({
            db_id: c.id,
            character_id: c.character_id,
            outfit_id: c.outfit_id,
            full_desc: c.full_desc,
            promptSkeleton: `Full body shot, pure white background, neutral expression. ${c.full_desc}, ${style || 'cinematic'}.`,
            referenceImageBase64: c.character_id === 'AVATAR' ? avatarImageBase64 : null,
            isGenerated: true
        }));
    } else if (rawVisualData && (rawVisualData.recurring_subjects || rawVisualData.avatar)) {
        const characters = await generateCharacterImagesData(rawVisualData, style, avatarUrl);
        if (!characters || characters.length === 0) return;

        // Insert character rows into DB
        const charsToInsert = characters.map(char => ({
            project_id: projectId,
            character_id: char.character_id,
            outfit_id: char.outfit_id,
            full_desc: char.full_desc,
            image_url: char.image_url || null
        }));

        const { data: insertedChars, error: insertErr } = await supabase
            .from('content_characters')
            .insert(charsToInsert)
            .select();

        if (insertErr) {
            console.error("[ContentServer] Error inserting characters to DB:", insertErr);
            throw new Error(`Error inserting characters to DB: ${insertErr.message}`);
        }

        charsToGenerate = characters.filter(c => c.isGenerated && !c.image_url).map(c => {
            const matched = insertedChars?.find(ic => ic.character_id === c.character_id && ic.outfit_id === c.outfit_id);
            return {
                ...c,
                db_id: matched?.id
            };
        });
    } else {
        return;
    }

    if (charsToGenerate.length === 0) return;

    const totalCost = charsToGenerate.length * COST_IMAGE_ULTRA; // 4 credits per char
    if (totalCost > 0 && userId) {
        const currentBalance = await getCredits(userId);
        if (currentBalance < totalCost) {
            throw new Error(`Insufficient credits for character generation. Needed: ${totalCost}, Have: ${currentBalance}`);
        }
        await chargeUser(userId, totalCost, `Character gen upfront (${charsToGenerate.length} images @ ${COST_IMAGE_ULTRA} cr)`);
    }

    let failedCount = 0;
    const queue = [...charsToGenerate];

    const runWorker = async () => {
        while (queue.length > 0) {
            const char = queue.shift();
            if (!char) continue;

            try {
                const base64Img = await generateImage(char.promptSkeleton, '9:16', char.referenceImageBase64 || null);
                const buffer = Buffer.from(base64Img, 'base64');
                const key = `characters/${projectId}/${char.character_id}_${char.outfit_id}_${uuidv4()}.png`;
                await s3.send(new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key,
                    Body: buffer,
                    ContentType: 'image/png'
                }));
                const imageUrl = `${R2_PUBLIC_URL}/${key}`;

                if (char.db_id) {
                    await supabase.from('content_characters')
                        .update({ image_url: imageUrl })
                        .eq('id', char.db_id);
                } else {
                    await supabase.from('content_characters')
                        .update({ image_url: imageUrl })
                        .eq('project_id', projectId)
                        .eq('character_id', char.character_id)
                        .eq('outfit_id', char.outfit_id);
                }

                char.image_url = imageUrl;
            } catch (e) {
                console.error(`[ContentServer] Failed to generate character image for ${char.character_id}:`, e);
                failedCount++;
                char.image_url = null;
            }
        }
    };

    const workerCount = Math.min(MAX_CONCURRENT_IMAGES, charsToGenerate.length);
    if (workerCount > 0) {
        const workers = Array(workerCount).fill(null).map(() => runWorker());
        await Promise.all(workers);
    }

    if (failedCount > 0 && userId) {
        const refundAmount = failedCount * COST_IMAGE_ULTRA;
        console.log(`[ContentServer] Refunding ${failedCount} failed character images (${refundAmount} credits) for user ${userId}`);
        await refundUser(userId, refundAmount, `Refund: Failed Character Images (${failedCount} @ ${COST_IMAGE_ULTRA} cr)`);
    }

    if (failedCount > 0) {
        throw new Error(`Failed to generate ${failedCount} character images`);
    }
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
        let cleanText = w.text.toLowerCase().replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
        if (/^\d+$/.test(cleanText)) {
            try {
                cleanText = numberToWords.toWords(parseInt(cleanText, 10)).replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
            } catch (e) {}
        }
        const splitWords = cleanText.split(/\s+/).filter(x => x.length > 0);
        splitWords.forEach(sw => {
            tWords.push({
                ...w,
                clean: sw,
                segmentIndex: -1
            });
        });
    });

    console.log(`[Alignment] Normalized ${tWords.length} transcription words.`);
    if (tWords.length === 0) return null;

    // 2. Build global script words array
    const scriptWords = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segWordsRaw = seg.narration.toLowerCase().replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        
        segWordsRaw.forEach(w => {
            if (/^\d+$/.test(w)) {
                try {
                    const converted = numberToWords.toWords(parseInt(w, 10)).replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
                    converted.split(/\s+/).filter(x => x.length > 0).forEach(sw => {
                        scriptWords.push({ clean: sw, segmentIndex: i });
                    });
                } catch (e) {
                    scriptWords.push({ clean: w, segmentIndex: i });
                }
            } else {
                scriptWords.push({ clean: w, segmentIndex: i });
            }
        });
    }

    console.log(`[Alignment] Global normalized script words: ${scriptWords.length}`);

    // 3. Global alignment with lookahead window
    let sIndex = 0;
    let tIndex = 0;

    while (sIndex < scriptWords.length && tIndex < tWords.length) {
        const sWord = scriptWords[sIndex].clean;
        const tWord = tWords[tIndex].clean;

        if (sWord === tWord) {
            tWords[tIndex].segmentIndex = scriptWords[sIndex].segmentIndex;
            sIndex++;
            tIndex++;
        } else {
            let bestMatch = null;
            let minDistance = 999;
            const WINDOW = 15;

            for (let i = 1; i <= WINDOW; i++) {
                // look ahead in tWords
                if (tIndex + i < tWords.length && tWords[tIndex + i].clean === sWord) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: 0, tStep: i }; }
                }
                // look ahead in scriptWords
                if (sIndex + i < scriptWords.length && scriptWords[sIndex + i].clean === tWord) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: i, tStep: 0 }; }
                }
                // look ahead in both
                if (sIndex + i < scriptWords.length && tIndex + i < tWords.length && scriptWords[sIndex + i].clean === tWords[tIndex + i].clean) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: i, tStep: i }; }
                }
            }

            if (bestMatch) {
                if (bestMatch.tStep > 0) {
                   for (let j = 0; j < bestMatch.tStep; j++) {
                       tWords[tIndex + j].segmentIndex = scriptWords[sIndex].segmentIndex;
                   }
                }
                sIndex += bestMatch.sStep;
                tIndex += bestMatch.tStep;
            } else {
                // Force advance both
                tWords[tIndex].segmentIndex = scriptWords[sIndex].segmentIndex;
                sIndex++;
                tIndex++;
            }
        }
    }

    // 4. Calculate durations
    const result = new Array(segments.length).fill(0);
    let lastValidSegmentIndex = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
        if (tWords.some(tw => tw.segmentIndex === i)) {
            lastValidSegmentIndex = i;
            break;
        }
    }

    let lastEndTimeMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const mappedTWords = tWords.filter(tw => tw.segmentIndex === i);
        
        if (mappedTWords.length > 0) {
            let endTimeMs = mappedTWords[mappedTWords.length - 1].end;
            
            if (i === lastValidSegmentIndex) {
                endTimeMs = totalAudioDuration * 1000;
            }
            
            if (endTimeMs < lastEndTimeMs) {
                endTimeMs = lastEndTimeMs;
            }
            
            const durationSec = (endTimeMs - lastEndTimeMs) / 1000;
            result[i] = durationSec;
            lastEndTimeMs = endTimeMs;
            console.log(`[Alignment] Segment ${i + 1} duration: ${durationSec}s`);
        } else {
            console.log(`[Alignment] Segment ${i + 1} completely skipped by TTS. Duration: 0s`);
            result[i] = 0;
        }
    }

    console.log(`[Alignment] Final Segment Durations: ${JSON.stringify(result)}`);
    return result;
}

// --- Helper: Download URL to File ---
async function downloadUrlToFile(url, dest) {
    const cleanUrl = url ? url.trim() : url;
    await withRetry(async () => {
        const response = await fetch(cleanUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buffer));
    });
}

// --- Helper: Retry Wrap ---
async function withRetry(operation, maxAttempts = 3, initialDelay = 1500) {
    let attempt = 1;
    let delay = initialDelay;
    
    while (attempt <= maxAttempts) {
        try {
            return await operation();
        } catch (error) {
            console.error(`[Retry] Attempt ${attempt} failed:`, error.message || error);
            if (attempt === maxAttempts) throw error;
            console.log(`[Retry] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            delay *= 2;
        }
    }
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

async function processAnimationsBackground(projectId, segments, aspectRatio, userId, modelType = 'fast') {
    let failedCost = 0;
    
    for (let i = 0; i < segments.length; i += MAX_CONCURRENT_VIDEOS) {
        const batch = segments.slice(i, i + MAX_CONCURRENT_VIDEOS);
        console.log(`[ContentServer] Processing video batch ${Math.floor(i / MAX_CONCURRENT_VIDEOS) + 1} for project ${projectId} (Model: ${modelType})`);
        
        await Promise.all(batch.map(async (seg) => {
            const finalDur = seg._duration || 4;
            const cost = seg._cost || (finalDur * (modelType === 'ultra' ? 5 : 2));
            try {
                // Generate video via Replicate
                const videoBuffer = await generateVideo(seg.image_url, seg.animation_prompt, modelType, aspectRatio, finalDur);

                // Upload to R2
                const key = `content/videos/${seg.id}_${uuidv4()}.mp4`;
                await withRetry(async () => {
                    await s3.send(new PutObjectCommand({
                        Bucket: R2_BUCKET,
                        Key: key,
                        Body: Buffer.from(videoBuffer),
                        ContentType: 'video/mp4'
                    }));
                });
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
                failedCost += cost;
            }
        }));

        // Delay 2-3s between batches if there are more
        if (i + MAX_CONCURRENT_VIDEOS < segments.length) {
            const delay = Math.floor(Math.random() * 1000) + 2000; // 2000-3000ms
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // Refund for failed videos
    if (failedCost > 0) {
        console.log(`[ContentServer] Partial failure in video generation. Refunding ${failedCost}`);
        await refundUser(userId, failedCost, `Refund: Failed Batch Video Generation`);
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

        // 1. Generate Full Audio in Chunks
        const finalVoice = voiceId || project.voice_id;
        const stylePrompt = project.narration_style || "Read aloud in a lively, confident, and magnetic tone";
        
        workDir = path.join(TEMP_DIR, `assets_${uuidv4()}`);
        if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

        const { execSync } = await import('child_process');

        // GREEDY BUCKET CHUNKING logic
        const batches = [];
        let currentBatch = [];
        let currentChars = 0;
        for (const seg of segments) {
            const segLen = seg.narration.length;
            const addedLen = currentChars === 0 ? segLen : segLen + 1; // +1 for space between sentences
            if (currentChars + addedLen > 1500) {
                if (currentBatch.length > 0) batches.push(currentBatch.join(" "));
                currentBatch = [seg.narration];
                currentChars = segLen;
            } else {
                currentBatch.push(seg.narration);
                currentChars += addedLen;
            }
        }
        if (currentBatch.length > 0) batches.push(currentBatch.join(" "));

        const chunkAudioPaths = [];
        const pMap = async (array, asyncFn, concurrency) => {
            const results = new Array(array.length);
            const queue = [...array.map((item, index) => ({ item, index }))];
            const workers = new Array(concurrency).fill(null).map(async () => {
                while (queue.length > 0) {
                    const { item, index } = queue.shift();
                    results[index] = await asyncFn(item, index);
                }
            });
            await Promise.all(workers);
            return results;
        };

        console.log(`[ContentServer] Processing audio in ${batches.length} chunks...`);

        await pMap(batches, async (batchText, index) => {
            let chunkBuffer;
            try {
                chunkBuffer = await withRetry(async () => generateFullVoiceover(batchText, finalVoice, stylePrompt), 3, 2000);
            } catch (err) {
                console.error(`[ContentServer] Chunk ${index} generation failed.`, err);
                throw new Error("Failed to generate TTS audio chunk");
            }
            const pcmPath = path.join(workDir, `chunk_${index}.pcm`);
            const mp3Path = path.join(workDir, `chunk_${index}.mp3`);
            fs.writeFileSync(pcmPath, chunkBuffer);
            execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${pcmPath}" -y "${mp3Path}"`, { stdio: 'ignore' });
            
            chunkAudioPaths[index] = mp3Path;
        }, 2); // 2 parallel requests

        const concatListPath = path.join(workDir, 'concat.txt');
        const concatListContent = chunkAudioPaths.map(p => `file '${p}'`).join('\n');
        fs.writeFileSync(concatListPath, concatListContent);

        const audioFilename = `voiceover_${uuidv4()}.mp3`;
        const audioPath = path.join(workDir, audioFilename);
        
        try {
            execSync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${audioPath}"`, { stdio: 'ignore' });
        } catch (e) {
            console.error("FFmpeg Concat Failed:", e);
            throw new Error("Failed to concat TTS audio chunks");
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
        await withRetry(async () => {
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: audioKey,
                Body: audioBufferFile,
                ContentType: 'audio/mpeg'
            }));
        });
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
            
            // Extract only the needed fields to save database space
            let filteredWords = [];
            if (transcript.words) {
                filteredWords = transcript.words.map(w => ({
                    text: w.text ? w.text.replace(/[-\u2013\u2014]/g, ' ').replace(/;|:|(?<!\d)[.,]|[.,](?!\d)/g, '') : '',
                    start: w.start,
                    end: w.end
                }));
            }
            transcription = { 
                text: transcript.text || '',
                words: filteredWords 
            };
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

        await syncProjectStatus(projectId);

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
        // Set render_status to failed and status to draft so frontend can notify and allow retry
        await supabase.from('content_projects').update({ status: 'draft', render_status: 'failed' }).eq('id', projectId);
        
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
    
    // Fetch all characters for this project
    const { data: projectCharacters } = await supabase
        .from('content_characters')
        .select('*')
        .eq('project_id', projectId);
    
    const charactersMap = {};
    if (projectCharacters) {
        projectCharacters.forEach(c => {
            charactersMap[`${c.character_id}_${c.outfit_id}`] = c.image_url;
        });
    }

    let failedCount = 0;
    const queue = [...segments];

    // Worker function to process segments from the queue
    const runWorker = async () => {
        while (queue.length > 0) {
            const seg = queue.shift();
            if (!seg) continue;

            try {
                console.log(`[ContentServer] Generating image for segment ${seg.order_index} (Project: ${projectId})`);
                
                let referenceImages = [];
                
                // Fetch character images based on seg.characters
                if (seg.characters && Array.isArray(seg.characters) && seg.characters.length > 0) {
                    const sortedChars = [...seg.characters].sort((a, b) => a.index - b.index);
                    for (const char of sortedChars) {
                        const imgUrl = charactersMap[`${char.character_id}_${char.outfit_id}`];
                        if (imgUrl) {
                            try {
                                const resp = await fetch(imgUrl);
                                const arrayBuf = await resp.arrayBuffer();
                                referenceImages.push(Buffer.from(arrayBuf).toString('base64'));
                            } catch (e) {
                                console.error(`Failed to fetch character image ${imgUrl}:`, e);
                            }
                        }
                    }
                }
                


                const base64Img = await generateImage(seg.image_prompt, aspectRatio, referenceImages);
                
                console.log(`[ContentServer] Uploading image for segment ${seg.order_index}`);
                const buffer = Buffer.from(base64Img, 'base64');
                const key = `content/${projectId}/${seg.order_index}_${uuidv4()}.png`;
                
                await withRetry(async () => {
                    await s3.send(new PutObjectCommand({
                        Bucket: R2_BUCKET,
                        Key: key,
                        Body: buffer,
                        ContentType: 'image/png'
                    }));
                });
                
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
    if (failedCount > 0) {
        await supabase.from('content_projects').update({ status: 'draft', render_status: 'failed' }).eq('id', projectId);
        console.log(`[ContentServer] Background image generation had ${failedCount} failures for project ${projectId}. Status set to draft, render_status failed.`);
    } else {
        await syncProjectStatus(projectId);
        console.log(`[ContentServer] Background image generation complete for project ${projectId}. Synced status.`);
    }
}

// --- Routes ---

// 1. Generate Story Segments (Text First, Images Background)
app.post('/generate-segments', async (req, res) => {
    let createdProjectId = null;
    try {
        const { projectId, userId, avatarUrl: rawAvatarUrl } = req.body;
        console.log(`[ContentServer] Received generate request for project: ${projectId}`);
        createdProjectId = projectId;
        
        // 0. Pre-check Balance
        const userCredits = await getCredits(userId);
        const requiredMinBalance = COST_IMAGE_ULTRA;
        if (userCredits < requiredMinBalance) {
            await supabase.from('content_projects').update({ status: 'insufficient', render_status: 'failed' }).eq('id', projectId);
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        // 1. Fetch Project
        const { data: project, error } = await supabase.from('content_projects').select('*').eq('id', projectId).eq('user_id', userId).single();
        if (error || !project) throw error || new Error("Project not found");
        
        const avatarUrl = (rawAvatarUrl || project.prompt?.avatarUrl || project.prompt?.avatar_url || '').trim().replace(/\s+/g, '%20') || null;
        const promptText = project.prompt?.voiceover || project.title;
        const style = project.prompt?.style || project.image_style;
        const aspectRatio = project.aspect_ratio;
        const voiceId = project.voice_id;

        await supabase.from('content_projects').update({ status: 'generating' }).eq('id', projectId);

        // Return immediately with generating status
        res.status(202).json({ projectId: project.id, status: 'generating' });

        // --- BACKGROUND PROCESSING ---
        (async () => {
            let segmentsSaved = false;
            try {
                // 2. Generate Text Segments
                console.log(`[ContentServer] Generating text segments...`);
                const { segments: segmentsData, usageMetadata, rawVisualData } = await generateStorySegments(promptText, aspectRatio, style, 'Balanced', false, avatarUrl);
                console.log(`[ContentServer] Text segments generated: ${segmentsData.length}`);

                // 2.5 Save Text Segments to DB (Image NULL) immediately
                const segmentsToInsert = segmentsData.map((s, idx) => ({
                    project_id: project.id,
                    narration: s.narration,
                    image_prompt: s.image_prompt,
                    animation_prompt: s.animation_prompt,
                    image_url: null, // Placeholder, images come later
                    characters: s.characters || null,
                    avatar_url: s.avatar_url || null,
                    order_index: idx
                }));

                const { data: insertedSegments, error: segError } = await supabase
                    .from('content_segments')
                    .insert(segmentsToInsert)
                    .select();

                if (segError) throw segError;
                segmentsSaved = true;
                console.log(`[ContentServer] Segments saved to DB. Evaluating costs...`);

                // 3. Determine Cost & Charge
                const flashInputTokens = usageMetadata?.flashUsage?.promptTokenCount || 0;
                const flashOutputTokens = usageMetadata?.flashUsage?.candidatesTokenCount || 0;
                
                const proInputTokens = usageMetadata?.proUsage?.promptTokenCount || 0;
                const proOutputTokens = usageMetadata?.proUsage?.candidatesTokenCount || 0;
                
                const flashCost = (flashInputTokens / 1000) * FLASH_COST_THOUSAND_INPUT_TOKENS + (flashOutputTokens / 1000) * FLASH_COST_THOUSAND_OUTPUT_TOKENS;
                const proCost = (proInputTokens / 1000) * COST_PER_THOUSAND_INPUT_TOKENS + (proOutputTokens / 1000) * COST_PER_THOUSAND_TOKENS;
                
                let analysisCost = flashCost + proCost;
                
                let isCapped = false;
                if (analysisCost > MAX_ANALYSIS_COST) {
                    analysisCost = MAX_ANALYSIS_COST;
                    isCapped = true;
                }

                console.log(`[Billing] Analysis Tokens - Flash In/Out: ${flashInputTokens}/${flashOutputTokens}, Pro In/Out: ${proInputTokens}/${proOutputTokens}`);
                console.log(`[Billing] Calculated Analysis Cost: ${analysisCost.toFixed(4)} credits (Capped: ${isCapped})`);

                // Charge LLM upfront for Phase 1
                await chargeUser(userId, analysisCost, `AI Analysis`);

                // Generate Characters before starting scene rendering
                await processCharacters(project.id, userId, rawVisualData, style, avatarUrl, false);

                // Phase 3: Scenes
                const costPerImage = COST_IMAGE_ULTRA;
                const totalSceneCost = segmentsData.length * costPerImage;
                
                const currentBalance = await getCredits(userId);
                if (currentBalance < totalSceneCost) {
                    throw new Error(`Insufficient credits for complete scene generation. Needed: ${totalSceneCost}, Have: ${currentBalance}`);
                }
                
                console.log(`[Billing] Total Scene Cost: ${totalSceneCost.toFixed(2)} credits. Charging upfront...`);
                await chargeUser(userId, totalSceneCost, `Image Gen Batch upfront - ${segmentsData.length} images`);

                // 5. Update status to rendering
                await supabase.from('content_projects').update({ 
                    status: 'rendering', // Used by UI to show image/voice rendering states
                    render_status: 'generating'
                }).eq('id', project.id);

                // 6. Trigger Background Image Gen
                processImagesBackground(project.id, insertedSegments, aspectRatio, costPerImage, userId, false);

                // 7. Trigger Background Asset Gen (Audio/Subtitles)
                processAssetsBackground(project.id, insertedSegments, voiceId, userId).catch(e => {
                    console.error(`[ContentServer] Parallel Asset Gen failed for project ${project.id}`, e);
                });

            } catch (backgroundError) {
                console.error("[ContentServer] Error in background generation:", backgroundError);
                const isInsufficient = backgroundError?.message?.toLowerCase().includes('insufficient');
                const nextStatus = isInsufficient ? 'insufficient' : 'draft';
                await supabase.from('content_projects').update({ status: nextStatus, render_status: 'failed' }).eq('id', project.id);
            }
        })();

    } catch (e) {
        console.error("[ContentServer] Error in generate-segments:", e);
        if (createdProjectId) {
            res.status(500).json({ error: e.message, projectId: createdProjectId, segments: [] });
        } else {
            res.status(500).json({ error: e.message });
        }
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

        // 0. Fetch Project & Segment
        const { data: project, error: projError } = await supabase
            .from('content_projects')
            .select('user_id')
            .eq('id', projectId)
            .single();
        
        if (projError || !project) throw new Error("Project not found");
        userId = project.user_id;

        const { data: segment } = await supabase
            .from('content_segments')
            .select('avatar_url, characters')
            .eq('id', segmentId)
            .single();

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

        // 2. Fetch avatar/characters if any and generate new image
        let referenceImages = [];
        
        if (segment && segment.characters && Array.isArray(segment.characters) && segment.characters.length > 0) {
            const { data: projectCharacters } = await supabase
                .from('content_characters')
                .select('*')
                .eq('project_id', projectId);
                
            const charactersMap = {};
            if (projectCharacters) {
                projectCharacters.forEach(c => {
                    charactersMap[`${c.character_id}_${c.outfit_id}`] = c.image_url;
                });
            }

            const sortedChars = [...segment.characters].sort((a, b) => a.index - b.index);
            for (const char of sortedChars) {
                const imgUrl = charactersMap[`${char.character_id}_${char.outfit_id}`];
                if (imgUrl) {
                    try {
                        const resp = await fetch(imgUrl);
                        const arrayBuf = await resp.arrayBuffer();
                        referenceImages.push(Buffer.from(arrayBuf).toString('base64'));
                    } catch (e) {
                        console.error(`Failed to fetch character image ${imgUrl}:`, e);
                    }
                }
            }
        }
        


        const base64Img = await generateImage(imagePrompt, aspectRatio, referenceImages);
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
        await withRetry(async () => {
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: newKey,
                Body: buffer,
                ContentType: 'image/png'
            }));
        });

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
        await withRetry(async () => {
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: 'image/png'
            }));
        });
        
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
        const rawExt = filename && filename.includes('.') ? filename.split('.').pop() : '';
        const cleanExt = (rawExt || (contentType ? contentType.split('/')[1] : 'png')).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
        const key = `content/uploads/${projectId}/${segmentId}_${Date.now()}.${cleanExt}`;
        
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
        const { segmentId, newImageUrl, oldImageUrl, table } = req.body;
        const targetTable = table === 'demo_segments' ? 'demo_segments' : 'content_segments';
        
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
        await supabase.from(targetTable).update({ image_url: newImageUrl }).eq('id', segmentId);
        
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

        let projectType = 'content_projects';
        
        // Verify ownership and get file paths
        let { data: project } = await supabase.from('content_projects').select('user_id, voice_file_path').eq('id', id).single();
        
        if (!project) {
            const { data: demoProject } = await supabase.from('demo_projects').select('user_id, voice_path, video_url').eq('id', id).single();
            if (demoProject) {
                projectType = 'demo_projects';
                project = demoProject;
            }
        }

        if (!project || project.user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        // Collect all storage keys to delete
        const keysToDelete = [];

        if (projectType === 'content_projects') {
            // Get segments to find images to delete
            const { data: segments } = await supabase.from('content_segments').select('image_url').eq('project_id', id);
            
            // Add image keys
            if (segments && segments.length > 0) {
                segments.forEach(s => {
                    const key = getKeyFromUrl(s.image_url);
                    if (key) keysToDelete.push(key);
                });
            }

            // Add character image keys, excluding original avatars
            const { data: characters } = await supabase.from('content_characters').select('image_url').eq('project_id', id);
            if (characters && characters.length > 0) {
                characters.forEach(c => {
                    const key = getKeyFromUrl(c.image_url);
                    if (key && !key.startsWith('avatars/')) keysToDelete.push(key);
                });
            }

            // Add audio key
            if (project.voice_file_path) {
                const audioKey = getKeyFromUrl(project.voice_file_path);
                if (audioKey) keysToDelete.push(audioKey);
            }
        } else {
            // Add audio key for demo
            if (project.voice_path) {
                const audioKey = getKeyFromUrl(project.voice_path);
                if (audioKey) keysToDelete.push(audioKey);
            }
            // Add video key for demo
            if (project.video_url) {
                const videoKey = getKeyFromUrl(project.video_url);
                if (videoKey) keysToDelete.push(videoKey);
            }
        }
        
        // Delete all files from S3
        if (keysToDelete.length > 0) {
            await Promise.allSettled(keysToDelete.map(key => 
                s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
            ));
        }

        // Delete DB record (cascade will handle segments)
        await supabase.from(projectType).delete().eq('id', id);
        
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
    let costPerSec = 5; // Grok pricing
    let finalDur = 4;
    let totalCost = COST_VIDEO_GROK;
    
    try {
        // Fetch segment to get project -> userId
        const { data: segment } = await supabase.from('content_segments').select('project_id, order_index').eq('id', segmentId).single();
        if (!segment) throw new Error("Segment not found");
        
        const { data: project } = await supabase.from('content_projects').select('user_id, aspect_ratio, segment_durations').eq('id', segment.project_id).single();
        if (!project) throw new Error("Project not found");
        userId = project.user_id;

        const allSegments = await supabase.from('content_segments').select('id, order_index').eq('project_id', segment.project_id).order('order_index');
        const idx = allSegments.data.findIndex(s => s.id === segmentId);
        const rawDur = project.segment_durations && project.segment_durations[idx] ? project.segment_durations[idx] : 4;
        const rounded = Math.round(rawDur);
        if (rounded === 3 || rounded === 4) finalDur = 2;
        else if (rounded === 5) finalDur = 3;
        else if (rounded === 6 || rounded === 7) finalDur = 4;
        else if (rounded === 8 || rounded === 9) finalDur = 5;
        else if (rounded === 10 || rounded === 11) finalDur = 6;
        else if (rounded > 11) finalDur = 7;
        else finalDur = 2;
        totalCost = finalDur * costPerSec;

        // 1. Check balance
        const balance = await getCredits(userId);
        if (balance < totalCost) {
            return res.status(402).json({ error: `Insufficient credits. Need ${totalCost} credits for video generation.` });
        }

        // 2. Charge credits
        await chargeUser(userId, totalCost, `Grok Video Generation`);
        charged = true;

        // 3. Generate video using Replicate
        const videoBuffer = await generateVideo(imageUrl, animationPrompt, "ultra", project.aspect_ratio || "16:9", finalDur);

        // After the video is generated:
        // 1. Upload the generated video to the R2 bucket
        const key = `content/videos/${segmentId}_${uuidv4()}.mp4`;
        await withRetry(async () => {
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: Buffer.from(videoBuffer),
                ContentType: 'video/mp4'
            }));
        });
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
            await refundUser(userId, totalCost, `Refund: Failed Grok Video Generation`);
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

// Retry endpoint: resumes incomplete projects (characters > scene images & audio)
const handleRetryProject = async (req, res) => {
    const { projectId, userId: bodyUserId } = req.body;
    console.log(`[ContentServer] Received retry request for project: ${projectId}`);

    if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
    }

    try {
        // 1. Fetch project
        const { data: project, error: projError } = await supabase
            .from('content_projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projError || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const userId = bodyUserId || project.user_id;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        // 2. First check MIN_BALANCE
        const userCredits = await getCredits(userId);
        if (userCredits < MIN_BALANCE) {
            await supabase.from('content_projects').update({ status: 'insufficient', render_status: 'failed' }).eq('id', projectId);
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        // 3. Inspect what's missing in the project
        const { data: segments, error: segError } = await supabase
            .from('content_segments')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index');

        const missingSegmentsCollection = !segments || segments.length === 0;

        const { data: existingChars } = await supabase
            .from('content_characters')
            .select('*')
            .eq('project_id', projectId);
            
        const missingChars = existingChars ? existingChars.filter(c => !c.image_url) : [];
        const charCost = missingChars.length * COST_IMAGE_ULTRA; // COST_IMAGE_ULTRA (4 credits) per character

        const missingSceneImages = segments && segments.length > 0 ? segments.filter(s => !s.image_url) : [];
        const costPerImage = COST_IMAGE_ULTRA; // 4 credits
        const sceneCost = missingSceneImages.length * costPerImage;

        // Check missing audio
        const missingAudio = !project.voice_file_path || !project.segment_durations || project.segment_durations.length === 0;

        // If nothing is missing, sync status and return
        if (!missingSegmentsCollection && missingChars.length === 0 && missingSceneImages.length === 0 && !missingAudio) {
            await syncProjectStatus(projectId);
            return res.json({
                success: true,
                message: "Project is already fully generated.",
                projectId
            });
        }

        // 4. Upfront credit check for Character Image Generation and Scene Image Generation
        if (!missingSegmentsCollection) {
            if (userCredits < charCost) {
                await supabase.from('content_projects').update({ status: 'insufficient', render_status: 'failed' }).eq('id', projectId);
                return res.status(402).json({ error: `Insufficient credits for character generation. Needed: ${charCost}, Have: ${userCredits}` });
            }
            if ((userCredits - charCost) < sceneCost) {
                await supabase.from('content_projects').update({ status: 'insufficient', render_status: 'failed' }).eq('id', projectId);
                return res.status(402).json({ error: `Insufficient credits for scene image generation. Needed: ${sceneCost}, Available: ${userCredits - charCost}` });
            }
        }

        // 5. Update status to generating
        await supabase.from('content_projects').update({
            status: 'generating',
            render_status: 'generating'
        }).eq('id', projectId);

        // Immediate response so client UI updates without timing out
        res.json({
            success: true,
            message: "Retry generation initiated",
            projectId,
            missing: {
                segments: missingSegmentsCollection,
                characters: missingChars.length,
                scenes: missingSceneImages.length,
                audio: missingAudio
            }
        });

        // 6. Execute in background in strict order:
        // Segments > Character Image Generation > Scene Images & Audio Generation
        (async () => {
            let workingSegments = segments || [];
            let workingMissingSceneImages = missingSceneImages;
            let rawVisualData = null;
            let currentBalance = userCredits;
            
            try {
                if (missingSegmentsCollection) {
                    console.log(`[ContentServer] [Retry] Regenerating missing segments...`);
                    const promptText = project.prompt?.voiceover || project.title;
                    const style = project.prompt?.style || project.image_style;
                    const avatarUrl = project.prompt?.avatarUrl || null;
                    const aspectRatio = project.aspect_ratio || '9:16';
                    const voiceId = project.voice_id;

                    const { segments: segmentsData, usageMetadata, rawVisualData: generatedVisualData } = await generateStorySegments(promptText, aspectRatio, style, 'Balanced', false, avatarUrl);
                    rawVisualData = generatedVisualData;
                    console.log(`[ContentServer] [Retry] Text segments generated: ${segmentsData.length}`);

                    const segmentsToInsert = segmentsData.map((s, idx) => ({
                        project_id: project.id,
                        narration: s.narration,
                        image_prompt: s.image_prompt,
                        animation_prompt: s.animation_prompt,
                        image_url: null,
                        characters: s.characters || null,
                        avatar_url: s.avatar_url || null,
                        order_index: idx
                    }));

                    const { data: insertedSegments, error: segError } = await supabase
                        .from('content_segments')
                        .insert(segmentsToInsert)
                        .select();

                    if (segError) throw segError;
                    
                    workingSegments = insertedSegments;
                    workingMissingSceneImages = insertedSegments;

                    // Determine Cost & Charge
                    const flashInputTokens = usageMetadata?.flashUsage?.promptTokenCount || 0;
                    const flashOutputTokens = usageMetadata?.flashUsage?.candidatesTokenCount || 0;
                    const proInputTokens = usageMetadata?.proUsage?.promptTokenCount || 0;
                    const proOutputTokens = usageMetadata?.proUsage?.candidatesTokenCount || 0;
                    
                    const flashCost = (flashInputTokens / 1000) * FLASH_COST_THOUSAND_INPUT_TOKENS + (flashOutputTokens / 1000) * FLASH_COST_THOUSAND_OUTPUT_TOKENS;
                    const proCost = (proInputTokens / 1000) * COST_PER_THOUSAND_INPUT_TOKENS + (proOutputTokens / 1000) * COST_PER_THOUSAND_TOKENS;
                    
                    let analysisCost = flashCost + proCost;
                    if (analysisCost > MAX_ANALYSIS_COST) {
                        analysisCost = MAX_ANALYSIS_COST;
                    }

                    await chargeUser(userId, analysisCost, `AI Analysis (Retry)`);
                    currentBalance -= analysisCost;
                }

                // Step 1: Character Image Generation
                if (missingChars.length > 0 || (missingSegmentsCollection && rawVisualData?.characters)) {
                    // if segments were just generated, we need to generate characters for them.
                    const charsToProcess = missingSegmentsCollection && rawVisualData?.characters ? rawVisualData.characters : missingChars;
                    if (charsToProcess.length > 0) {
                        const requiredCharCost = charsToProcess.length * COST_IMAGE_ULTRA;
                        if (currentBalance < requiredCharCost) {
                            throw new Error(`Insufficient credits for character generation.`);
                        }
                        console.log(`[ContentServer] [Retry] Generating characters...`);
                        const rawAvatarUrl = workingSegments.find(s => s.avatar_url)?.avatar_url || null;
                        const avatarUrl = rawAvatarUrl ? rawAvatarUrl.trim().replace(/\s+/g, '%20') : null;
                        await processCharacters(projectId, userId, rawVisualData, project.image_style || 'cinematic', avatarUrl, false);
                        currentBalance -= requiredCharCost;
                    }
                }

                // Step 2: Scene Images & Audio Generation
                const tasks = [];

                if (workingMissingSceneImages.length > 0) {
                    const requiredSceneCost = workingMissingSceneImages.length * costPerImage;
                    if (currentBalance < requiredSceneCost) {
                        throw new Error(`Insufficient credits for scene image generation. Needed: ${requiredSceneCost}`);
                    }
                    console.log(`[ContentServer] [Retry] Generating ${workingMissingSceneImages.length} missing scene images...`);
                    if (requiredSceneCost > 0) {
                        await chargeUser(userId, requiredSceneCost, `Image Gen Batch upfront - ${workingMissingSceneImages.length} images`);
                        currentBalance -= requiredSceneCost;
                    }
                    tasks.push(
                        processImagesBackground(projectId, workingMissingSceneImages, project.aspect_ratio || '9:16', costPerImage, userId, false)
                    );
                }

                if (missingAudio || missingSegmentsCollection) {
                    console.log(`[ContentServer] [Retry] Generating missing audio...`);
                    const voiceId = project.voice_id || 'nPczCjzI2devNBz1zQrb';
                    tasks.push(
                        processAssetsBackground(projectId, workingSegments, voiceId, userId).catch(e => {
                            console.error(`[ContentServer] [Retry] Audio Generation failed for project ${projectId}`, e);
                        })
                    );
                }

                if (tasks.length > 0) {
                    await Promise.allSettled(tasks);
                }
                
                // Final sync
                await syncProjectStatus(projectId);

            } catch (backgroundError) {
                console.error("[ContentServer] Error in retry background generation:", backgroundError);
                const isInsufficient = backgroundError?.message?.toLowerCase().includes('insufficient');
                const nextStatus = isInsufficient ? 'insufficient' : 'draft';
                await supabase.from('content_projects').update({ status: nextStatus, render_status: 'failed' }).eq('id', projectId);
            }
        })();

    } catch (e) {
        console.error("[ContentServer] Error in retry project:", e);
        const isInsufficient = e?.message?.toLowerCase().includes('insufficient');
        if (isInsufficient && projectId) {
            await supabase.from('content_projects').update({ status: 'insufficient', render_status: 'failed' }).eq('id', projectId);
        }
        res.status(500).json({ error: e.message });
    }
};
app.post('/retry-project', handleRetryProject);
app.post('/api/retry-project', handleRetryProject);

app.post('/animate-all', async (req, res) => {
    const { projectId, userId } = req.body;
    const costPerSec = 5; // Grok pricing
    
    try {
        // 1. Fetch Project and Segments
        const { data: project } = await supabase.from('content_projects').select('user_id, aspect_ratio, segment_durations').eq('id', projectId).single();
        if (!project) throw new Error("Project not found");
        
        const { data: segments } = await supabase.from('content_segments').select('*').eq('project_id', projectId).order('order_index');
        if (!segments || segments.length === 0) throw new Error("No segments found for project");

        // 2. Identify qualifying segments (not ending in .mp4)
        const qualifyingSegments = segments.filter(seg => seg.image_url && !seg.image_url.toLowerCase().endsWith('.mp4'));
        if (qualifyingSegments.length === 0) {
            return res.status(400).json({ error: "No image segments left to animate." });
        }

        // 3. Calculate Cost & Check Credits
        let totalCost = 0;
        const segmentDurations = project.segment_durations || [];
        qualifyingSegments.forEach(seg => {
            const idx = segments.findIndex(s => s.id === seg.id);
            const rawDur = segmentDurations[idx] || 4;
            const rounded = Math.round(rawDur);
            let finalDur = 2;
            if (rounded === 3 || rounded === 4) finalDur = 2;
            else if (rounded === 5) finalDur = 3;
            else if (rounded === 6 || rounded === 7) finalDur = 4;
            else if (rounded === 8 || rounded === 9) finalDur = 5;
            else if (rounded === 10 || rounded === 11) finalDur = 6;
            else if (rounded > 11) finalDur = 7;
            else finalDur = 2;
            totalCost += (finalDur * costPerSec);
            seg._duration = finalDur;
            seg._cost = (finalDur * costPerSec);
        });

        const balance = await getCredits(userId);
        if (balance < totalCost) {
            return res.status(402).json({ error: `Insufficient credits. Need ${totalCost} credits to animate ${qualifyingSegments.length} segments.` });
        }

        // 4. Charge user
        await chargeUser(userId, totalCost, `Batch Video Generation (${qualifyingSegments.length} segments, Grok)`);

        // 5. Set render_status to 'Animating'
        await supabase.from('content_projects').update({ render_status: 'Animating' }).eq('id', projectId);

        // 6. Start processing in background
        processAnimationsBackground(projectId, qualifyingSegments, project.aspect_ratio, userId, "ultra").catch(e => {
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
    const { projectId, userId, quality } = req.body;
    console.log(`[ContentServer] Exporting video for project ${projectId} at ${quality || '1080p'}`);

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
                
                const onProgress = async ({ stage, progress }) => {
                    await supabase.from('content_stories').update({
                        export_stage: stage,
                        export_progress: progress
                    }).eq('id', story.id);
                };

                // Assemble
                const assembledPath = await assembleVideo(segments, audioPath, project.segment_durations, workDir, project.aspect_ratio, project.effect, quality || '1080p', onProgress);
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

                let videoUrl;
                if (process.env.LOCAL === 'true') {
                    // Store locally
                    const exportsDir = path.join(process.cwd(), 'exports');
                    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
                    const finalFileName = `${uuidv4()}.mp4`;
                    const localFinalPath = path.join(exportsDir, finalFileName);
                    fs.copyFileSync(finalPath, localFinalPath);
                    videoUrl = `/exports/${finalFileName}`;
                } else {
                    // Upload
                    const finalBuffer = fs.readFileSync(finalPath);
                    const finalKey = `content/stories/${uuidv4()}.mp4`;
                    await withRetry(async () => {
                        await s3.send(new PutObjectCommand({
                            Bucket: R2_BUCKET,
                            Key: finalKey,
                            Body: finalBuffer,
                            ContentType: 'video/mp4'
                        }));
                    });
                    videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;
                }

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

// Generate YouTube Description
app.post('/generate-description', async (req, res) => {
    try {
        const { projectId, videoTitle, userId } = req.body;
        if (!projectId) {
            return res.status(400).json({ error: "Missing projectId" });
        }

        console.log(`[ContentServer] Generating YouTube description for project ${projectId}`);

        // 1. Fetch Project
        const { data: project, error: projError } = await supabase
            .from('content_projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projError || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.voice_file_path) {
            return res.status(400).json({ error: "Voiceover is not yet generated." });
        }

        const effectiveUserId = userId || project.user_id;

        // 0. Balance Check
        const balance = await getCredits(effectiveUserId);
        if (balance < MIN_BALANCE) {
            return res.status(402).json({ error: "Insufficient credits for this request." });
        }

        // Fetch segments to assemble script fallback
        const { data: segments } = await supabase
            .from('content_segments')
            .select('narration, order_index')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        const scriptContent = segments && segments.length > 0
            ? segments.map((s, idx) => `Segment ${idx + 1}: ${s.narration}`).join('\n')
            : null;

        const effectiveTitle = videoTitle || project.title || "Untitled Video";

        // 2. Call generateDescription
        const { description, usageMetadata } = await generateDescription(
            effectiveTitle,
            project.voice_file_path,
            scriptContent
        );

        // 3. Billing Calculation
        const promptTokens = usageMetadata?.promptTokenCount || 0;
        const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;

        let cost = (promptTokens / 1000) * FLASH_COST_THOUSAND_INPUT_TOKENS +
                   (candidatesTokens / 1000) * FLASH_COST_THOUSAND_OUTPUT_TOKENS;

        if (cost > MAX_ANALYSIS_COST) {
            cost = MAX_ANALYSIS_COST;
        }
        cost = Number(cost.toFixed(4));

        console.log(`[Billing] Description Generation Tokens - In: ${promptTokens}, Out: ${candidatesTokens}, Cost: ${cost} credits`);

        // Charge user
        if (effectiveUserId && cost > 0) {
            await chargeUser(effectiveUserId, cost, "YouTube Description Generation");
        }

        // 4. Save to Database
        const { error: updateError } = await supabase
            .from('content_projects')
            .update({ description })
            .eq('id', projectId);

        if (updateError) {
            console.error("[ContentServer] Failed to save description to DB:", updateError);
            throw updateError;
        }

        console.log(`[ContentServer] Description successfully generated and saved for project ${projectId}`);

        res.json({
            success: true,
            description,
            cost,
            usageMetadata
        });
    } catch (e) {
        console.error("[ContentServer] Generate description failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- Demo Maker Routes ---
app.post('/demo/generate-upload-url', demoGenerateUploadUrl);
app.delete('/demo/videos/:id', demoDeleteVideo);
app.post('/demo/process-video', demoProcessVideo);
app.post('/demo/regenerate-audio', regenerateDemoAudio);
app.post('/demo/export', exportDemoVideo);
app.post('/demo/generate-motion-graphics', demoGenerateMotionGraphics);
app.post('/demo/generate-hook-upload-url', generateHookUploadUrl);
app.post('/demo/save-hook-asset', saveHookAsset);
app.get('/demo/hook-assets/:userId', getHookAssets);
app.post('/demo/generate-hook-image', generateHookImage);
app.post('/demo/delete-hook-asset', deleteHookAsset);

// --- Avatar Routes ---
app.post('/api/avatars/generate-upload-url', generateAvatarUploadUrl);
app.post('/api/avatars/save', saveAvatar);
app.get('/api/avatars/:userId', getAvatars);
app.post('/api/avatars/generate', generateAvatarImage);
app.delete('/api/avatars/:id', deleteAvatar);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));