import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVideo, generateVoiceover } from './gemini.js';
import { processVideoPipeline, preprocessVideo, calculateAudioLineDurations, PREPROCESS_FLAGS, HIGH_QUALITY_FLAGS } from './video-processor.js';
import { supabase } from './supabase.js';
import { execSync } from 'child_process';
import { getVideoAnalysisPrompt } from './prompts.js';
import https from 'https';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();

const TEMP_DIR = os.tmpdir();
const upload = multer({ dest: TEMP_DIR });

// R2 Configuration
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

app.use(express.json());

app.use(cors({
    origin: '*',
    exposedHeaders: ['X-Video-Id']
}));

// We can remove the strict 5 min timeout middleware or leave it as a safety net.
// Since we respond immediately with 202, this timeout won't be triggered by normal processing.
app.use((req, res, next) => {
    res.setTimeout(300000, () => {
        // Only logs if the actual initial handshake takes > 5 mins (unlikely)
        console.log('Request has timed out.'); 
    });
    next();
});

function getDuration(filePath) {
  try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const val = parseFloat(out.toString().trim());
      return isNaN(val) ? 0.0 : val;
  } catch (e) {
      return 0.0;
  }
}

function parseTime(t) {
    if (typeof t === 'number') return t;
    const parts = t.toString().split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

function cleanup(files) {
    files.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
}

app.get('/', (req, res) => res.send('DemoGen API Running'));

app.post('/generate-upload-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: 'Missing fileName or fileType' });

    const key = `inputs/${uuidv4()}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Construct the public URL for retrieval
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

app.delete('/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing User ID' });

        const { data: video, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !video) return res.status(404).json({ error: 'Video not found' });
        
        if (video.user_id !== userId) {
             return res.status(403).json({ error: 'Forbidden' });
        }

        const filesToDelete = [];

        const getKeyFromUrl = (url) => {
            if (!url) return null;
            const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
            if (url.startsWith(baseUrl)) {
                return url.replace(baseUrl, '');
            }
            return null;
        };

        // If it's a raw upload/asset, we delete the input file
        if (video.status === 'uploaded' && video.input_video_url) {
             const key = getKeyFromUrl(video.input_video_url);
             if (key) filesToDelete.push(key);
        }

        // If it's a generated video, we delete the final output file
        // We do NOT delete the input file as it might be an asset used by others
        if (video.status !== 'uploaded' && video.final_video_url) {
             const key = getKeyFromUrl(video.final_video_url);
             if (key) filesToDelete.push(key);
        }

        if (filesToDelete.length > 0) {
            console.log(`Deleting files for video ${id}:`, filesToDelete);
            await Promise.allSettled(filesToDelete.map(key => 
                s3.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key
                }))
            ));
        }

        const { error: delError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (delError) throw delError;

        res.json({ success: true });

    } catch (e) {
        console.error("Delete Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- ASYNC BACKGROUND PROCESSOR ---
async function runVideoProcessing(jobData) {
    const { videoId, crop, trim, segments, voiceId, backgroundId, userId, appName, appDescription, scriptRules, stylePrompt, disableZoom } = jobData;
    const filesToDelete = [];

    console.log(`[Background Job] Starting for Video: ${videoId} User: ${userId}`);

    try {
        // 1. Fetch Video URL from Supabase DB
        const { data: videoRecord, error: dbError } = await supabase
            .from('videos')
            .select('input_video_url, title')
            .eq('id', videoId)
            .single();
            
        if (dbError || !videoRecord || !videoRecord.input_video_url) {
            throw new Error('Video not found or missing input URL in DB');
        }

        // 2. Download the raw file
        const inputExt = path.extname(videoRecord.title) || '.mp4';
        const localInputPath = path.join(TEMP_DIR, `raw_${uuidv4()}${inputExt}`);
        filesToDelete.push(localInputPath);

        console.log(`Downloading video from ${videoRecord.input_video_url}...`);
        await downloadFile(videoRecord.input_video_url, localInputPath);

        // Duration Check (redundant if frontend checks, but good for safety)
        let effectiveDuration = 0;
        if (segments && Array.isArray(segments) && segments.length > 0) {
            effectiveDuration = segments.reduce((acc, s) => acc + (s.end - s.start), 0);
        } else if (trim && typeof trim.end === 'number' && typeof trim.start === 'number') {
            effectiveDuration = trim.end - trim.start;
        } else {
            effectiveDuration = getDuration(localInputPath);
        }

        if (effectiveDuration > 300) {
            throw new Error("The video's duration exceeds the 5-minute limit.");
        }

        // --- Create Two Versions of Input ---
        console.log('--- Preprocessing Video (Crop/Cut/Trim) ---');
        
        // 1. AI Input File (Low Quality/Size for Cost Efficiency)
        const aiInputPath = path.join(TEMP_DIR, `ai_input_${uuidv4()}.mp4`);
        filesToDelete.push(aiInputPath);
        await preprocessVideo(localInputPath, crop, trim, segments, aiInputPath, PREPROCESS_FLAGS);

        // 2. Processing Input File (High Quality for Final Render)
        const processingInputPath = path.join(TEMP_DIR, `proc_input_${uuidv4()}.mp4`);
        filesToDelete.push(processingInputPath);
        await preprocessVideo(localInputPath, crop, trim, segments, processingInputPath, HIGH_QUALITY_FLAGS);

        // Use AI File for Analysis
        const cleanFileBuffer = fs.readFileSync(aiInputPath);
        const cleanFileBase64 = cleanFileBuffer.toString('base64');
        
        console.log('--- Analyzing Video with Gemini ---');
        const desc = appDescription || "A software application";
        const name = appName || "The App";
        const prompt = getVideoAnalysisPrompt(name, desc, scriptRules);

        const analysis = await analyzeVideo(cleanFileBase64, 'video/mp4', prompt); 
        console.log('Analysis complete.');
        
        // UPDATE DB WITH ANALYSIS - Allows frontend to infer "Analyzing" is done
        await supabase.from('videos').update({ analysis_result: analysis }).eq('id', videoId);

        let fullAudioPath = null;
        let audioLineDurations = [];
        
        const hasScript = analysis.script && analysis.script.script_lines && analysis.script.script_lines.length > 0;

        if (hasScript) {
            console.log('--- Generating Voiceover ---');
            const { audioBuffer, linesToSpeak } = await generateVoiceover(analysis.script.script_lines, voiceId, stylePrompt);
            
            if (audioBuffer) {
                const rawAudioPath = path.join(TEMP_DIR, `raw_audio_${Date.now()}.pcm`);
                fs.writeFileSync(rawAudioPath, audioBuffer);
                filesToDelete.push(rawAudioPath);
                
                fullAudioPath = path.join(TEMP_DIR, `audio_${Date.now()}.wav`);
                try {
                    execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${fullAudioPath}"`, { stdio: 'ignore' });
                    filesToDelete.push(fullAudioPath);
                } catch (e) {
                    console.error("Audio Conversion Failed:", e);
                    fullAudioPath = null;
                }
            }

            if (fullAudioPath) {
                const totalAudioDuration = getDuration(fullAudioPath);
                audioLineDurations = calculateAudioLineDurations(linesToSpeak, totalAudioDuration);
            }
        } 
        
        if (!fullAudioPath) {
            console.log('--- Fallback: Calculating visual durations ---');
            audioLineDurations = analysis.segments.map(seg => {
                const start = parseTime(seg.start_time);
                const end = parseTime(seg.end_time);
                return Math.max(1.0, end - start);
            });
            if (!analysis.script) analysis.script = { script_lines: [] };
        }
        
        const outputPath = path.join(TEMP_DIR, `final_${Date.now()}.mp4`);
        console.log('--- Starting Video Pipeline ---');
        
        const isZoomDisabled = disableZoom === 'true' || disableZoom === true;

        // Use High Quality Processing File for the visual pipeline
        await processVideoPipeline(
            processingInputPath,
            fullAudioPath,
            audioLineDurations,
            analysis,
            outputPath,
            backgroundId,
            isZoomDisabled
        );
        console.log('--- Pipeline Complete ---');

        const outputBuffer = fs.readFileSync(outputPath);
        const outputKey = `outputs/${uuidv4()}.mp4`;
        
        console.log(`Uploading output to R2: ${outputKey}`);
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: outputKey,
            Body: outputBuffer,
            ContentType: 'video/mp4'
        }));

        const outputPublicUrl = `${R2_PUBLIC_URL}/${outputKey}`;

        // Charge Credit
        try {
            const { error: chargeError } = await supabase.rpc('charge_credit', { p_user_id: userId });
            if (chargeError) {
                console.error("Error charging credit:", chargeError);
                // Note: We don't fail the job if charging fails at this point, but you might want to log it for manual review.
            } else {
                console.log(`Credit charged for user ${userId}`);
            }
        } catch (e) {
            console.error("RPC Error charging credit:", e);
        }

        // Final DB Update
        const { error: dbUpdateError } = await supabase
            .from('videos')
            .update({
                final_video_url: outputPublicUrl,
                status: 'completed',
                voice_id: voiceId,
                background_id: backgroundId,
                crop_data: crop,
                trim_data: trim,
                analysis_result: analysis
            })
            .eq('id', videoId);

        if (dbUpdateError) console.error("Database Update Error (Final):", dbUpdateError);

        // Cleanup Output
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    } catch (error) {
        console.error("[Background Job Error]:", error);
        
        // Update DB to Failed
        await supabase
            .from('videos')
            .update({ status: 'failed' }) // You might want to add an error_message column later
            .eq('id', videoId);
            
    } finally {
        cleanup(filesToDelete);
        console.log(`[Background Job] Finished for ${videoId}`);
    }
}


app.post('/process-video', async (req, res) => {
  try {
    // Note: videoId here refers to the SOURCE video uploaded by the user
    let { videoId, crop, trim, segments, voiceId, backgroundId, userId, appName, appDescription, scriptRules, stylePrompt, disableZoom } = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    }
    
    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    try { if (typeof crop === 'string') crop = JSON.parse(crop); } catch(e){}
    try { if (typeof trim === 'string') trim = JSON.parse(trim); } catch(e){}
    try { if (typeof segments === 'string') segments = JSON.parse(segments); } catch(e){}

    // 1. Initial Credit Check (Fast Fail)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
    
    if (profileError || !profile) {
        return res.status(500).json({ error: 'Could not fetch user profile for credit check' });
    }
    
    if (profile.credits < 1) {
        return res.status(402).json({ error: 'Insufficient credits. Please purchase a pack.' });
    }

    // 2. Fetch Source Video Details
    const { data: sourceVideo, error: sourceError } = await supabase
        .from('videos')
        .select('input_video_url, title')
        .eq('id', videoId)
        .single();

    if (sourceError || !sourceVideo) {
        return res.status(404).json({ error: 'Original video not found' });
    }

    // 3. Create a NEW Record for the "Output" (Project)
    // This ensures we do not overwrite the user's raw upload, allowing for re-generations.
    const newVideoId = uuidv4();
    const newTitle = sourceVideo.title.includes('(Demo)') ? sourceVideo.title : `${sourceVideo.title} (Demo)`;

    const { error: insertError } = await supabase
        .from('videos')
        .insert({
            id: newVideoId,
            user_id: userId,
            title: newTitle,
            input_video_url: sourceVideo.input_video_url, // Copy the source URL
            status: 'processing',
            voice_id: voiceId,
            background_id: backgroundId,
            crop_data: crop,
            trim_data: trim
            // analysis_result will be populated during processing
        });
    
    if (insertError) {
        console.error("Failed to create new project record:", insertError);
        return res.status(500).json({ error: 'Failed to create project record' });
    }

    // 4. Respond with the NEW ID
    res.status(202).json({ 
        message: 'Video processing started in background', 
        videoId: newVideoId 
    });

    // 5. Trigger Asynchronous Processing with the NEW ID
    runVideoProcessing({
        videoId: newVideoId, // Pass the NEW ID
        crop, trim, segments, voiceId, backgroundId, userId, 
        appName, appDescription, scriptRules, stylePrompt, disableZoom
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));