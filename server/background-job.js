import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { analyzeVideo, generateVoiceover } from './gemini.js';
import { processVideoPipeline, preprocessVideo, calculateAudioLineDurations, PREPROCESS_FLAGS, HIGH_QUALITY_FLAGS } from './video-processor.js';
import { supabase } from './supabase.js';
import { getVideoAnalysisPrompt, getHowToVideoAnalysisPrompt } from './prompts.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { downloadFile, getDurationValue, parseTime, cleanup } from './utils.js';

const TEMP_DIR = os.tmpdir();

// --- ASYNC BACKGROUND PROCESSOR ---
export async function runVideoProcessing(jobData) {
    const { videoId, crop, trim, segments, voiceId, backgroundId, userId, appName, appDescription, scriptRules, stylePrompt, disableZoom, videoType, tutorialGoal } = jobData;
    const filesToDelete = [];

    console.log(`[Background Job] Starting for Video: ${videoId} User: ${userId} Type: ${videoType}`);

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
            effectiveDuration = getDurationValue(localInputPath);
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
        
        let prompt;
        if (videoType === 'tutorial') {
             console.log('Using Tutorial/How-To Analysis Prompt');
             prompt = getHowToVideoAnalysisPrompt(name, desc, tutorialGoal, scriptRules);
        } else {
             console.log('Using Standard Product Demo Analysis Prompt');
             prompt = getVideoAnalysisPrompt(name, desc, scriptRules, effectiveDuration);
        }

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
                const totalAudioDuration = getDurationValue(fullAudioPath);
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