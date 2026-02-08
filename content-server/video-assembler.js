
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

const EFFECT_SEQUENCES = {
    'zoom_pulse': ['zoom_in', 'zoom_out'],
    'slide_flow': ['slide_left', 'slide_right'],
    'cinematic': ['slow_zoom_in'],
    'chaos': ['zoom_in', 'slide_left', 'zoom_out', 'slide_right', 'hard_cut'],
    'handheld_walk': ['handheld_walk']
};

function getFilterForEffect(effectType, width, height, frames) {
    // Zoom/Pan expressions for ffmpeg zoompan filter
    // d = duration in frames
    // s = output size
    // z = zoom factor per frame
    // x, y = top-left corner of the crop window
    
    switch (effectType) {
        case 'zoom_in':
            // Balanced: Zoom from 1.0 to 1.5
            // Speed 0.0025/frame provides clearly noticeable but smooth motion.
            return `zoompan=z='min(zoom+0.0025,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
        
        case 'zoom_out':
            // Balanced: Start at 1.5, zoom out to 1.0
            // Matches zoom_in speed for symmetry.
            return `zoompan=z='if(eq(on,1),1.5,max(1.001,zoom-0.0025))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'slow_zoom_in':
             // Cinematic: subtle but continuous push-in. Max 1.25 to stay grounded.
             return `zoompan=z='min(zoom+0.0015,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'slide_left':
            // Zoom at 1.25 allows good context while enabling lateral movement.
            return `zoompan=z='1.25':x='(1-on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'slide_right':
            // Zoom at 1.25 allows good context while enabling lateral movement.
            return `zoompan=z='1.25':x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'handheld_walk':
            // Simulates holding a camera while walking with subtle shake.
            // Z: Starts at 1.1 for minimal crop (overscan), zooms in at 0.0015/frame (matching cinematic style).
            // X: Combination of slow drift (on/40) and faster walking sway (on/4).
            // Y: Combination of slow bob (on/50) and faster walking step (on/5).
            return `zoompan=z='if(eq(on,0),1.1,min(zoom+0.0015,1.35))':x='iw/2-(iw/zoom/2)+(iw/zoom/40)*sin(on/40)+(iw/zoom/120)*sin(on/4)':y='ih/2-(ih/zoom/2)+(ih/zoom/50)*cos(on/50)+(ih/zoom/140)*cos(on/5)':d=${frames}:s=${width}x${height}`;

        case 'static':
        default:
            // Minimal movement to prevent static boredom, or true static
            return `scale=${width}x${height}`;
    }
}

export async function assembleVideo(segments, audioPath, audioDurations, workDir, aspectRatio, effectPreset = 'zoom_pulse') {
    // 1. Create video clips from images with zoom effect
    const clipPaths = [];
    const width = aspectRatio === '9:16' ? 720 : 1280;
    const height = aspectRatio === '9:16' ? 1280 : 720;
    
    // Get sequence for the chosen preset
    const sequence = EFFECT_SEQUENCES[effectPreset] || EFFECT_SEQUENCES['zoom_pulse'];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const duration = audioDurations[i] || 3; // Fallback duration
        const imagePath = path.join(workDir, `img_${i}.png`);
        const clipPath = path.join(workDir, `clip_${i}.mp4`);
        
        const frames = Math.ceil(duration * 30) + 10; // +10 buffer
        
        // Determine effect for this segment
        const effectType = sequence[i % sequence.length];
        
        let filter = "";
        
        // Pre-scale input image to avoid massive scaling in zoompan if image is huge
        // We'll scale to 2x target resolution to keep quality during zoom
        const inputScale = `scale=${width*2}:-1`; 
        
        const effectFilter = getFilterForEffect(effectType, width, height, frames);
        
        // Standardize fps
        const fpsFilter = `fps=30`;

        if (effectType === 'static') {
             // For static, we just scale to fit
             filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,${fpsFilter}`;
        } else {
             // Chain filters: Scale Input -> Effect (ZoomPan) -> Output
             // Note: Zoompan output resolution is set in the function
             filter = `${inputScale},${effectFilter},${fpsFilter},setsar=1`;
        }

        await runFFmpeg([
            '-loop', '1',
            '-i', imagePath,
            '-vf', filter,
            '-c:v', 'libx264', '-t', duration.toString(), '-pix_fmt', 'yuv420p',
            '-y', clipPath
        ]);
        
        clipPaths.push(clipPath);
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
    
    // Using loudnorm to target -16 LUFS (Integrated) which is a safe, loud standard for mobile/social
    // TP (True Peak) -1.5dB to prevent clipping during transcoding by platforms
    // LRA (Loudness Range) 11 for natural speech dynamics
    await runFFmpeg([
        '-i', visualPath,
        '-i', audioPath,
        '-c:v', 'copy', 
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', 
        '-c:a', 'aac', 
        '-shortest',
        '-y', finalPath
    ]);

    return finalPath;
}
