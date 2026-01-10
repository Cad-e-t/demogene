
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

const FF_FLAGS = ["-c:v", "libx264", "-preset", "fast", "-r", "30", "-pix_fmt", "yuv420p"];

const PREPROCESS_FLAGS = [
    "-c:v", "libx264",
    "-preset", "slow", 
    "-crf", "24",
    "-r", "30",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an"
];

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Executing: ffmpeg ${args.join(' ')}`);
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
      console.warn("ffprobe resolution fetch failed, defaulting to 1920x1080", e.message);
      return { width: 1920, height: 1080 };
  }
}

function getDuration(filePath) {
  try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const val = parseFloat(out.toString().trim());
      return isNaN(val) ? 0.0 : val;
  } catch (e) {
      console.warn("ffprobe duration fetch failed, defaulting to 0", e.message);
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

async function downloadRemoteFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download background image: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

export function calculateAudioLineDurations(lines, totalAudioDuration) {
    if (!lines || lines.length === 0) return [];
    const totalChars = lines.reduce((acc, line) => acc + line.narration.length, 0);
    const unit = totalAudioDuration / totalChars;
    return lines.map(line => line.narration.length * unit);
}

async function createRoundedMask(width, height, radius, outputPath) {
    const filter = `format=rgba,geq=r='255':g='255':b='255':a='if(gt(abs(W/2-X),W/2-${radius})*gt(abs(H/2-Y),H/2-${radius}),if(lte(hypot(${radius}-(W/2-abs(W/2-X)),${radius}-(H/2-abs(H/2-Y))),${radius}),255,0),255)'`;
    await runFFmpeg([
        '-f', 'lavfi', '-i', `color=black:s=${width}x${height}:d=1`,
        '-vf', filter, '-frames:v', '1', '-y', outputPath
    ]);
}

async function prepareBackgroundVideo(inputVideo, outputVideo, analysis, workDir, backgroundId) {
    const { width: origW, height: origH } = getResolution(inputVideo);
    const videoDuration = getDuration(inputVideo);
    
    // Check for "none" background
    if (!backgroundId || backgroundId === 'none') {
        console.log("--- Step: Preparing Video (No Background) ---");
        console.log(`Using original resolution: ${origW}x${origH}, Duration: ${videoDuration}s`);
        
        // When no background is selected, we just pass through the video with the mandatory 0.5s trim
        // This ensures visual stability without adding black bars or scaling artifacts.
        await runFFmpeg([
            '-i', inputVideo,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', 
            '-an', 
            '-ss', '0.5',
            '-y', outputVideo
        ]);
        
        return { 
            scaleFactor: 1.0, 
            padding: 0, 
            vidW: origW, 
            vidH: origH, 
            bgW: origW, 
            bgH: origH, 
            timeTrim: 0.5 
        };
    }

    console.log("--- Step: Preparing Video (With Background) ---");
    const padding = 60;
    const targetMaxDim = 1080;
    
    const scaleFactor = targetMaxDim / Math.max(origW, origH);
    const vidW = Math.floor((origW * scaleFactor) / 2) * 2;
    const vidH = Math.floor((origH * scaleFactor) / 2) * 2;
    
    const bgW = vidW + (padding * 2);
    const bgH = vidH + (padding * 2);
    
    console.log(`Scaled Res: ${vidW}x${vidH}, Canvas Res: ${bgW}x${bgH}, Duration: ${videoDuration}s`);

    // Resolve background URL from Supabase Storage bucket
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ceccojjvzimljcdltjxy.supabase.co';
    const bgUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/backgrounds/${backgroundId}`;
    
    const localBgPath = path.join(workDir, `bg_${uuidv4()}.png`);
    console.log(`Downloading background from: ${bgUrl}`);
    await downloadRemoteFile(bgUrl, localBgPath);

    // Get background resolution to apply proper cropping to avoid distortion
    const { width: imgW, height: imgH } = getResolution(localBgPath);
    const canvasAR = bgW / bgH;
    const imgAR = imgW / imgH;
    
    let bgFilter = "";
    if (imgAR > canvasAR) {
        // Image is wider than needed, crop width (center-based)
        const cropW = imgH * canvasAR;
        bgFilter = `crop=${Math.floor(cropW)}:${imgH},scale=${bgW}:${bgH}`;
    } else {
        // Image is taller than needed, crop height (center-based)
        const cropH = imgW / canvasAR;
        bgFilter = `crop=${imgW}:${Math.floor(cropH)},scale=${bgW}:${bgH}`;
    }

    const tempId = uuidv4();
    const maskPath = path.join(workDir, `mask_${tempId}.png`);
    const radius = Math.floor(Math.min(vidW, vidH) * 0.05);
    await createRoundedMask(vidW, vidH, radius, maskPath);
    
    // Apply bgFilter instead of just scaling to prevent background distortion
    const filterComplex = `[0:v]setpts=PTS-STARTPTS,scale=${vidW}:${vidH}[scaled];[scaled][1:v]alphamerge[rounded];[2:v]${bgFilter}[bg];[bg][rounded]overlay=${padding}:${padding}`;
    
    await runFFmpeg([
        '-i', inputVideo,
        '-loop', '1', '-t', videoDuration.toString(), '-i', maskPath,
        '-loop', '1', '-t', videoDuration.toString(), '-i', localBgPath,
        '-filter_complex', filterComplex,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', 
        '-an', 
        '-ss', '0.5',
        '-y', outputVideo
    ]);
    
    if (fs.existsSync(maskPath)) fs.unlinkSync(maskPath);
    if (fs.existsSync(localBgPath)) fs.unlinkSync(localBgPath);
    
    return { scaleFactor, padding, vidW, vidH, bgW, bgH, timeTrim: 0.5 };
}

function transformSegmentData(segments, params) {
    const { timeTrim, padding, vidW, vidH, bgW, bgH } = params;
    const newSegments = [];
    for (const seg of segments) {
        const start = parseTime(seg.start_time);
        const end = parseTime(seg.end_time);
        if (end <= timeTrim) continue;
        const newSeg = JSON.parse(JSON.stringify(seg));
        newSeg.start_time = Math.max(0.0, start - timeTrim);
        newSeg.end_time = Math.max(0.0, end - timeTrim);
        if (newSeg.mouse_activity) {
            const act = newSeg.mouse_activity;
            const rawTime = act.timestamp || act.time;
            if (rawTime !== undefined && rawTime !== null) {
                const cTime = parseTime(rawTime);
                if (cTime > timeTrim) {
                    const adjustedTime = cTime - timeTrim;
                    if (act.timestamp !== undefined) act.timestamp = adjustedTime;
                    else act.time = adjustedTime;
                    let cx = act.coordinates ? act.coordinates.x : act.x;
                    let cy = act.coordinates ? act.coordinates.y : act.y;
                    
                    // Remap coordinates relative to the new background/canvas resolution
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
                    newSeg.mouse_activity = null;
                }
            }
        }
        newSegments.push(newSeg);
    }
    return newSegments;
}

function getZoomEvents(segment, segStartAbs, segEndAbs) {
    const activity = segment.mouse_activity;
    if (!activity) return [];
    const events = [];
    const rawTime = activity.timestamp || activity.time;
    if (rawTime === undefined || rawTime === null) return [];
    const cTime = parseTime(rawTime);
    if (cTime >= segStartAbs && cTime <= segEndAbs) {
        const relTime = cTime - segStartAbs;
        let cx = activity.coordinates ? activity.coordinates.x : activity.x;
        let cy = activity.coordinates ? activity.coordinates.y : activity.y;
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
    
    console.log(`[Zoom] Applying ${events.length} zoom events for duration ${videoDur.toFixed(2)}s`);

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const zoomStart = Math.max(currentTime, event.relTime - TRANSITION);
        const zoomEnd = Math.min(videoDur, event.relTime + event.holdDuration + TRANSITION);
        
        if (zoomStart < currentTime) continue;
        
        // Add normal part before zoom
        if (zoomStart > currentTime + 0.05) {
            const pNormal = path.join(workDir, `seg_norm_${uuidv4()}.mp4`);
            await runFFmpeg(['-i', inPath, '-ss', currentTime.toString(), '-to', zoomStart.toString(), ...FF_FLAGS, '-an', '-y', pNormal]);
            parts.push(pNormal);
        }
        
        // Add zoomed part
        if (zoomEnd > zoomStart + 0.05) {
            const pZoom = path.join(workDir, `seg_zoom_${uuidv4()}.mp4`);
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
    
    // Add remaining part
    if (currentTime < videoDur - 0.05) {
        const pTail = path.join(workDir, `seg_tail_${uuidv4()}.mp4`);
        await runFFmpeg(['-i', inPath, '-ss', currentTime.toString(), ...FF_FLAGS, '-an', '-y', pTail]);
        parts.push(pTail);
    }
    
    if (parts.length === 0) {
        fs.copyFileSync(inPath, outPath);
    } else {
        const listPath = path.join(workDir, `zlist_${uuidv4()}.txt`);
        fs.writeFileSync(listPath, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outPath]);
    }
}

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
        console.log(`[Preprocess] Concatenating ${segments.length} segments`);
        const sorted = [...segments].sort((a, b) => a.start - b.start);
        for (const seg of sorted) {
            args.push('-ss', seg.start.toString());
            args.push('-to', seg.end.toString());
            args.push('-i', inputPath);
        }
        const filters = [];
        let inputsMap = "";
        for (let i = 0; i < sorted.length; i++) inputsMap += `[${i}:v]`;
        let currentLabel = "[vconcat]";
        filters.push(`${inputsMap}concat=n=${sorted.length}:v=1:a=0${currentLabel}`);
        if (cropFilter) {
            filters.push(`${currentLabel}${cropFilter}[vcrop]`);
            currentLabel = "[vcrop]";
        }
        args.push('-filter_complex', filters.join(';'));
        args.push('-map', currentLabel);
    } else {
        if (trim && trim.end > 0) {
            args.push('-ss', trim.start.toString());
            args.push('-to', trim.end.toString());
        }
        args.push('-i', inputPath);
        if (cropFilter) args.push('-vf', cropFilter);
    }
    args.push(...PREPROCESS_FLAGS);
    args.push('-y', outputPath);
    await runFFmpeg(args);
    return outputPath;
}

export async function processVideoPipeline(
    inputVideoPath, 
    fullAudioPath,
    audioDurations,
    analysis, 
    finalOutputPath,
    backgroundId,
    disableZoom = false
) {
    const workDir = path.join(os.tmpdir(), 'temp_' + uuidv4());
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);
    console.log(`[Pipeline] Starting process in ${workDir}`);

    try {
        console.log("--- Pipeline Step 1: Background & Scaling ---");
        const intermediateStyled = path.join(workDir, 'styled_bg.mp4');
        const transformParams = await prepareBackgroundVideo(inputVideoPath, intermediateStyled, analysis, workDir, backgroundId);
        
        console.log("--- Pipeline Step 2: Transforming Segment Data ---");
        const transformedSegments = transformSegmentData(analysis.segments, transformParams);
        
        console.log("--- Pipeline Step 3: Scene-by-Scene Processing ---");
        const processedPaths = [];
        const count = Math.min(transformedSegments.length, audioDurations.length);
        
        for (let i = 0; i < count; i++) {
            console.log(`[Scene ${i}] Start processing...`);
            const seg = transformedSegments[i];
            let audioDur = audioDurations[i];
            const start = parseTime(seg.start_time);
            const end = parseTime(seg.end_time);
            const duration = end - start;
            
            const rawSegPath = path.join(workDir, `raw_${i}.mp4`);
            await runFFmpeg(['-ss', start.toString(), '-t', duration.toString(), '-i', intermediateStyled, '-an', ...FF_FLAGS, '-y', rawSegPath]);
            
            let currentSource = rawSegPath;
            if (!disableZoom) {
                const zoomEvents = getZoomEvents(seg, start, end);
                if (zoomEvents.length > 0) {
                    console.log(`[Scene ${i}] Applying zoom effects...`);
                    const zoomedPath = path.join(workDir, `zoomed_${i}.mp4`);
                    await applyMultiZoomEffect(rawSegPath, zoomedPath, zoomEvents, workDir);
                    currentSource = zoomedPath;
                }
            } else {
                console.log(`[Scene ${i}] Skipping zoom effects (disabled)...`);
            }
            
            const visualDur = getDuration(currentSource);
            const finalSegPath = path.join(workDir, `proc_${i}.mp4`);
            const timeDiff = audioDur - visualDur;
            
            console.log(`[Scene ${i}] Syncing time (Audio: ${audioDur.toFixed(2)}s, Video: ${visualDur.toFixed(2)}s)`);

            if (timeDiff > 0.02) {
                // Video is shorter than audio: Freeze last frame
                await runFFmpeg(['-i', currentSource, '-vf', `tpad=stop_mode=clone:stop_duration=${timeDiff.toFixed(3)}`, '-an', ...FF_FLAGS, '-y', finalSegPath]);
            } else {
                // Video is longer or equal: Speed up video to match audio duration
                const speedFactor = visualDur / audioDur;
                // Only speed up if the factor is significantly different from 1
                if (speedFactor > 1.001) {
                    await runFFmpeg(['-i', currentSource, '-vf', `setpts=PTS/${speedFactor.toFixed(6)}`, '-an', ...FF_FLAGS, '-y', finalSegPath]);
                } else {
                    await runFFmpeg(['-i', currentSource, '-t', audioDur.toString(), '-an', ...FF_FLAGS, '-y', finalSegPath]);
                }
            }
            processedPaths.push(finalSegPath);
        }
        
        console.log("--- Pipeline Step 4: Concatenating Scenes ---");
        const listPath = path.join(workDir, 'list.txt');
        fs.writeFileSync(listPath, processedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        const syncedVideo = path.join(workDir, 'synced.mp4');
        await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', syncedVideo]);
        
        console.log("--- Pipeline Step 5: Merging Audio ---");
        if (fullAudioPath) {
            await runFFmpeg(['-i', syncedVideo, '-i', fullAudioPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', finalOutputPath]);
        } else {
            fs.copyFileSync(syncedVideo, finalOutputPath);
        }
        
        console.log(`[Pipeline] Completed successfully. Final output: ${finalOutputPath}`);
        return finalOutputPath;
    } catch (err) {
        console.error("[Pipeline] Critical failure:", err);
        throw err;
    } finally {
        console.log(`[Pipeline] Cleaning up workspace: ${workDir}`);
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}
