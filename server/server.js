import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { analyzeVideo, generateVoiceover } from './gemini.js';
import { processVideoPipeline, preprocessVideo, calculateAudioLineDurations } from './video-processor.js';
import { supabase } from './supabase.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Use system temp directory for serverless/container compatibility
// Cloud Run filesystems are often read-only except for /tmp
const TEMP_DIR = os.tmpdir();
const upload = multer({ dest: TEMP_DIR });

app.use(express.json());

// Use standard CORS package
app.use(cors({
    origin: true, // Reflect request origin
    credentials: true,
    exposedHeaders: ['X-Analysis-Result'] // Required for the frontend to read the analysis result
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
      return parseFloat(out.toString().trim());
  } catch (e) {
      return 0.0;
  }
}

app.get('/', (req, res) => res.send('DemoGen API Running'));

app.post('/process-video', upload.single('video'), async (req, res) => {
  const filesToDelete = [];
  try {
    const file = req.file;
    // Parse body fields
    let { crop, trim, voiceId } = req.body;
    
    // Parse JSON strings if necessary
    try { if (typeof crop === 'string') crop = JSON.parse(crop); } catch(e){}
    try { if (typeof trim === 'string') trim = JSON.parse(trim); } catch(e){}
    
    if (!file) return res.status(400).send('No file uploaded');
    filesToDelete.push(file.path);
    
    console.log(`[${new Date().toISOString()}] Processing ${file.originalname}...`);

    // =======================================================
    // 0. Preprocessing: Apply User Crop/Trim
    // =======================================================
    console.log('--- Preprocessing Video (Crop/Trim) ---');
    // Use temp dir for intermediate files
    const cleanInputPath = path.join(TEMP_DIR, `clean_${file.filename}.mp4`);
    filesToDelete.push(cleanInputPath);
    
    await preprocessVideo(file.path, crop, trim, cleanInputPath);

    // =======================================================
    // 1. Upload Clean Input to Supabase Storage
    // =======================================================
    const inputBuffer = fs.readFileSync(cleanInputPath);
    const inputFileName = `inputs/${Date.now()}_${file.originalname}`;
    
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
    // 2. Gemini Analysis (Use Clean Input)
    // =======================================================
    const cleanFileBuffer = fs.readFileSync(cleanInputPath);
    const cleanFileBase64 = cleanFileBuffer.toString('base64');
    
    console.log('--- Analyzing Video with Gemini ---');
    const analysis = await analyzeVideo(cleanFileBase64, 'video/mp4'); 
    console.log('Analysis complete. Segments:', analysis.segments.length);

    // =======================================================
    // 3. Audio Generation (Single File)
    // =======================================================
    console.log('--- Generating Voiceover (Single File) ---');
    
    // Generates one big buffer and returns the specific lines used
    const { audioBuffer, linesToSpeak } = await generateVoiceover(analysis.script.script_lines, voiceId);
    
    // Write the full audio file to disk (temp dir)
    const fullAudioPath = path.join(TEMP_DIR, `audio_${Date.now()}.wav`);
    fs.writeFileSync(fullAudioPath, audioBuffer);
    filesToDelete.push(fullAudioPath);

    // Get total duration of the generated audio
    const totalAudioDuration = getDuration(fullAudioPath);
    console.log(`Total Audio Duration: ${totalAudioDuration}s`);

    // Calculate line durations mathematically (The Python Logic)
    const audioLineDurations = calculateAudioLineDurations(linesToSpeak, totalAudioDuration);
    console.log('Calculated Split Points:', audioLineDurations.map(d => d.toFixed(2)));

    // =======================================================
    // 4. FFmpeg Processing Pipeline
    // =======================================================
    const outputPath = path.join(TEMP_DIR, `final_${Date.now()}.mp4`);
    
    console.log('--- Starting Video Pipeline ---');
    
    await processVideoPipeline(
        cleanInputPath,
        fullAudioPath,    // Single master audio
        audioLineDurations, // Mathematical durations
        analysis,
        outputPath
    );
    console.log('--- Pipeline Complete ---');

    // =======================================================
    // 5. Upload Final Output to Supabase Storage
    // =======================================================
    const outputBuffer = fs.readFileSync(outputPath);
    const outputFileName = `outputs/final_${Date.now()}.mp4`;
    
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
    // 6. Save to Database
    // =======================================================
    const { error: dbError } = await supabase
        .from('videos')
        .insert({
            title: file.originalname,
            input_video_url: inputPublicUrl,
            final_video_url: outputPublicUrl,
            status: 'completed',
            voice_id: voiceId,
            crop_data: crop,
            trim_data: trim,
            analysis_result: analysis
        });

    if (dbError) console.error("Database Insert Error:", dbError);

    // =======================================================
    // 7. Return Result
    // =======================================================
    res.setHeader('X-Analysis-Result', JSON.stringify(analysis));
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