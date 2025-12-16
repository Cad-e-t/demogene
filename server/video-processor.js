

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// CONFIGURATION
// ==========================================
// Standard flags for fast generation steps (Zoom/Effects)
const FF_FLAGS = ["-c:v", "libx264", "-preset", "fast", "-r", "30", "-pix_fmt", "yuv420p"];

// High Quality flags for initial preprocessing (Upload)
const PREPROCESS_FLAGS = [
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "24",
    "-r", "30",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an" // Remove audio
];

// ==========================================
// HELPERS
// ==========================================

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => stderr += d.toString());
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else {
        console.error('FFmpeg Error Details:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
  });
}

function getResolution(filePath) {
  try {
      const out = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${filePath}"`);
      const json = JSON.parse(out.toString());
      return { width: json.streams[0].width, height: json.streams[0].height };
  } catch(e) {
      return { width: 1920, height: 1080 };
  }
}

function getDuration(filePath) {
  try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const val = parseFloat(out.toString().trim());
      // Safety check for NaN which can crash downstream commands
      return isNaN(val) ? 0.0 : val;
  } catch (e) {
      return 0.0;
  }
}

function parseTime(t) {
    if (typeof t === 'number') return t;
    if (!t) return 0;
    const parts = t.toString().split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

// ==========================================
// MATH: AUDIO SPLITTING LOGIC
// ==========================================

export function calculateAudioLineDurations(lines, totalAudioDuration) {
    if (!lines || lines.length === 0) return [];
    
    // 1. Calculate total characters
    const totalChars = lines.reduce((acc, line) => acc + line.narration.length, 0);
    
    // 2. Calculate unit duration per character
    const unit = totalAudioDuration / totalChars;
    
    // 3. Calculate duration for each line
    // returns array of floats [6.14, 8.35, ...]
    return lines.map(line => line.narration.length * unit);
}

// ==========================================
// ASSET GENERATION
// ==========================================

async function createRoundedMask(width, height, radius, outputPath) {
    const filter = `format=rgba,geq=r='255':g='255':b='255':a='if(gt(abs(W/2-X),W/2-${radius})*gt(abs(H/2-Y),H/2-${radius}),if(lte(hypot(${radius}-(W/2-abs(W/2-X)),${radius}-(H/2-abs(H/2-Y))),${radius}),255,0),255)'`;
    await runFFmpeg([
        '-f', 'lavfi', '-i', `color=black:s=${width}x${height}:d=1`,
        '-vf', filter, '-frames:v', '1', '-y', outputPath
    ]);
}

async function createGradientBackground(width, height, startColor, endColor, style, outputPath) {
    const c1 = startColor.replace('#', '');
    const c2 = endColor.replace('#', '');
    const blendExpr = style === 'vertical' ? `blend=all_expr='A*(1-Y/${height})+B*(Y/${height})'` : `blend=all_expr='A*(1-X/${width})+B*(X/${width})'`;
    
    await runFFmpeg([
        '-f', 'lavfi', '-i', `color=c=0x${c1}:s=${width}x${height}`,
        '-f', 'lavfi', '-i', `color=c=0x${c2}:s=${width}x${height}`,
        '-filter_complex', blendExpr,
        '-frames:v', '1', '-y', outputPath
    ]);
}

// ==========================================
// BACKGROUND & SCALING PIPELINE
// ==========================================

async function prepareBackgroundVideo(inputVideo, outputVideo, analysis, workDir) {
    const { width: origW, height: origH } = getResolution(inputVideo);
    
    // Dynamic Canvas Sizing Logic
    const padding = 60;
    const targetMaxDim = 1080;
    
    const scaleFactor = targetMaxDim / Math.max(origW, origH);
    const vidW = Math.floor((origW * scaleFactor) / 2) * 2;
    const vidH = Math.floor((origH * scaleFactor) / 2) * 2;
    
    const bgW = vidW + (padding * 2);
    const bgH = vidH + (padding * 2);
    
    console.log(`Dynamic Res: ${bgW}x${bgH}, Video Scaled: ${vidW}x${vidH}`);
    
    // Create Assets
    const tempId = uuidv4();
    const maskPath = path.join(workDir, `mask_${tempId}.png`);
    const bgPath = path.join(workDir, `bg_${tempId}.png`);
    
    const radius = Math.floor(Math.min(vidW, vidH) * 0.05);
    const gradient = analysis.background_gradient;
    
    await createRoundedMask(vidW, vidH, radius, maskPath);
    await createGradientBackground(bgW, bgH, gradient.start_color, gradient.end_color, gradient.style, bgPath);
    
    // Filter Complex: Scale -> Mask -> Overlay
    const filterComplex = `[0:v]setpts=PTS-STARTPTS,scale=${vidW}:${vidH}[scaled];[scaled][1:v]alphamerge[rounded];[2:v][rounded]overlay=${padding}:${padding}`;
    
    // Trimming 0.5s from start as per Python requirement
    await runFFmpeg([
        '-i', inputVideo,
        '-loop', '1', '-i', maskPath,
        '-loop', '1', '-i', bgPath,
        '-filter_complex', filterComplex,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'copy',
        '-shortest', '-ss', '0.5', '-y', outputVideo
    ]);
    
    // Cleanup assets
    if (fs.existsSync(maskPath)) fs.unlinkSync(maskPath);
    if (fs.existsSync(bgPath)) fs.unlinkSync(bgPath);
    
    return { scaleFactor, padding, vidW, vidH, bgW, bgH, timeTrim: 0.5 };
}

// ==========================================
// COORDINATE TRANSFORMATION
// ==========================================

function transformSegmentData(segments, params) {
    const { timeTrim, padding, vidW, vidH, bgW, bgH } = params;
    
    const newSegments = [];
    
    for (const seg of segments) {
        const start = parseTime(seg.start_time);
        const end = parseTime(seg.end_time);
        
        // Skip if fully inside trimmed portion
        if (end <= timeTrim) continue;
        
        const newSeg = JSON.parse(JSON.stringify(seg)); // Deep copy
        
        newSeg.start_time = Math.max(0.0, start - timeTrim);
        newSeg.end_time = Math.max(0.0, end - timeTrim);
        
        if (newSeg.mouse_activity) {
            const act = newSeg.mouse_activity;
            const rawTime = act.timestamp || act.time;
            
            if (rawTime !== undefined && rawTime !== null) {
                const cTime = parseTime(rawTime);
                
                // Only process if activity is after trim
                if (cTime > timeTrim) {
                    const adjustedTime = cTime - timeTrim;
                    if (act.timestamp !== undefined) act.timestamp = adjustedTime;
                    else act.time = adjustedTime;
                    
                    // Transform Coordinates
                    // Mocks.js uses coordinates object
                    let cx = act.coordinates ? act.coordinates.x : act.x;
                    let cy = act.coordinates ? act.coordinates.y : act.y;
                    
                    cx = (padding + (cx * vidW)) / bgW;
                    cy = (padding + (cy * vidH)) / bgH;
                    
                    if (act.coordinates) {
                        act.coordinates.x = cx;
                        act.coordinates.y = cy;
                    } else {
                        act.x = cx;
                        act.y = cy;
                    }
                } else {
                    // Activity fell in the trimmed part
                    newSeg.mouse_activity = null;
                }
            }
        }
        newSegments.push(newSeg);
    }
    return newSegments;
}

// ==========================================
// ZOOM LOGIC
// ==========================================

function getZoomEvents(segment, segStartAbs, segEndAbs) {
    const activity = segment.mouse_activity;
    if (!activity) return [];
    
    const events = [];
    
    const rawTime = activity.timestamp || activity.time;
    if (rawTime === undefined || rawTime === null) return [];
    
    const cTime = parseTime(rawTime);
    
    // Check if event falls within this segment
    if (cTime >= segStartAbs && cTime <= segEndAbs) {
        const relTime = cTime - segStartAbs;
        
        let cx = activity.coordinates ? activity.coordinates.x : activity.x;
        let cy = activity.coordinates ? activity.coordinates.y : activity.y;
        
        // Use provided hold duration or default
        let holdDuration = activity.hold_duration !== undefined ? parseFloat(activity.hold_duration) : 2.0;
        
        events.push({ relTime, cx, cy, holdDuration });
    }
    
    return events;
}

async function applyMultiZoomEffect(inPath, outPath, events, workDir) {
    const { width, height } = getResolution(inPath);
    const videoDur = getDuration(inPath);
    
    const ZOOM_FACTOR = 1.8;
    const TRANSITION = 0.4;
    
    let currentTime = 0;
    const parts = [];
    
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        // Calculate cut points
        const zoomStart = Math.max(currentTime, event.relTime - TRANSITION);
        const zoomEnd = Math.min(videoDur, event.relTime + event.holdDuration + TRANSITION);
        
        // Safety check to ensure we move forward and don't overlap strangely
        if (zoomStart < currentTime) continue;
        
        // 1. Normal Segment (From previous cursor to Zoom Start)
        if (zoomStart > currentTime + 0.05) {
            const pNormal = path.join(workDir, `seg_norm_${uuidv4()}.mp4`);
            await runFFmpeg(['-i', inPath, '-ss', currentTime.toString(), '-to', zoomStart.toString(), ...FF_FLAGS, '-an', '-y', pNormal]);
            parts.push(pNormal);
        }
        
        // 2. Zoomed Segment
        if (zoomEnd > zoomStart + 0.05) {
            const pZoom = path.join(workDir, `seg_zoom_${uuidv4()}.mp4`);
            
            // Calculate Crop
            const cropW = Math.floor(width / ZOOM_FACTOR);
            const cropH = Math.floor(height / ZOOM_FACTOR);
            let cropX = Math.floor(event.cx * width - cropW / 2);
            let cropY = Math.floor(event.cy * height - cropH / 2);
            
            cropX = Math.max(0, Math.min(cropX, width - cropW));
            cropY = Math.max(0, Math.min(cropY, height - cropH));
            
            const filter = `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${width}:${height}`;
            await runFFmpeg(['-i', inPath, '-ss', zoomStart.toString(), '-to', zoomEnd.toString(), '-vf', filter, ...FF_FLAGS, '-an', '-y', pZoom]);
            parts.push(pZoom);
        }
        
        currentTime = zoomEnd;
    }
    
    // 3. Tail Segment
    if (currentTime < videoDur - 0.05) {
        const pTail = path.join(workDir, `seg_tail_${uuidv4()}.mp4`);
        await runFFmpeg(['-i', inPath, '-ss', currentTime.toString(), ...FF_FLAGS, '-an', '-y', pTail]);
        parts.push(pTail);
    }
    
    // Concat
    if (parts.length === 0) {
        fs.copyFileSync(inPath, outPath);
    } else {
        const listPath = path.join(workDir, `zlist_${uuidv4()}.txt`);
        fs.writeFileSync(listPath, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outPath]);
    }
}

// ==========================================
// PREPROCESS (For initial crop/trim in server.js)
// ==========================================
export async function preprocessVideo(inputPath, crop, trim, segments, outputPath) {
    const { width, height } = getResolution(inputPath);
    let cropFilter = "";
    
    if (crop) {
        const cx = crop.x || 0;
        const cy = crop.y || 0;
        const cw = crop.width || 1;
        const ch = crop.height || 1;
        const pixelW = Math.floor(width * cw);
        const pixelH = Math.floor(height * ch);
        const pixelX = Math.floor(width * cx);
        const pixelY = Math.floor(height * cy);
        cropFilter = `crop=${pixelW}:${pixelH}:${pixelX}:${pixelY}`;
    }

    const args = [];
    
    if (segments && Array.isArray(segments) && segments.length > 0) {
        // Unified Segment Processing: Input Seeking + Concat Filter + Crop + Encode
        const sorted = [...segments].sort((a, b) => a.start - b.start);
        
        // 1. Inputs (Multiple seeks on same file)
        for (const seg of sorted) {
            args.push('-ss', seg.start.toString());
            args.push('-to', seg.end.toString());
            args.push('-i', inputPath);
        }

        // 2. Filter Complex
        const filters = [];
        let inputsMap = "";
        for (let i = 0; i < sorted.length; i++) inputsMap += `[${i}:v]`;
        
        // Concat video only (v=1, a=0)
        let currentLabel = "[vconcat]";
        filters.push(`${inputsMap}concat=n=${sorted.length}:v=1:a=0${currentLabel}`);
        
        if (cropFilter) {
            filters.push(`${currentLabel}${cropFilter}[vcrop]`);
            currentLabel = "[vcrop]";
        }
        
        args.push('-filter_complex', filters.join(';'));
        args.push('-map', currentLabel);

    } else {
        // Simple Trim
        if (trim && trim.end > 0) {
            args.push('-ss', trim.start.toString());
            args.push('-to', trim.end.toString());
        }
        args.push('-i', inputPath);
        
        if (cropFilter) {
            args.push('-vf', cropFilter);
        }
    }

    // Apply High Quality Encoding Flags (Includes -an)
    args.push(...PREPROCESS_FLAGS);
    args.push('-y', outputPath);

    await runFFmpeg(args);
    return outputPath;
}

// ==========================================
// MAIN PIPELINE
// ==========================================

export async function processVideoPipeline(
    inputVideoPath, 
    fullAudioPath,
    audioDurations,
    analysis, 
    finalOutputPath
) {
    // Create work dir in system temp
    const workDir = path.join(os.tmpdir(), 'temp_' + uuidv4());
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);
    
    try {
        console.log("--- Pipeline Step 1: Background & Scaling ---");
        const intermediateStyled = path.join(workDir, 'styled_bg.mp4');
        const transformParams = await prepareBackgroundVideo(inputVideoPath, intermediateStyled, analysis, workDir);
        
        console.log("--- Pipeline Step 2: Transform Data ---");
        const transformedSegments = transformSegmentData(analysis.segments, transformParams);
        
        console.log("--- Pipeline Step 3: Scene Processing ---");
        const processedPaths = [];
        const count = Math.min(transformedSegments.length, audioDurations.length);
        
        for (let i = 0; i < count; i++) {
            const seg = transformedSegments[i];
            let audioDur = audioDurations[i];
            const start = parseTime(seg.start_time);
            const end = parseTime(seg.end_time);
            const duration = end - start;
            
            console.log(`Processing Scene ${i}: Visual ${duration.toFixed(2)}s, Audio ${audioDur.toFixed(2)}s`);
            
            // 1. Extract raw segment
            const rawSegPath = path.join(workDir, `raw_${i}.mp4`);
            await runFFmpeg(['-ss', start.toString(), '-t', duration.toString(), '-i', intermediateStyled, '-an', ...FF_FLAGS, '-y', rawSegPath]);
            
            // 2. Apply Zoom (Multiple zooms supported)
            const zoomEvents = getZoomEvents(seg, start, end);
            let currentSource = rawSegPath;
            
            if (zoomEvents.length > 0) {
                console.log(`  -> Applying ${zoomEvents.length} zoom(s)`);
                const zoomedPath = path.join(workDir, `zoomed_${i}.mp4`);
                await applyMultiZoomEffect(rawSegPath, zoomedPath, zoomEvents, workDir);
                currentSource = zoomedPath;
            }
            
            // 3. Sync Duration (Freeze or Trim/Decimate)
            const visualDur = getDuration(currentSource);
            const finalSegPath = path.join(workDir, `proc_${i}.mp4`);
            
            const timeDiff = audioDur - visualDur;

            // Updated logic to handle precision and valid padding
            if (timeDiff > 0.02) {
                // Visual is significantly shorter than audio -> Pad it
                const freezeTime = timeDiff;
                console.log(`  -> Visual shorter. Freezing last frame for ${freezeTime.toFixed(3)}s`);
                // Use .toFixed(3) to prevent scientific notation (e.g. 1e-15) which crashes ffmpeg
                await runFFmpeg(['-i', currentSource, '-vf', `tpad=stop_mode=clone:stop_duration=${freezeTime.toFixed(3)}`, '-an', ...FF_FLAGS, '-y', finalSegPath]);
            } else {
                // Visual is longer or roughly equal -> Trim or Decimate
                const motionlessPath = path.join(workDir, `motionless_${i}.mp4`);
                try {
                    // Try to decimate duplicate frames
                    await runFFmpeg(['-i', currentSource, '-vf', 'mpdecimate,setpts=N/FRAME_RATE/TB', '-an', ...FF_FLAGS, '-y', motionlessPath]);
                    const mdur = getDuration(motionlessPath);
                    
                    if (mdur > audioDur) {
                        console.log(`  -> Trimmed motionless video to match audio.`);
                        await runFFmpeg(['-i', motionlessPath, '-t', audioDur.toString(), '-an', ...FF_FLAGS, '-y', finalSegPath]);
                    } else {
                         console.log(`  -> Motionless too short. Trimming original.`);
                         // Ensure we don't trim if original is already effectively equal or shorter (though we are in else block, so visualDur >= audioDur - 0.02)
                         await runFFmpeg(['-i', currentSource, '-t', audioDur.toString(), '-an', ...FF_FLAGS, '-y', finalSegPath]);
                    }
                } catch (e) {
                    // Fallback to simple trim
                     await runFFmpeg(['-i', currentSource, '-t', audioDur.toString(), '-an', ...FF_FLAGS, '-y', finalSegPath]);
                }
            }
            
            processedPaths.push(finalSegPath);
        }
        
        // 4. Concat Visuals
        const listPath = path.join(workDir, 'list.txt');
        fs.writeFileSync(listPath, processedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        const syncedVideo = path.join(workDir, 'synced.mp4');
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', syncedVideo]);
        
        // 5. Merge with Master Audio (IF AUDIO EXISTS)
        console.log("--- Pipeline Step 4: Final Merge ---");
        if (fullAudioPath) {
            await runFFmpeg(['-i', syncedVideo, '-i', fullAudioPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', finalOutputPath]);
        } else {
            console.log("--- No Audio Path (Voiceless Mode) - Just Copying Video ---");
            fs.copyFileSync(syncedVideo, finalOutputPath);
        }
        
        return finalOutputPath;
        
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}
