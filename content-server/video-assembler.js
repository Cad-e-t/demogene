
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', args);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
            if (code === 0) resolve();
            else {
                console.error("FFmpeg Error:", stderr);
                reject(new Error(`FFmpeg failed with code ${code}`));
            }
        });
    });
}


function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
        let out = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.on('close', code => {
            if (code === 0) resolve(parseFloat(out.trim()) || 4.0);
            else resolve(4.0); // fallback if it fails
        });
    });
}


function hasAudio(filePath) {
    return new Promise((resolve) => {
        const proc = spawn('ffprobe', ['-v', '-8', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
        let out = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.on('close', code => {
            if (code === 0 && out.trim() !== '') resolve(true);
            else resolve(false);
        });
    });
}


function getFilterForEffect(effectType, width, height, frames, startFrame = 0, isVideo = false) {
    // Zoom/Pan expressions for ffmpeg zoompan filter
    // d = duration in frames
    // s = output size
    // z = zoom factor per frame
    // x, y = top-left corner of the crop window
    
    // For videos, zoompan shouldn't duplicate frames, so d=1, but we still calculate progress by 'on/frames'
    const dParam = isVideo ? 1 : frames;

    switch (effectType) {
        case 'zoom_in':
            // Faster: Zoom from 1.0 to 1.8
            return `zoompan=z='min(1.0+(on/${frames})*0.8,1.8)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;
        
        case 'zoom_out':
            // Faster: Start at 1.8, zoom out to 1.0
            return `zoompan=z='max(1.8-(on/${frames})*0.8,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

        case 'slow_zoom_in':
             // Cinematic: Continuous push-in.
             return `zoompan=z='min(1.0+(on/${frames})*0.15,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

        case 'cinematic_drift':
            return `zoompan=z='1.1':x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

        case 'doc_push':
            return `zoompan=z='min(1.0+(on/${frames})*0.1,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

        case 'organic_float':
            // Matches React: scale = 1.05 + 0.03*sin(prog*2PI), floatX = (iw/zoom/60)*sin(prog*PI)
            return `zoompan=z='1.05+(0.03*sin(on/${frames}*2*PI))':x='iw/2-(iw/zoom/2)+(iw/zoom/60)*sin(on/${frames}*PI)':y='ih/2-(ih/zoom/2)+(ih/zoom/80)*cos(on/${frames}*PI)':d=${dParam}:s=${width}x${height}`;

        case 'dolly_reveal':
            return `zoompan=z='max(1.15-(on/${frames})*0.15,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

        case 'slide_left':
            return `zoompan=z='1.15':x='(1-on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;
        case 'slide_right':
            return `zoompan=z='1.15':x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;
        case 'slide_up':
            return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(1-on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;
        case 'slide_down':
            return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;
        case 'slide_up_left':
            return `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;
        case 'slide_up_right':
            return `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;
        case 'slide_down_left':
            return `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;
        case 'slide_down_right':
            return `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${dParam}:s=${width}x${height}`;

        case 'none':
            return `scale=${width}x${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

        default:
            // Minimal movement to prevent static boredom, or true static
            return `scale=${width}x${height}`;
    }
}

const EFFECT_SEQUENCES = {
    'none': ['none'],
    'cinematic': ['slow_zoom_in'],
    'documentary': ['doc_push', 'cinematic_drift', 'none', 'doc_push'],
    'immersive': ['organic_float', 'dolly_reveal', 'organic_float'],
    'storyteller': ['dolly_reveal', 'doc_push', 'cinematic_drift'],
    'minimalist': ['none', 'doc_push', 'none']
};

export async function assembleVideo(segments, audioPath, audioDurations, workDir, aspectRatio, effectPreset, quality = '1080p', onProgress) {
    // Set resolution based on quality
    let width, height;
    if (quality === '720p') {
        width = aspectRatio === '9:16' ? 720 : 1280;
        height = aspectRatio === '9:16' ? 1280 : 720;
    } else {
        width = aspectRatio === '9:16' ? 1080 : 1920;
        height = aspectRatio === '9:16' ? 1920 : 1080;
    }
    
    // Use the effect array directly from the database. 
    // If it's a string, attempt to parse it first.
    let parsedEffect = effectPreset;
    if (typeof effectPreset === 'string') {
        // Check if it's a preset ID
        if (EFFECT_SEQUENCES[effectPreset]) {
            parsedEffect = EFFECT_SEQUENCES[effectPreset];
        } else {
            try {
                parsedEffect = JSON.parse(effectPreset);
            } catch (e) {
                // Ignore parse errors
            }
        }
    }
    
    // If it's not an array (legacy or missing), fallback.
    const defaultSequenceKey = aspectRatio === '16:9' ? 'documentary' : 'cinematic';
    const sequence = Array.isArray(parsedEffect) ? parsedEffect : EFFECT_SEQUENCES[defaultSequenceKey];

    // Pre-calculate segments data
    const segmentData = [];
    let currentStartFrame = 0;
    let accumulatedTime = 0;
    const audioClips = []; // Store extracted native audio clips
    
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const originalDuration = audioDurations[i] !== undefined ? audioDurations[i] : 3; // Fallback duration

        if (originalDuration === 0) {
            console.log(`[Video Assembler] Skipping segment ${i} because its duration is 0.`);
            continue;
        }
        
        // Exact frame calculation to prevent A/V drift over multiple clips
        const nextAccumulatedTime = accumulatedTime + originalDuration;
        const startFrame = Math.round(accumulatedTime * 30);
        const endFrame = Math.round(nextAccumulatedTime * 30);
        const exactFrames = endFrame - startFrame;
        const duration = exactFrames / 30; // Truncated to exact frames
        const startTimeMs = Math.round(accumulatedTime * 1000);
        
        segmentData.push({
            i, seg, exactFrames, duration, startTimeMs, currentStartFrame
        });
        
        accumulatedTime = nextAccumulatedTime;
        currentStartFrame += exactFrames;
    }

    // 1. Create video clips from images in batches
    const BATCH_SIZE = 25;
    const intermediateBatchPaths = [];
    let completedCount = 0;

    for (let batchIdx = 0; batchIdx < segmentData.length; batchIdx += BATCH_SIZE) {
        const batch = segmentData.slice(batchIdx, batchIdx + BATCH_SIZE);
        const batchClipPaths = [];

        for (const data of batch) {
            const { i, seg, exactFrames, duration, startTimeMs, currentStartFrame: segStartFrame } = data;
            
            const imagePath = path.join(workDir, `img_${i}.png`);
            const clipPath = path.join(workDir, `clip_${i}.ts`);
            
            const hasImage = fs.existsSync(imagePath);
            const isVideo = hasImage && seg.image_url && seg.image_url.toLowerCase().endsWith('.mp4');

            const frames = exactFrames + 10; // +10 buffer
            
            // Determine effect for this segment
            const effectType = sequence[i % sequence.length];
            
            let filter = "";
            
            // Pre-scale input image to avoid massive scaling in zoompan if image is huge
            // We'll scale to 2x target resolution to keep quality during zoom
            const inputScale = `scale=${width*2}:-1`; 
            
            const effectFilter = getFilterForEffect(effectType, width, height, frames, segStartFrame, isVideo);
            
            // Standardize fps
            const fpsFilter = `fps=30`;
            const vignetteFilter = `split[base][vignetted];[vignetted]vignette=angle='PI/10':x0=w/2:y0=h/2[vignetted];[vignetted][base]blend=all_opacity=0.1`;
            
            let setptsFilter = '';
            let inputArgs = [];
            let mapArgs = [];
            let hasAudioStream = false;
            let afFilter = '';

            if (!hasImage) {
                inputArgs = ['-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=30:d=${duration}`];
                filter = `setsar=1`; 
                mapArgs = ['-map', '0:v:0'];
            } else if (isVideo) {
                // Speed manipulation mapping to the segment duration 
                // Using (PTS-STARTPTS) is CRITICAL to prevent massive sync gaps/drifts during concat
                const sourceDuration = await getVideoDuration(imagePath);
                hasAudioStream = await hasAudio(imagePath);
                
                setptsFilter = `setpts=(${duration}/${Math.max(0.1, sourceDuration)})*(PTS-STARTPTS),`;
                
                inputArgs = ['-i', imagePath];
                
                if (hasAudioStream) {
                    afFilter = 'aresample=48000,volume=0.15';
                    const tempo = sourceDuration / duration;
                    if (tempo >= 0.5 && tempo <= 2.0) {
                        afFilter += `,atempo=${tempo}`;
                    } else if (tempo < 0.5) {
                        afFilter += `,atempo=0.5,atempo=${tempo/0.5}`;
                    } else {
                        afFilter += `,atempo=2.0,atempo=${tempo/2.0}`;
                    }
                }

                filter = `${setptsFilter}${fpsFilter},${inputScale},${effectFilter},setsar=1,${vignetteFilter}`;
                mapArgs = ['-map', '0:v:0'];
            } else {
                inputArgs = ['-loop', '1', '-i', imagePath];
                filter = `${inputScale},${effectFilter},${fpsFilter},setsar=1,${vignetteFilter}`;
                mapArgs = ['-map', '0:v:0'];
            }

            await runFFmpeg([
                ...inputArgs,
                '-vf', filter,
                ...mapArgs,
                '-c:v', 'libx264', 
                '-crf', '18', // Optimal High Quality balance (prevents file bloat)
                '-preset', 'fast',
                '-tune', 'film', // Better texture retention
                '-an', // NO AUDIO in the video clip
                '-t', duration.toString(), 
                '-frames:v', exactFrames.toString(),
                '-r', '30', // Explicitly force 30fps container frame rate
                '-video_track_timescale', '90000', // Unify timebases for clean concat
                '-pix_fmt', 'yuv420p',
                '-y', clipPath
            ]);
            
            batchClipPaths.push(clipPath);

            if (isVideo && hasAudioStream) {
                const audioClipPath = path.join(workDir, `audio_${i}.wav`);
                await runFFmpeg([
                    '-i', imagePath,
                    '-vn',
                    '-map', '0:a:0',
                    '-af', afFilter,
                    '-c:a', 'pcm_s16le',
                    '-ar', '48000',
                    '-ac', '2',
                    '-t', duration.toString(),
                    '-y', audioClipPath
                ]);
                audioClips.push({ path: audioClipPath, startTimeMs });
            }

            completedCount++;
            if (onProgress) {
                // Allocate 70% of total progress to creating clips
                const progress = Math.round((completedCount / segments.length) * 70);
                onProgress({ stage: `Processing video clips (${completedCount}/${segments.length})...`, progress });
            }
        }

        // Concatenate this batch to save disk space & memory
        const batchListPath = path.join(workDir, `batch_${batchIdx}_files.txt`);
        const fileContent = batchClipPaths.map(p => `file '${p}'`).join('\n');
        fs.writeFileSync(batchListPath, fileContent);
        
        const batchOutputPath = path.join(workDir, `batch_out_${batchIdx}.ts`);
        await runFFmpeg([
            '-f', 'concat', '-safe', '0', '-i', batchListPath,
            '-c', 'copy', '-y', batchOutputPath
        ]);
        
        intermediateBatchPaths.push(batchOutputPath);

        // CLEANUP: Remove individual clips and source images to free tmpfs (RAM)
        for (const p of batchClipPaths) {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        if (fs.existsSync(batchListPath)) fs.unlinkSync(batchListPath);
        
        for (const data of batch) {
            const imgP = path.join(workDir, `img_${data.i}.png`);
            if (fs.existsSync(imgP)) fs.unlinkSync(imgP);
        }
    }

    // 2. Concatenate Intermediate Batches (Visual Only)
    if (onProgress) {
        onProgress({ stage: 'Stitching intermediate batches...', progress: 75 });
    }

    const finalVisualListPath = path.join(workDir, 'final_batches.txt');
    const finalVisualContent = intermediateBatchPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(finalVisualListPath, finalVisualContent);

    const visualPath = path.join(workDir, 'visual_no_audio.mp4');
    await runFFmpeg([
        '-f', 'concat', '-safe', '0', '-i', finalVisualListPath,
        '-c', 'copy', '-y', visualPath
    ]);

    // Clean up intermediate batches
    for (const p of intermediateBatchPaths) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (fs.existsSync(finalVisualListPath)) fs.unlinkSync(finalVisualListPath);
    
    if (onProgress) {
        onProgress({ stage: 'Stitching video together...', progress: 85 });
    }

    // 3. Merge with Audio and Normalize Loudness
    const finalPath = path.join(workDir, `final_${uuidv4()}.mp4`);
    
    // Mix native audio (if any) with voiceover (audioPath)
    let mixArgs = [
        '-i', visualPath,
        '-i', audioPath
    ];
    
    let filterComplex = '';
    const numMixInputs = 1 + audioClips.length; // 1 for voiceover, plus native clips
    
    // Normalize voiceover first
    filterComplex += `[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[vo];`;
    
    let mixSources = '[vo]';
    
    audioClips.forEach((ac, idx) => {
        const inputIdx = idx + 2; // offset by 2 (0=video, 1=vo)
        mixArgs.push('-i', ac.path);
        
        // adelay filter requires delays for all channels
        const delayStr = `${ac.startTimeMs}|${ac.startTimeMs}`;
        filterComplex += `[${inputIdx}:a]adelay=${delayStr}[a${inputIdx}];`;
        mixSources += `[a${inputIdx}]`;
    });
    
    if (audioClips.length > 0) {
        // duration=first ensures the mixed audio matches voiceover length
        filterComplex += `${mixSources}amix=inputs=${numMixInputs}:duration=first:dropout_transition=0[mixed];[mixed]volume=2[aout]`;
    } else {
        filterComplex += `[vo]volume=2[aout]`;
    }

    await runFFmpeg([
        ...mixArgs,
        '-filter_complex', filterComplex,
        '-map', '0:v:0',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', 
        '-b:a', '192k',
        '-shortest',
        '-y', finalPath
    ]);
    
    if (onProgress) {
        onProgress({ stage: 'Adding final touches...', progress: 100 });
    }

    return finalPath;
}