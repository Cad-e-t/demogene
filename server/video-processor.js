
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// CONFIGURATION
// ==========================================
const FF_FLAGS = ["-c:v", "libx264", "-preset", "fast", "-r", "30", "-pix_fmt", "yuv420p"];

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
      return parseFloat(out.toString().trim());
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

// ==========================================
// MATH: AUDIO SPLITTING LOGIC
// ==========================================

export function calculateAudioLineDurations(lines, totalAudioDuration) {
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
    const filter = `format=rgba,geq=r='255':g='255':b='255':a='if(gt(abs(W/2-X),W/2-${radius})*gt(abs(H/2-Y),H/2-${radius}),if(lte(hypot({${radius}}-(W/2-abs(W/2-X)),{${radius}}-(H/2-abs(H/2-Y))),{${radius}}),255,0),255)'`;
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
            // Transform Clicks
            if (newSeg.mouse_activity.clicks) {
                const validClicks = [];
                for (const click of newSeg.mouse_activity.clicks) {
                    const cTime = parseTime(click.time);
                    if (cTime <= timeTrim) continue;
                    
                    click.time = cTime - timeTrim;
                    click.x = (padding + (click.x * vidW)) / bgW;
                    click.y = (padding + (click.y * vidH)) / bgH;
                    validClicks.push(click);
                }
                newSeg.mouse_activity.clicks = validClicks;
            }
            
            // Transform Hovers
            if (newSeg.mouse_activity.hover_regions) {
                const validHovers = [];
                for (const hover of newSeg.mouse_activity.hover_regions) {
                    const hStart = parseTime(hover.start_time);
                    const hEnd = parseTime(hover.end_time);
                    if (hEnd <= timeTrim) continue;
                    
                    hover.start_time = Math.max(0.0, hStart - timeTrim);
                    hover.end_time = Math.max(0.0, hEnd - timeTrim);
                    
                    // Transform coords (x1, y1, x2, y2)
                    hover.x1 = (padding + (hover.x1 * vidW)) / bgW;
                    hover.x2 = (padding + (hover.x2 * vidW)) / bgW;
                    hover.y1 = (padding + (hover.y1 * vidH)) / bgH;
                    hover.y2 = (padding + (hover.y2 * vidH)) / bgH;
                    
                    validHovers.push(hover);
                }
                newSeg.mouse_activity.hover_regions = validHovers;
            }
        }
        newSegments.push(newSeg);
    }
    return newSegments;
}

// ==========================================
// ZOOM LOGIC
// ==========================================

function getZoomParams(segment, segStartAbs, segEndAbs) {
    const activity = segment.mouse_activity;
    if (!activity) return { hasZoom: false };
    
    let targetClick = null;
    if (activity.clicks) {
        for (const click of activity.clicks) {
            const cTime = parseTime(click.time);
            if (cTime >= segStartAbs && cTime <= segEndAbs && click.type === 'left') {
                targetClick = click;
                break;
            }
        }
    }
    
    if (!targetClick) return { hasZoom: false };
    
    const clickAbsTime = parseTime(targetClick.time);
    const relTime = clickAbsTime - segStartAbs;
    const cx = targetClick.x;
    const cy = targetClick.y;
    
    let holdDuration = 1.0;
    if (activity.hover_regions) {
        for (const hover of activity.hover_regions) {
            const hStart = parseTime(hover.start_time);
            const hEnd = parseTime(hover.end_time);
            if (clickAbsTime >= hStart && clickAbsTime <= hEnd) {
                holdDuration = Math.max(0.5, hEnd - hStart);
                break;
            }
        }
    }
    
    return { hasZoom: true, relTime, cx, cy, holdDuration };
}

async function applyZoomEffect(inPath, outPath, params, workDir) {
    const { relTime, cx, cy, holdDuration } = params;
    const { width, height } = getResolution(inPath);
    const videoDur = getDuration(inPath);
    
    const ZOOM_FACTOR = 1.8;
    const TRANSITION = 0.4;
    
    const zoomStart = Math.max(0, relTime - TRANSITION);
    const zoomEnd = Math.min(relTime + holdDuration + TRANSITION, videoDur);
    
    // Calculate Crop
    const cropW = Math.floor(width / ZOOM_FACTOR);
    const cropH = Math.floor(height / ZOOM_FACTOR);
    let cropX = Math.floor(cx * width - cropW / 2);
    let cropY = Math.floor(cy * height - cropH / 2);
    
    cropX = Math.max(0, Math.min(cropX, width - cropW));
    cropY = Math.max(0, Math.min(cropY, height - cropH));
    
    const parts = [];
    
    // Part 1: Before Zoom
    if (zoomStart > 0.05) {
        const p1 = path.join(workDir, `z1_${uuidv4()}.mp4`);
        await runFFmpeg(['-i', inPath, '-ss', '0', '-to', zoomStart.toString(), ...FF_FLAGS, '-an', '-y', p1]);
        parts.push(p1);
    }
    
    // Part 2: Zoomed
    if (zoomEnd > zoomStart) {
        const p2 = path.join(workDir, `z2_${uuidv4()}.mp4`);
        const filter = `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${width}:${height}`;
        await runFFmpeg(['-i', inPath, '-ss', zoomStart.toString(), '-to', zoomEnd.toString(), '-vf', filter, ...FF_FLAGS, '-an', '-y', p2]);
        parts.push(p2);
    }
    
    // Part 3: After Zoom
    if (zoomEnd < videoDur - 0.05) {
        const p3 = path.join(workDir, `z3_${uuidv4()}.mp4`);
        await runFFmpeg(['-i', inPath, '-ss', zoomEnd.toString(), ...FF_FLAGS, '-an', '-y', p3]);
        parts.push(p3);
    }
    
    // Concat
    if (parts.length === 0) {
        fs.copyFileSync(inPath, outPath);
    } else {
        const listPath = path.join(workDir, `zlist_${uuidv4()}.txt`);
        fs.writeFileSync(listPath, parts.map(p => `file '${p}'`).join('\n'));
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outPath]);
    }
}

// ==========================================
// PREPROCESS (For initial crop/trim in server.js)
// ==========================================
export async function preprocessVideo(inputPath, crop, trim, outputPath) {
    const { width, height } = getResolution(inputPath);
    let filterChain = [];
    
    if (crop) {
        const cx = crop.x || 0;
        const cy = crop.y || 0;
        const cw = crop.width || 1;
        const ch = crop.height || 1;
        const pixelW = Math.floor(width * cw);
        const pixelH = Math.floor(height * ch);
        const pixelX = Math.floor(width * cx);
        const pixelY = Math.floor(height * cy);
        filterChain.push(`crop=${pixelW}:${pixelH}:${pixelX}:${pixelY}`);
    }

    const args = [];
    if (trim && trim.end > 0) {
        args.push('-ss', trim.start.toString());
        args.push('-t', (trim.end - trim.start).toString());
    }
    args.push('-i', inputPath);
    if (filterChain.length > 0) {
        args.push('-vf', filterChain.join(','));
    }
    args.push(...FF_FLAGS);
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
            const audioDur = audioDurations[i];
            const start = parseTime(seg.start_time);
            const end = parseTime(seg.end_time);
            const duration = end - start;
            
            console.log(`Processing Scene ${i}: Visual ${duration.toFixed(2)}s, Audio ${audioDur.toFixed(2)}s`);
            
            // 1. Extract raw segment
            const rawSegPath = path.join(workDir, `raw_${i}.mp4`);
            await runFFmpeg(['-ss', start.toString(), '-t', duration.toString(), '-i', intermediateStyled, '-an', ...FF_FLAGS, '-y', rawSegPath]);
            
            // 2. Apply Zoom
            const zoomParams = getZoomParams(seg, start, end);
            let currentSource = rawSegPath;
            
            if (zoomParams.hasZoom) {
                console.log(`  -> Applying Zoom at rel time ${zoomParams.relTime.toFixed(2)}s`);
                const zoomedPath = path.join(workDir, `zoomed_${i}.mp4`);
                await applyZoomEffect(rawSegPath, zoomedPath, zoomParams, workDir);
                currentSource = zoomedPath;
            }
            
            // 3. Sync Duration (Freeze or Trim/Decimate)
            const visualDur = getDuration(currentSource);
            const finalSegPath = path.join(workDir, `proc_${i}.mp4`);
            
            if (visualDur < audioDur) {
                // Freeze last frame
                const freezeTime = audioDur - visualDur;
                console.log(`  -> Visual shorter. Freezing last frame for ${freezeTime.toFixed(2)}s`);
                await runFFmpeg(['-i', currentSource, '-vf', `tpad=stop_mode=clone:stop_duration=${freezeTime}`, '-an', ...FF_FLAGS, '-y', finalSegPath]);
            } else {
                // Remove motionless frames or trim
                const motionlessPath = path.join(workDir, `motionless_${i}.mp4`);
                try {
                    // Try to decimate duplicate frames
                    await runFFmpeg(['-i', currentSource, '-vf', 'mpdecimate,setpts=N/FRAME_RATE/TB', '-an', ...FF_FLAGS, '-y', motionlessPath]);
                    const mdur = getDuration(motionlessPath);
                    
                    if (mdur > audioDur) {
                        console.log(`  -> Trimmed motionless video to match audio.`);
                        await runFFmpeg(['-i', motionlessPath, '-t', audioDur.toString(), '-an', ...FF_FLAGS, '-y', finalSegPath]);
                    } else {
                         // Decimated too much? Or just right? Usually we trim original if decimated is too short, or extend?
                         // Python script logic: "Motionless too short. Trim original."
                         console.log(`  -> Motionless too short. Trimming original.`);
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
        fs.writeFileSync(listPath, processedPaths.map(p => `file '${p}'`).join('\n'));
        const syncedVideo = path.join(workDir, 'synced.mp4');
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', syncedVideo]);
        
        // 5. Merge with Master Audio
        console.log("--- Pipeline Step 4: Final Merge ---");
        await runFFmpeg(['-i', syncedVideo, '-i', fullAudioPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', finalOutputPath]);
        
        return finalOutputPath;
        
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}
