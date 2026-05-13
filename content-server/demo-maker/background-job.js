import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { AssemblyAI } from 'assemblyai';

import { analyzeVideo } from './gemini.js';
import { generateFullVoiceover } from '../gemini.js';
import { preprocessVideo, calculateAudioLineDurations, PREPROCESS_FLAGS } from './video-processor.js';
import { supabase } from './supabase.js';
import { getVideoAnalysisPrompt } from './prompts.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from '../storage.js';
import { downloadFile, getDurationValue, parseTime, cleanup, alignSegmentsWithTranscription } from './utils.js';

const TEMP_DIR = os.tmpdir();

export async function runDemoProcessing(jobData) {
    const { projectId, sourceVideoUrl, sections, voiceId, userId } = jobData;
    const filesToDelete = [];

    console.log(`[Demo Processing] Starting for Project: ${projectId}`);

    try {
        let segments = [];
        let transcription = null;
        let segmentDurations = [];
        let audioUrl = null;
        let analysis = null;

        const bodyText = sections?.find(s => s.type === 'body')?.text || '';
        const hookCount = sections?.filter(s => s.type === 'hook' && s.text.trim()).length || 0;

        if (sourceVideoUrl && bodyText) {
            // 1. Download the raw file
            const inputExt = '.mp4';
            const localInputPath = path.join(TEMP_DIR, `raw_${uuidv4()}${inputExt}`);
            filesToDelete.push(localInputPath);

            console.log(`Downloading video from ${sourceVideoUrl}...`);
            await downloadFile(sourceVideoUrl, localInputPath);

            const effectiveDuration = getDurationValue(localInputPath);

            // 2. AI Input File (Low Quality/Size for Cost Efficiency)
            const aiInputPath = path.join(TEMP_DIR, `ai_input_${uuidv4()}.mp4`);
            filesToDelete.push(aiInputPath);
            await preprocessVideo(localInputPath, null, null, null, aiInputPath, PREPROCESS_FLAGS);

            // Use AI File for Analysis
            const cleanFileBuffer = fs.readFileSync(aiInputPath);
            const cleanFileBase64 = cleanFileBuffer.toString('base64');
            
            console.log('--- Analyzing Video with Gemini ---');
            const prompt = getVideoAnalysisPrompt(bodyText, effectiveDuration);
            analysis = await analyzeVideo(cleanFileBase64, 'video/mp4', prompt); 
            console.log('Analysis complete.');
        }

        const hasScript = analysis && analysis.script && analysis.script.script_lines && analysis.script.script_lines.length > 0;

        if (hasScript || hookCount > 0) {
            console.log('--- Generating Voiceover ---');
            
            // Prepare segments list sequentially based on sections array
            if (sections) {
                sections.forEach((sec, idx) => {
                    if (sec.type === 'hook' && sec.text.trim()) {
                        segments.push({
                            id: sec.id || `hook-${idx}`,
                            narration: sec.text.trim(),
                            isHook: true,
                            video_start: "00:00.000",
                            video_end: "00:00.000",
                            hook_style: { style: 'media' }
                        });
                    } else if (sec.type === 'body' && hasScript) {
                        analysis.script.script_lines.forEach(line => {
                            if (line.narration && line.narration.trim()) {
                                const videoSegment = analysis.segments[line.segment_index] || {};
                                segments.push({ 
                                    narration: line.narration.trim(), 
                                    isHook: false, 
                                    video_start: videoSegment.start_time || "00:00.000",
                                    video_end: videoSegment.end_time || "00:00.000",
                                    ...line 
                                });
                            }
                        });
                    }
                });
            }

            const fullScript = segments.map(s => s.narration).join(" ");
            
            const audioBuffer = await generateFullVoiceover(fullScript, voiceId, "Read aloud in a calm, deliberate tone with brisk continuous delivery");
            
            const rawAudioPath = path.join(TEMP_DIR, `raw_audio_${uuidv4()}.pcm`);
            filesToDelete.push(rawAudioPath);
            fs.writeFileSync(rawAudioPath, audioBuffer);
            
            const audioFilename = `audio_${uuidv4()}.wav`;
            const audioPath = path.join(TEMP_DIR, audioFilename);
            filesToDelete.push(audioPath);
            
            try {
                execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${audioPath}"`, { stdio: 'ignore' });
            } catch (e) {
                console.error("FFmpeg PCM Conversion Failed:", e);
                throw new Error("Failed to convert TTS audio");
            }

            const totalAudioDuration = getDurationValue(audioPath);

            // Upload audio to R2
            const audioKey = `demo-audio/${audioFilename}`;
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: audioKey,
                Body: fs.createReadStream(audioPath),
                ContentType: 'audio/wav'
            }));
            audioUrl = `${R2_PUBLIC_URL}/${audioKey}`;

            console.log('--- Transcribing Audio ---');
            const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
            transcription = await aaiClient.transcripts.transcribe({
                audio: audioPath,
                speech_models: ["universal-3-pro", "universal-2"],
                language_detection: true,
            });

            console.log('--- Aligning Segments ---');
            segmentDurations = alignSegmentsWithTranscription(segments, transcription, totalAudioDuration);
            
            if (!segmentDurations) {
                console.log("Transcription alignment failed, falling back to character count.");
                segmentDurations = calculateAudioLineDurations(segments, totalAudioDuration);
            }
        }

        console.log('--- Saving to Database ---');
        await supabase.from('demo_projects').update({
            transcription,
            segments,
            segment_durations: segmentDurations,
            voice_path: audioUrl,
            status: 'ready'
        }).eq('id', projectId);

        console.log(`[Demo Processing] Completed for Project: ${projectId}`);

    } catch (error) {
        console.error(`[Demo Processing] Error for Project ${projectId}:`, error);
        await supabase.from('demo_projects').update({ status: 'failed' }).eq('id', projectId);
        
        // Refund credit
        await supabase.rpc('grant_credits_from_purchase', {
             p_user_id: userId,
             p_credits_to_add: 1,
             p_description: 'Refund: Demo processing failed',
             p_metadata: { error: error.message }
        });
    } finally {
        cleanup(filesToDelete);
    }
}

export async function runDemoExport({ projectId, userId, motionGraphicsEnabled }) {
    console.log(`[Demo Export] Starting for Project: ${projectId}`);
    const filesToDelete = [];
    const workDir = path.join(TEMP_DIR, `demo_export_${uuidv4()}`);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

    try {
        const { data: project } = await supabase.from('demo_projects').select('*').eq('id', projectId).single();
        
        if (!project || !project.voice_path) {
            throw new Error("Missing assets for export");
        }

        // 1. Download Assets
        const audioPath = path.join(workDir, 'audio.wav');
        await downloadFile(project.voice_path, audioPath);

        const videoPath = path.join(workDir, 'source.mp4');
        let hasSourceVideo = false;
        if (project.video_url) {
            await downloadFile(project.video_url, videoPath);
            hasSourceVideo = true;
        }

        const { execSync } = await import('child_process');

        let vw = 1920;
        let vh = 1080;
        if (hasSourceVideo) {
            try {
                const probe = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`).toString().trim();
                const parts = probe.split('x');
                if (parts.length >= 2) {
                    vw = parseInt(parts[0]);
                    vh = parseInt(parts[1]);
                }
            } catch (e) {
                console.error("Failed to probe video dimensions:", e);
            }
        }

        // 2. Process Segments
        const segments = project.segments || [];
        const segmentDurations = project.segment_durations || [];
        const aspectRatio = project.aspect_ratio || '16:9';
        const backgroundType = project.background_type || 'white';
        let projectHookStyleObj = project.hook_style || { style: 'media' }; // Default to media if exists
        if (typeof projectHookStyleObj === 'string') {
            projectHookStyleObj = { style: projectHookStyleObj };
        }
        
        const width = aspectRatio === '9:16' ? 1080 : 1920;
        const height = aspectRatio === '9:16' ? 1920 : 1080;

        // Background generation helper
        const getBackgroundFilter = (bgType, dur) => {
            if (bgType === 'blur' && !hasSourceVideo) bgType = 'black';
            if (bgType === 'white') return `color=c=white:s=${width}x${height}:d=${dur}`;
            if (bgType === 'black') return `color=c=black:s=${width}x${height}:d=${dur}`;
            
            const cols = aspectRatio === '16:9' ? 7 : 4;
            const rows = aspectRatio === '16:9' ? 4 : 7;
            const drawGridWhite = `drawgrid=w=iw/${cols}:h=ih/${rows}:t=3:c=white@0.2`;
            const drawGridGray = `drawgrid=w=iw/${cols}:h=ih/${rows}:t=3:c=#E5E7EB`;

            if (bgType === 'blue') return `color=c=#3B82F6:s=${width}x${height}:d=${dur},${drawGridWhite}`;
            if (bgType === 'purple') return `color=c=#8B5CF6:s=${width}x${height}:d=${dur},${drawGridWhite}`;
            if (bgType === 'green') return `color=c=#10B981:s=${width}x${height}:d=${dur},${drawGridWhite}`;
            if (bgType === 'red') return `color=c=#EF4444:s=${width}x${height}:d=${dur},${drawGridWhite}`;
            if (bgType === 'grid') {
                // Create white background with grid
                return `color=c=white:s=${width}x${height}:d=${dur},${drawGridGray}`;
            }
            if (bgType === 'blur') {
                return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=40:5`;
            }
            return `color=c=white:s=${width}x${height}:d=${dur}`;
        };

        const vt = project.video_transform || {};
        const hookTFallback = vt.hook || vt; // Fallback to flat if nested not found
        const segmentsTFallback = vt.segments || vt; // Fallback to flat if nested not found

        const getTransformParams = (t, vw, vh, targetW, targetH) => {
            const scX = t.scaleX !== undefined ? t.scaleX : (t.scale || 1);
            const scY = t.scaleY !== undefined ? t.scaleY : (t.scale || 1);

            const fitScale = Math.min(targetW / vw, targetH / vh);
            const actualScaleX = fitScale * scX;
            const actualScaleY = fitScale * scY;

            const scaledW = Math.round(vw * actualScaleX);
            const scaledH = Math.round(vh * actualScaleY);

            const centerX = targetW / 2 + (t.x || 0);
            const centerY = targetH / 2 + (t.y || 0);

            const drawX = centerX - scaledW / 2;
            const drawY = centerY - scaledH / 2;

            const sX = Math.round(vw * (t.cropLeft || 0));
            const sY = Math.round(vh * (t.cropTop || 0));
            const sW = Math.round(vw * (1 - (t.cropLeft || 0) - (t.cropRight || 0)));
            const sH = Math.round(vh * (1 - (t.cropTop || 0) - (t.cropBottom || 0)));

            const dX = Math.round(drawX + scaledW * (t.cropLeft || 0));
            const dY = Math.round(drawY + scaledH * (t.cropTop || 0));
            const dW = Math.round(scaledW * (1 - (t.cropLeft || 0) - (t.cropRight || 0)));
            const dH = Math.round(scaledH * (1 - (t.cropTop || 0) - (t.cropBottom || 0)));

            return {
                sX, sY, sW: Math.max(2, sW), sH: Math.max(2, sH),
                dX, dY, dW: Math.max(2, dW), dH: Math.max(2, dH)
            };
        };

        const clipPaths = [];

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            
            let hookT = {};
            if (vt.hooks) {
                hookT = vt.hooks[i] || {};
            } else {
                hookT = hookTFallback;
            }

            let segmentsT = {};
            if (vt.segmentList) {
                segmentsT = vt.segmentList[i] || {};
            } else {
                segmentsT = (vt.segments && !vt.segments.segmentList) ? vt.segments : segmentsTFallback;
            }
            
            const audioDur = segmentDurations[i] || 3;
            const start = parseTime(seg.video_start || "00:00.000");
            const end = parseTime(seg.video_end || "00:00.000");
            let duration = end - start;
            if (duration <= 0) duration = 1; // Fallback

            const finalSegPath = path.join(workDir, `proc_${i}.mp4`);
            
            if (seg.isHook) {
                let hookStyleObj = seg.hook_style || projectHookStyleObj;
                if (typeof hookStyleObj === 'string') {
                    hookStyleObj = { style: hookStyleObj };
                }

                if (hookStyleObj.style === 'media' && hookStyleObj.media) {
                    const ext = hookStyleObj.media.split('.').pop().split('?')[0] || 'mp4';
                    const mediaPath = path.join(workDir, `hook_media_${i}.${ext}`);
                    await downloadFile(hookStyleObj.media, mediaPath);
                    
                    let mw = 1920, mh = 1080;
                    try {
                        const mProbe = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${mediaPath}"`).toString().trim();
                        const mParts = mProbe.split('x');
                        if (mParts.length >= 2) {
                            mw = parseInt(mParts[0]);
                            mh = parseInt(mParts[1]);
                        }
                    } catch (e) {}

                    const hp = getTransformParams(hookT, mw, mh, width, height);

                    if (ext.match(/(jpg|jpeg|png|gif)/i)) {
                        const animation = hookStyleObj.animation || 'none';
                        const bgFilter = getBackgroundFilter(backgroundType, audioDur);
                        let filterStr = `${bgFilter}[bg];[0:v]crop=${hp.sW}:${hp.sH}:${hp.sX}:${hp.sY},scale=${hp.dW}:${hp.dH}[fg];[bg][fg]overlay=x=${hp.dX}:y=${hp.dY}[v]`;
                        
                        if (animation !== 'none') {
                            // ... animation logic ...
                        }
                        
                        execSync(`ffmpeg -loop 1 -i "${mediaPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "${filterStr}" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                    } else {
                        // Video media
                        const mediaDur = getDurationValue(mediaPath);
                        const speedFactor = mediaDur / audioDur;
                        
                        // Check if media has audio
                        let hasAudio = false;
                        try {
                            const probe = execSync(`ffprobe -v error -select_streams a -show_entries stream=codec_type -of default=nw=1:nk=1 "${mediaPath}"`).toString().trim();
                            if (probe === 'audio') hasAudio = true;
                        } catch (e) {}

                        let atempoFilter = '';
                        if (hasAudio) {
                            let s = speedFactor;
                            while (s > 2.0) { atempoFilter += 'atempo=2.0,'; s /= 2.0; }
                            while (s < 0.5) { atempoFilter += 'atempo=0.5,'; s /= 0.5; }
                            atempoFilter += `atempo=${s}`;
                        }

                        const bgFilter = getBackgroundFilter(backgroundType, audioDur);
                        const filterComplex = `${bgFilter}[bg];[0:v]crop=${hp.sW}:${hp.sH}:${hp.sX}:${hp.sY},scale=${hp.dW}:${hp.dH},setpts=PTS*${1/speedFactor}[fg];[bg][fg]overlay=x=${hp.dX}:y=${hp.dY}[v]${hasAudio ? `;[0:a]${atempoFilter}[a]` : ''}`;
                        
                        if (hasAudio) {
                            execSync(`ffmpeg -i "${mediaPath}" -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -y "${finalSegPath}"`, { stdio: 'ignore' });
                        } else {
                            execSync(`ffmpeg -i "${mediaPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "${filterComplex}" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                        }
                    }
                } else {
                    // No hook media, use general background
                    const bgFilter = getBackgroundFilter(backgroundType, audioDur);
                    if (hasSourceVideo) {
                        const hp = getTransformParams(hookT, vw, vh, width, height);
                        const filterComplex = `${bgFilter}[bg];[0:v]trim=start=${start}:duration=0.1,crop=${hp.sW}:${hp.sH}:${hp.sX}:${hp.sY},scale=${hp.dW}:${hp.dH}[fg];[bg][fg]overlay=x=${hp.dX}:y=${hp.dY}[v]`;
                        execSync(`ffmpeg -i "${videoPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "${filterComplex}" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                    } else {
                        const filterComplex = `${bgFilter}[v]`;
                        execSync(`ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "${filterComplex}" -map "[v]" -map 0:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                    }
                }
            } else {
                // Normal segment
                const sp = getTransformParams(segmentsT, vw, vh, width, height);
                const rawSegPath = path.join(workDir, `raw_${i}.mp4`);
                const bgFilter = getBackgroundFilter(backgroundType, duration);
                const filterComplex = `${bgFilter}[bg];[0:v]crop=${sp.sW}:${sp.sH}:${sp.sX}:${sp.sY},scale=${sp.dW}:${sp.dH}[fg];[bg][fg]overlay=x=${sp.dX}:y=${sp.dY}[v]`;
                execSync(`ffmpeg -ss ${start} -t ${duration} -i "${videoPath}" -filter_complex "${filterComplex}" -map "[v]" -c:v libx264 -preset fast -crf 23 -an -y "${rawSegPath}"`, { stdio: 'ignore' });
                
                const visualDur = getDurationValue(rawSegPath);
                const timeDiff = audioDur - visualDur;

                if (timeDiff > 0.02) {
                    // Freeze last frame
                    execSync(`ffmpeg -i "${rawSegPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${timeDiff.toFixed(3)}[v]" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                } else {
                    // Speed up
                    const speedFactor = visualDur / audioDur;
                    if (speedFactor > 1.001) {
                        execSync(`ffmpeg -i "${rawSegPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "[0:v]setpts=PTS*${1/speedFactor}[v]" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                    } else {
                        execSync(`ffmpeg -i "${rawSegPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -map 0:v -map 1:a -t ${audioDur} -c:v copy -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                    }
                }
            }
            clipPaths.push(finalSegPath);
        }

        // 3. Concatenate Clips
        const listPath = path.join(workDir, 'files.txt');
        fs.writeFileSync(listPath, clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        
        const visualPath = path.join(workDir, 'visual_sequence.mp4');
        execSync(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${visualPath}"`, { stdio: 'ignore' });

        // 4. Merge Audio
        const mergedPath = path.join(workDir, 'merged.mp4');
        // Use only the TTS audio (voiceover)
        execSync(`ffmpeg -i "${visualPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -y "${mergedPath}"`, { stdio: 'ignore' });

        // 5. Build Final Video with Overlays
        let currentPath = mergedPath;

        if (motionGraphicsEnabled && project.script_breakdown && project.transcription) {
            const { generateMotionGraphicsWaitlet } = await import('./remotion.js');
            const mgOverlayPath = await generateMotionGraphicsWaitlet(
                project.script_breakdown, 
                project.transcription, 
                width, Math.max(height, 2), // ensure even numbers
                workDir,
                audioDur
            );
            
            const mgBurnedPath = path.join(workDir, `mg_burned.mp4`);
            // Overlay using green screen chromakey
            execSync(`ffmpeg -i "${currentPath}" -i "${mgOverlayPath}" -filter_complex "[1:v]colorkey=0x00FF00:0.05:0.1[ckout];[0:v][ckout]overlay=shortest=1[v]" -map "[v]" -map 0:a -c:v libx264 -preset fast -crf 18 -c:a copy -y "${mgBurnedPath}"`, { stdio: 'ignore' });
            currentPath = mgBurnedPath;
        }

        // 6. Burn Traditional Subtitles (if enabled, shouldn't mix well, but allowed)
        const subtitleState = project.subtitle_state || 'enabled';
        if (!motionGraphicsEnabled && subtitleState === 'enabled' && project.subtitles && project.subtitles !== 'none' && project.transcription) {
            let subConfig = project.subtitles;
            if (typeof subConfig === 'string') {
                try {
                    subConfig = JSON.parse(subConfig);
                } catch (e) {
                    console.error("[Demo Export] Failed to parse subtitle config:", e);
                }
            }

            const { generateSubtitles, burnSubtitles } = await import('../subtitle-generator.js');
            const assContent = await generateSubtitles(project.transcription, subConfig, aspectRatio);
            if (assContent) {
                const assPath = path.join(workDir, `subtitles.ass`);
                fs.writeFileSync(assPath, assContent);
                
                const burnedPath = path.join(workDir, `burned.mp4`);
                await burnSubtitles(currentPath, assPath, burnedPath);
                currentPath = burnedPath;
            }
        }
        
        let finalPath = currentPath;

        // 6. Upload Final Video
        const finalBuffer = fs.readFileSync(finalPath);
        const finalKey = `content/stories/${uuidv4()}.mp4`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: finalKey,
            Body: finalBuffer,
            ContentType: 'video/mp4'
        }));
        const videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;

        // 7. Update Story Entry
        const { data: story, error: storyError } = await supabase.from('content_stories').update({
            video_url: videoUrl,
            status: 'completed'
        }).eq('demo_project_id', projectId).select().single();

        if (storyError) {
            console.error("Failed to update story:", storyError);
            // Fallback: try to insert if update failed for some reason
            await supabase.from('content_stories').insert({
                user_id: userId,
                demo_project_id: projectId,
                video_url: videoUrl,
                status: 'completed'
            });
        }

        await supabase.from('demo_projects').update({ status: 'ready' }).eq('id', projectId);
        
        console.log(`[Demo Export] Completed for Project: ${projectId}`);
    } catch (error) {
        console.error(`[Demo Export] Error for Project ${projectId}:`, error);
        await supabase.from('demo_projects').update({ status: 'failed' }).eq('id', projectId);
        await supabase.from('content_stories').update({ status: 'failed' }).eq('demo_project_id', projectId);
    } finally {
        cleanup(filesToDelete);
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    }
}
