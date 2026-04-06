
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


function getFilterForEffect(effectType, width, height, frames, startFrame = 0) {
    // Zoom/Pan expressions for ffmpeg zoompan filter
    // d = duration in frames
    // s = output size
    // z = zoom factor per frame
    // x, y = top-left corner of the crop window
    
    // Fix: Calculate zoom step per frame based on total frames to ensure movement lasts full duration.
    // Increased zoom ranges to make pace faster (covering more distance in same time).
    const stepIn = (0.5 / frames).toFixed(6); // Range 1.0 -> 1.8
    const stepOut = (0.5 / frames).toFixed(6); // Range 1.8 -> 1.0
    const stepCinematic = (0.4 / frames).toFixed(6); // Range 1.0 -> 1.4
    const stepHandheld = (0.2 / frames).toFixed(6); // Range 1.1 -> 1.3

    switch (effectType) {
        case 'zoom_in':
            // Faster: Zoom from 1.0 to 1.8
            return `zoompan=z='min(zoom+${stepIn},1.8)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
        
        case 'zoom_out':
            // Faster: Start at 1.8, zoom out to 1.0
            return `zoompan=z='if(eq(on,1),1.8,max(1.001,zoom-${stepOut}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'slow_zoom_in':
             // Cinematic: Continuous push-in. Increased to 1.4 for better visibility.
             return `zoompan=z='min(zoom+${stepCinematic},1.4)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;

        case 'slide_left':
            return `zoompan=z='1.15':x='(1-on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
        case 'slide_right':
            return `zoompan=z='1.15':x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
        case 'slide_up':
            return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
        case 'slide_down':
            return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
        case 'slide_up_left':
            return `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
        case 'slide_up_right':
            return `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(1-on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
        case 'slide_down_left':
            return `zoompan=z='1.2':x='(1-on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;
        case 'slide_down_right':
            return `zoompan=z='1.2':x='(on/${frames})*(iw-iw/zoom)':y='(on/${frames})*(ih-ih/zoom)':d=${frames}:s=${width}x${height}`;

        case 'handheld_walk':
            // Simulates a smooth, continuous circular drift (elliptical path).
            // We use (on + startFrame) to ensure the motion is seamless across the entire video.
            // Z: Starts at 1.1, zooms into 1.3.
            // X/Y: Traces a gentle elliptical path (Right -> Up -> Left -> Down).
            const globalFrame = `(on+${startFrame})`;
            const driftX = `(iw/zoom/30)*sin(${globalFrame}/20)`;
            const driftY = `(ih/zoom/40)*cos(${globalFrame}/20)`;
            return `zoompan=z='if(eq(on,0),1.1,min(zoom+${stepHandheld},1.3))':x='iw/2-(iw/zoom/2)+${driftX}':y='ih/2-(ih/zoom/2)+${driftY}':d=${frames}:s=${width}x${height}`;

        case 'none':
            return `scale=${width}x${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

        default:
            // Minimal movement to prevent static boredom, or true static
            return `scale=${width}x${height}`;
    }
}

export async function assembleVideo(segments, audioPath, audioDurations, workDir, aspectRatio, effectPreset) {
    // 1. Create video clips from images with zoom effect
    const clipPaths = [];
    const width = aspectRatio === '9:16' ? 720 : 1280;
    const height = aspectRatio === '9:16' ? 1280 : 720;
    
    // Use the effect array directly from the database. 
    // If it's a string, attempt to parse it first.
    let parsedEffect = effectPreset;
    if (typeof effectPreset === 'string') {
        try {
            parsedEffect = JSON.parse(effectPreset);
        } catch (e) {
            // Ignore parse errors
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
        
        const frames = Math.ceil(duration * 30) + 10; // +10 buffer
        
        // Determine effect for this segment
        const effectType = sequence[i % sequence.length];
        
        let filter = "";
        
        // Pre-scale input image to avoid massive scaling in zoompan if image is huge
        // We'll scale to 2x target resolution to keep quality during zoom
        const inputScale = `scale=${width*2}:-1`; 
        
        const effectFilter = getFilterForEffect(effectType, width, height, frames, currentStartFrame);
        
        // Standardize fps
        const fpsFilter = `fps=30`;

        // Chain filters: Scale Input -> Effect (ZoomPan) -> Output -> Atmospheric Breathing (Vignette)
        // Note: Zoompan output resolution is set in the function
        // We use the highly optimized built-in vignette filter to create a static shade,
        // and then blend it over the original video at a static 10% opacity.
        // This creates a faint cinematic edge shadow while remaining lightning fast.
        // angle='PI/10' ensures a very wide falloff that keeps the center untouched.
        const vignetteFilter = `split[base][vignetted];[vignetted]vignette=angle='PI/10':x0=w/2:y0=h/2[vignetted];[vignetted][base]blend=all_opacity=0.1`;
        filter = `${inputScale},${effectFilter},${fpsFilter},setsar=1,${vignetteFilter}`;

        await runFFmpeg([
            '-loop', '1',
            '-i', imagePath,
            '-vf', filter,
            '-c:v', 'libx264', '-t', duration.toString(), '-pix_fmt', 'yuv420p',
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
