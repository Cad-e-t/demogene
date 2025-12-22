
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVideo, generateVoiceover } from './gemini.js';
import { processVideoPipeline, preprocessVideo, calculateAudioLineDurations } from './video-processor.js';
import { supabase } from './supabase.js';
import { execSync } from 'child_process';
import { getVideoAnalysisPrompt, VIDEO_ANALYSIS_NO_SCRIPT_PROMPT } from './prompts.js';

const app = express();

// Use system temp directory for serverless/container compatibility
// Cloud Run filesystems are often read-only except for /tmp
const TEMP_DIR = os.tmpdir();
const upload = multer({ dest: TEMP_DIR });

app.use(express.json());

// Use standard CORS package
app.use(cors({
    origin: '*', // Allow any origin
    exposedHeaders: ['X-Video-Id'] // UPDATED: Expose ID instead of Result to avoid header overflow/char issues
}));

// Increase timeout for long processing
app.use((req, res, next) => {
    res.setTimeout(300000, () => { // 5 minutes
        console.log('Request has timed out.');
        res.sendStatus(408);
    });
    next();
});

// Helper for duration
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

app.get('/', (req, res) => res.send('DemoGen API Running'));

app.post('/process-video', upload.single('video'), async (req, res) => {
  const filesToDelete = [];
  try {
    const file = req.file;
    // Parse body fields
    let { crop, trim, segments, voiceId, userId, appName, appDescription, scriptRules, stylePrompt } = req.body;
    
    if (!userId) {
        return res.status(401).send('Unauthorized: Missing User ID');
    }

    // Parse JSON strings if necessary
    try { if (typeof crop === 'string') crop = JSON.parse(crop); } catch(e){}
    try { if (typeof trim === 'string') trim = JSON.parse(trim); } catch(e){}
    try { if (typeof segments === 'string') segments = JSON.parse(segments); } catch(e){}
    
    if (!file) return res.status(400).send('No file uploaded');
    filesToDelete.push(file.path);

    // =======================================================
    // 0. Validation: Credits & Duration
    // =======================================================
    
    // Check 1: Credits
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
    
    if (profileError || !profile) {
        throw new Error('Could not fetch user profile for credit check');
    }
    
    if (profile.credits < 1) {
        cleanup(filesToDelete);
        return res.status(402).json({ error: 'Insufficient credits. Please purchase a pack.' });
    }

    // Check 2: Duration calculation
    let effectiveDuration = 0;
    
    if (segments && Array.isArray(segments) && segments.length > 0) {
        // Calculate duration based on active segments
        effectiveDuration = segments.reduce((acc, s) => acc + (s.end - s.start), 0);
    } else if (trim && typeof trim.end === 'number' && typeof trim.start === 'number') {
        // Fallback to simple trim
        effectiveDuration = trim.end - trim.start;
    } else {
        // Fallback to full video if needed, but client should prevent this
        effectiveDuration = getDuration(file.path);
    }

    if (effectiveDuration > 180) {
        cleanup(filesToDelete);
        return res.status(400).json({ error: 'Processed video duration exceeds 3 minutes limit.' });
    }

    const isVoiceless = voiceId === 'voiceless';
    
    console.log(`[${new Date().toISOString()}] Processing ${file.originalname} for user ${userId}... Mode: ${isVoiceless ? 'Voiceless' : 'Narrated'}`);

    // =======================================================
    // 1. Preprocessing: Apply User Crop/Trim OR Segments
    // =======================================================
    console.log('--- Preprocessing Video (Crop/Cut/Trim) ---');
    // Use temp dir for intermediate files
    const cleanInputPath = path.join(TEMP_DIR, `clean_${file.filename}.mp4`);
    filesToDelete.push(cleanInputPath);
    
    // Updated preprocess logic handles segments if present, or fallback to trim
    await preprocessVideo(file.path, crop, trim, segments, cleanInputPath);

    // Check 3: Final physical file duration (Double check)
    const actualDuration = getDuration(cleanInputPath);
    if (actualDuration > 180.5) { // 0.5s tolerance
        cleanup(filesToDelete);
        return res.status(400).json({ error: 'Processed video duration exceeds 3 minutes. Please trim further.' });
    }

    // =======================================================
    // 2. Upload Clean Input to Supabase Storage
    // =======================================================
    const inputBuffer = fs.readFileSync(cleanInputPath);
    // Use UUID to avoid issues with complex filenames
    const inputExt = path.extname(file.originalname) || '.mp4';
    const inputFileName = `inputs/${uuidv4()}${inputExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(inputFileName, inputBuffer, {
            contentType: 'video/mp4',
            upsert: false
        });
        
    if (uploadError) throw new Error(`Supabase Upload Error: ${uploadError.message}`);
    
    const { data: { publicUrl: inputPublicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(inputFileName);

    console.log('Clean Input Uploaded:', inputPublicUrl);

    // =======================================================
    // 3. Gemini Analysis (Use Clean Input)
    // =======================================================
    const cleanFileBuffer = fs.readFileSync(cleanInputPath);
    const cleanFileBase64 = cleanFileBuffer.toString('base64');
    
    console.log('--- Analyzing Video with Gemini ---');
    // Select Prompt based on mode
    let prompt;
    if (isVoiceless) {
        prompt = VIDEO_ANALYSIS_NO_SCRIPT_PROMPT;
    } else {
        const desc = appDescription || "A software application";
        const name = appName || "The App";
        prompt = getVideoAnalysisPrompt(name, desc, scriptRules);
    }

    const analysis = await analyzeVideo(cleanFileBase64, 'video/mp4', prompt); 
    console.log('Analysis complete. Segments:', analysis.segments.length);

    // =======================================================
    // 4. Audio Generation (Single File) OR Duration Calc
    // =======================================================
    let fullAudioPath = null;
    let audioLineDurations = [];
    
    // Check if we actually have a script to narrate
    const hasScript = analysis.script && analysis.script.script_lines && analysis.script.script_lines.length > 0;

    if (!isVoiceless && hasScript) {
        console.log('--- Generating Voiceover (Single File) ---');
        
        // Generates one big buffer and returns the specific lines used
        const { audioBuffer, linesToSpeak } = await generateVoiceover(analysis.script.script_lines, voiceId, stylePrompt);
        
        if (audioBuffer) {
            // 1. Save Raw PCM data from Gemini (usually s16le, 24kHz, 1ch)
            const rawAudioPath = path.join(TEMP_DIR, `raw_audio_${Date.now()}.pcm`);
            fs.writeFileSync(rawAudioPath, audioBuffer);
            filesToDelete.push(rawAudioPath);
            
            // 2. Convert Raw PCM to standard WAV using FFmpeg
            fullAudioPath = path.join(TEMP_DIR, `audio_${Date.now()}.wav`);
            try {
                console.log("Converting Raw PCM to WAV...");
                execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${fullAudioPath}"`, { stdio: 'ignore' });
                filesToDelete.push(fullAudioPath);
            } catch (e) {
                console.error("Audio Conversion Failed:", e);
                // Don't throw, just fall back to voiceless logic below
                fullAudioPath = null;
            }
        } else {
            console.warn("Warning: Audio generation returned empty buffer. Proceeding without voiceover.");
        }

        if (fullAudioPath) {
             // 3. Get total duration of the VALID WAV file
            const totalAudioDuration = getDuration(fullAudioPath);
            console.log(`Total Audio Duration: ${totalAudioDuration}s`);
            // Calculate line durations mathematically
            audioLineDurations = calculateAudioLineDurations(linesToSpeak, totalAudioDuration);
        }
    } 
    
    // Fallback logic: If voiceless OR if audio generation failed
    if (!fullAudioPath) {
        console.log('--- Voiceless Mode (or fallback): Calculating visual durations ---');
        audioLineDurations = analysis.segments.map(seg => {
            const start = parseTime(seg.start_time);
            const end = parseTime(seg.end_time);
            return Math.max(1.0, end - start); // Ensure at least 1s duration
        });
        
        if (!analysis.script) analysis.script = { script_lines: [] };
    }
    
    console.log('Calculated Split Points:', audioLineDurations.map(d => d.toFixed(2)));

    // =======================================================
    // 5. FFmpeg Processing Pipeline
    // =======================================================
    const outputPath = path.join(TEMP_DIR, `final_${Date.now()}.mp4`);
    
    console.log('--- Starting Video Pipeline ---');
    
    await processVideoPipeline(
        cleanInputPath,
        fullAudioPath,    // Null if voiceless
        audioLineDurations, // Mathematical durations
        analysis,
        outputPath
    );
    console.log('--- Pipeline Complete ---');

    // =======================================================
    // 6. Upload Final Output to Supabase Storage
    // =======================================================
    const outputBuffer = fs.readFileSync(outputPath);
    const outputFileName = `outputs/${uuidv4()}.mp4`;
    
    const { error: outUploadError } = await supabase.storage
        .from('uploads')
        .upload(outputFileName, outputBuffer, {
             contentType: 'video/mp4'
        });
        
    if (outUploadError) throw new Error(`Output Upload Error: ${outUploadError.message}`);

    const { data: { publicUrl: outputPublicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(outputFileName);

    // =======================================================
    // 7. Save to Database
    // =======================================================
    const { data: insertedVideo, error: dbError } = await supabase
        .from('videos')
        .insert({
            user_id: userId, // Assign to the correct user
            title: file.originalname, // Keep original name here for user reference
            input_video_url: inputPublicUrl,
            final_video_url: outputPublicUrl,
            status: 'completed',
            voice_id: voiceId,
            crop_data: crop,
            trim_data: trim,
            analysis_result: analysis
        })
        .select('id')
        .single();

    if (dbError) console.error("Database Insert Error:", dbError);

    // =======================================================
    // 8. Charge Credit (After success)
    // =======================================================
    try {
        const { error: chargeError } = await supabase.rpc('charge_credit', { p_user_id: userId });
        if (chargeError) console.error("Error charging credit:", chargeError);
        else console.log(`Credit charged for user ${userId}`);
    } catch (e) {
        console.error("RPC Error charging credit:", e);
    }

    // =======================================================
    // 9. Return Result
    // =======================================================
    // Pass Video ID in header so frontend can fetch analysis from DB, avoiding header char limits
    if (insertedVideo && insertedVideo.id) {
        res.setHeader('X-Video-Id', insertedVideo.id);
    }
    res.setHeader('Content-Type', 'video/mp4');
    
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
    
    fileStream.on('close', () => {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        cleanup(filesToDelete);
    });

  } catch (error) {
    console.error("Server Error:", error);
    cleanup(filesToDelete);
    res.status(500).json({ error: error.message });
  }
});

function cleanup(files) {
    files.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));