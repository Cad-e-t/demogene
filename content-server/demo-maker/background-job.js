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
    const { projectId, sourceVideoUrl, hookText, bodyText, voiceId, hookStyle, userId } = jobData;
    const filesToDelete = [];

    console.log(`[Demo Processing] Starting for Project: ${projectId}`);

    try {
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
        const analysis = await analyzeVideo(cleanFileBase64, 'video/mp4', prompt); 
        console.log('Analysis complete.');

        let segments = [];
        let transcription = null;
        let segmentDurations = [];
        let audioUrl = null;

        const hasScript = analysis.script && analysis.script.script_lines && analysis.script.script_lines.length > 0;

        if (hasScript) {
            console.log('--- Generating Voiceover ---');
            
            // Prepare segments list
            if (hookText && hookText.trim()) {
                segments.push({ narration: hookText.trim(), isHook: true, video_start: "00:00.000", video_end: "00:00.000" });
            }
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
                speech_models: ["universal-2"],
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

export async function runDemoExport({ projectId, userId }) {
    console.log(`[Demo Export] Starting for Project: ${projectId}`);
    const filesToDelete = [];
    const workDir = path.join(TEMP_DIR, `demo_export_${uuidv4()}`);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

    try {
        const { data: project } = await supabase.from('demo_projects').select('*').eq('id', projectId).single();
        
        if (!project || !project.voice_path || !project.video_url) {
            throw new Error("Missing assets for export");
        }

        // 1. Download Assets
        const audioPath = path.join(workDir, 'audio.wav');
        await downloadFile(project.voice_path, audioPath);

        const videoPath = path.join(workDir, 'source.mp4');
        await downloadFile(project.video_url, videoPath);

        // 2. Process Segments
        const segments = project.segments || [];
        const segmentDurations = project.segment_durations || [];
        const aspectRatio = project.aspect_ratio || '16:9';
        let hookStyleObj = project.hook_style || { style: 'blur' };
        if (typeof hookStyleObj === 'string') {
            hookStyleObj = { style: hookStyleObj === 'blurred' ? 'blur' : hookStyleObj };
        }
        
        const width = aspectRatio === '9:16' ? 1080 : 1920;
        const height = aspectRatio === '9:16' ? 1920 : 1080;

        const clipPaths = [];
        const { execSync } = await import('child_process');

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const audioDur = segmentDurations[i] || 3;
            const start = parseTime(seg.video_start || "00:00.000");
            const end = parseTime(seg.video_end || "00:00.000");
            let duration = end - start;
            if (duration <= 0) duration = 1; // Fallback

            const finalSegPath = path.join(workDir, `proc_${i}.mp4`);
            
            if (seg.isHook) {
                if (hookStyleObj.style === 'white' || hookStyleObj.style === 'black') {
                    const color = hookStyleObj.style;
                    execSync(`ffmpeg -f lavfi -i color=c=${color}:s=${width}x${height}:d=${audioDur} -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                } else if (hookStyleObj.style === 'media' && hookStyleObj.media) {
                    const ext = hookStyleObj.media.split('.').pop().split('?')[0] || 'mp4';
                    const mediaPath = path.join(workDir, `hook_media_${i}.${ext}`);
                    await downloadFile(hookStyleObj.media, mediaPath);
                    
                    if (ext.match(/(jpg|jpeg|png|gif)/i)) {
                        const animation = hookStyleObj.animation || 'none';
                        let filterStr = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black[v]`;
                        
                        if (animation !== 'none') {
                            // We need to scale to fill first for zoompan
                            const frames = Math.ceil(audioDur * 30);
                            const stepIn = (0.5 / frames).toFixed(6);
                            const stepOut = (0.5 / frames).toFixed(6);
                            const stepCinematic = (0.4 / frames).toFixed(6);
                            const stepHandheld = (0.2 / frames).toFixed(6);
                            
                            let zoompan = '';
                            switch (animation) {
                                case 'zoom_in':
                                    zoompan = `zoompan=z='min(zoom+${stepIn},1.8)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'zoom_out':
                                    zoompan = `zoompan=z='if(eq(on,1),1.8,max(1.001,zoom-${stepOut}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slow_zoom_in':
                                    zoompan = `zoompan=z='min(zoom+${stepCinematic},1.4)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_left':
                                    zoompan = `zoompan=z='1.15':x='(1-on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_right':
                                    zoompan = `zoompan=z='1.15':x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_up':
                                    zoompan = `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_down':
                                    zoompan = `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_up_left':
                                    zoompan = `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_up_right':
                                    zoompan = `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_down_left':
                                    zoompan = `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'slide_down_right':
                                    zoompan = `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
                                    break;
                                case 'handheld_walk':
                                    const driftX = `(iw/zoom/30)*sin(on/20)`;
                                    const driftY = `(ih/zoom/40)*cos(on/20)`;
                                    zoompan = `zoompan=z='if(eq(on,0),1.1,min(zoom+${stepHandheld},1.3))':x='iw/2-(iw/zoom/2)+${driftX}':y='ih/2-(ih/zoom/2)+${driftY}':d=${frames}:s=${width}x${height}`;
                                    break;
                            }
                            
                            if (zoompan) {
                                filterStr = `[0:v]scale=${width*2}:-1,${zoompan},fps=30[v]`;
                            }
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

                        if (hasAudio) {
                            execSync(`ffmpeg -i "${mediaPath}" -filter_complex "[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setpts=PTS*${1/speedFactor}[v];[0:a]${atempoFilter}[a]" -map "[v]" -map "[a]" -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -y "${finalSegPath}"`, { stdio: 'ignore' });
                        } else {
                            execSync(`ffmpeg -i "${mediaPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setpts=PTS*${1/speedFactor}[v]" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                        }
                    }
                } else {
                    // Blurred background (first frame of source video)
                    execSync(`ffmpeg -i "${videoPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -filter_complex "[0:v]trim=start=${start}:duration=0.1,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:5[bg];[0:v]trim=start=${start}:duration=0.1,scale=${width}:${height}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]" -map "[v]" -map 1:a -t ${audioDur} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -y "${finalSegPath}"`, { stdio: 'ignore' });
                }
            } else {
                // Normal segment
                const rawSegPath = path.join(workDir, `raw_${i}.mp4`);
                execSync(`ffmpeg -ss ${start} -t ${duration} -i "${videoPath}" -filter_complex "[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black[v]" -map "[v]" -c:v libx264 -preset fast -crf 23 -an -y "${rawSegPath}"`, { stdio: 'ignore' });
                
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
        // Mix the visual sequence audio (hook audio + silence) with the TTS audio
        execSync(`ffmpeg -i "${visualPath}" -i "${audioPath}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest[a];[a]volume=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -y "${mergedPath}"`, { stdio: 'ignore' });

        let finalPath = mergedPath;

        // 5. Burn Subtitles
        const subtitleState = project.subtitle_state || 'enabled';
        if (subtitleState === 'enabled' && project.subtitles && project.subtitles !== 'none' && project.transcription) {
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
                await burnSubtitles(mergedPath, assPath, burnedPath);
                finalPath = burnedPath;
            }
        }

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
