
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
        const proc = spawn('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
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
             return `zoompan=z='min(1.0+(on/${frames})*0.4,1.4)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dParam}:s=${width}x${height}`;

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

        case 'handheld_walk':
            const globalFrame = `(on+${startFrame})`;
            const driftX = `(iw/zoom/30)*sin(${globalFrame}/20)`;
            const driftY = `(ih/zoom/40)*cos(${globalFrame}/20)`;
            return `zoompan=z='min(1.1+(on/${frames})*0.2,1.3)':x='iw/2-(iw/zoom/2)+${driftX}':y='ih/2-(ih/zoom/2)+${driftY}':d=${dParam}:s=${width}x${height}`;

        case 'none':
            return `scale=${width}x${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

        default:
            // Minimal movement to prevent static boredom, or true static
            return `scale=${width}x${height}`;
    }
}

const EFFECT_SEQUENCES = {
    'none': ['none'],
    'zoom_pulse': ['zoom_in', 'zoom_out'],
    'slide_flow': ['slide_down', 'slide_right', 'slide_up', 'slide_left', 'slide_up_left', 'slide_up_right', 'slide_down_left', 'slide_down_right'],
    'cinematic': ['slow_zoom_in'],
    'chaos': ['zoom_in', 'slide_left', 'zoom_out', 'slide_right', 'slide_up'],
    'handheld_walk': ['handheld_walk', 'slide_down', 'handheld_walk', 'zoom_out', 'handheld_walk' ],
    'documentary': ['doc_push', 'cinematic_drift', 'none', 'doc_push'],
    'immersive': ['organic_float', 'dolly_reveal', 'organic_float'],
    'storyteller': ['dolly_reveal', 'doc_push', 'cinematic_drift'],
    'minimalist': ['none', 'doc_push', 'none']
};

export async function assembleVideo(segments, audioPath, audioDurations, workDir, aspectRatio, effectPreset, quality = '1080p') {
    // 1. Create video clips from images with zoom effect
    const clipPaths = [];
    
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
    
    // If it's not an array (legacy or missing), fallback to a simple zoom_in for all segments.
    const sequence = Array.isArray(parsedEffect) ? parsedEffect : ['zoom_in'];

    let currentStartFrame = 0;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const duration = audioDurations[i] || 3; // Fallback duration
        const imagePath = path.join(workDir, `img_${i}.png`);
        const clipPath = path.join(workDir, `clip_${i}.mp4`);
        
        const isVideo = seg.image_url && seg.image_url.toLowerCase().endsWith('.mp4');

        const frames = Math.ceil(duration * 30) + 10; // +10 buffer
        
        // Determine effect for this segment
        const effectType = sequence[i % sequence.length];
        
        let filter = "";
        
        // Pre-scale input image to avoid massive scaling in zoompan if image is huge
        // We'll scale to 2x target resolution to keep quality during zoom
        const inputScale = `scale=${width*2}:-1`; 
        
        const effectFilter = getFilterForEffect(effectType, width, height, frames, currentStartFrame, isVideo);
        
        // Standardize fps
        const fpsFilter = `fps=30`;

        const vignetteFilter = `split[base][vignetted];[vignetted]vignette=angle='PI/10':x0=w/2:y0=h/2[vignetted];[vignetted][base]blend=all_opacity=0.1`;
        
        let setptsFilter = '';
        let inputArgs = [];
        let mapArgs = [];

        if (isVideo) {
            // Speed manipulation mapping to the segment duration 
            // Using (PTS-STARTPTS) is CRITICAL to prevent massive sync gaps/drifts during concat
            const sourceDuration = await getVideoDuration(imagePath);
            const hasAudioStream = await hasAudio(imagePath);
            
            setptsFilter = `setpts=(${duration}/${Math.max(0.1, sourceDuration)})*(PTS-STARTPTS),`;
            
            let audioInputArgs = hasAudioStream ? [] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
            inputArgs = ['-i', imagePath, ...audioInputArgs];
            
            let afFilter = 'aresample=48000';
            if (hasAudioStream) {
                const tempo = sourceDuration / duration;
                if (tempo >= 0.5 && tempo <= 2.0) {
                    afFilter += `,atempo=${tempo}`;
                }
            }

            filter = `${setptsFilter}${fpsFilter},${inputScale},${effectFilter},setsar=1,${vignetteFilter}`;
            mapArgs = hasAudioStream ? ['-map', '0:v', '-map', '0:a', '-af', afFilter] : ['-map', '0:v', '-map', '1:a', '-af', afFilter];
        } else {
            inputArgs = ['-loop', '1', '-i', imagePath, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
            filter = `${inputScale},${effectFilter},${fpsFilter},setsar=1,${vignetteFilter}`;
            mapArgs = ['-map', '0:v', '-map', '1:a', '-af', 'aresample=48000'];
        }

        await runFFmpeg([
            ...inputArgs,
            '-vf', filter,
            ...mapArgs,
            '-c:v', 'libx264', 
            '-crf', '18', // Optimal High Quality balance (prevents file bloat)
            '-preset', 'fast',
            '-tune', 'film', // Better texture retention
            '-c:a', 'aac',
            '-ac', '2',
            '-ar', '48000',
            '-t', duration.toString(), 
            '-r', '30', // Explicitly force 30fps container frame rate
            '-video_track_timescale', '90000', // Unify timebases for clean concat
            '-pix_fmt', 'yuv420p',
            '-y', clipPath
        ]);
        
        clipPaths.push(clipPath);
        currentStartFrame += Math.round(duration * 30);
    }

    // 2. Concatenate Clips
    const listPath = path.join(workDir, 'files.txt');
    const fileContent = clipPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, fileContent);
    
    const visualPath = path.join(workDir, 'visual_no_audio.mp4');
    await runFFmpeg([
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c', 'copy', '-y', visualPath
    ]);

    // 3. Merge with Audio and Normalize Loudness
    const finalPath = path.join(workDir, `final_${uuidv4()}.mp4`);
    
    // Mix native audio (visualPath) with voiceover (audioPath)
    // Reduce volume of native audio to act as background noise
    await runFFmpeg([
        '-i', visualPath,
        '-i', audioPath,
        '-filter_complex', '[0:a]volume=0.3[v_vol]; [v_vol][1:a]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=-16:TP=-1.5:LRA=11[a]',
        '-map', '0:v:0',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac', 
        '-b:a', '192k',
        '-shortest',
        '-y', finalPath
    ]);

    return finalPath;
}
