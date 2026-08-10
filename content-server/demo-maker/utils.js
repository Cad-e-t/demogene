
import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';
import numberToWords from 'number-to-words';

export function alignSegmentsWithTranscription(segments, transcription, totalAudioDuration) {
    console.log("[Alignment] Starting alignment process.");
    if (!transcription || !transcription.words || transcription.words.length === 0) {
        console.log("[Alignment] No transcription words found. Falling back to heuristic.");
        return null;
    }
    
    // 1. Clean transcription words (remove punctuation, lowercase, convert numbers)
    const tWords = [];
    transcription.words.forEach(w => {
        let cleanText = w.text.toLowerCase().replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
        if (/^\d+$/.test(cleanText)) {
            try {
                cleanText = numberToWords.toWords(parseInt(cleanText, 10)).replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
            } catch (e) {}
        }
        const splitWords = cleanText.split(/\s+/).filter(x => x.length > 0);
        splitWords.forEach(sw => {
            tWords.push({
                ...w,
                clean: sw,
                segmentIndex: -1
            });
        });
    });

    console.log(`[Alignment] Normalized ${tWords.length} transcription words.`);
    if (tWords.length === 0) return null;

    // 2. Build global script words array
    const scriptWords = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segWordsRaw = seg.narration.toLowerCase().replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        
        segWordsRaw.forEach(w => {
            if (/^\d+$/.test(w)) {
                try {
                    const converted = numberToWords.toWords(parseInt(w, 10)).replace(/[-\u2013\u2014]/g, ' ').replace(/[^a-z0-9\s]/g, '');
                    converted.split(/\s+/).filter(x => x.length > 0).forEach(sw => {
                        scriptWords.push({ clean: sw, segmentIndex: i });
                    });
                } catch (e) {
                    scriptWords.push({ clean: w, segmentIndex: i });
                }
            } else {
                scriptWords.push({ clean: w, segmentIndex: i });
            }
        });
    }

    console.log(`[Alignment] Global normalized script words: ${scriptWords.length}`);

    // 3. Global alignment with lookahead window
    let sIndex = 0;
    let tIndex = 0;

    while (sIndex < scriptWords.length && tIndex < tWords.length) {
        const sWord = scriptWords[sIndex].clean;
        const tWord = tWords[tIndex].clean;

        if (sWord === tWord) {
            tWords[tIndex].segmentIndex = scriptWords[sIndex].segmentIndex;
            sIndex++;
            tIndex++;
        } else {
            let bestMatch = null;
            let minDistance = 999;
            const WINDOW = 15;

            for (let i = 1; i <= WINDOW; i++) {
                // look ahead in tWords
                if (tIndex + i < tWords.length && tWords[tIndex + i].clean === sWord) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: 0, tStep: i }; }
                }
                // look ahead in scriptWords
                if (sIndex + i < scriptWords.length && scriptWords[sIndex + i].clean === tWord) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: i, tStep: 0 }; }
                }
                // look ahead in both
                if (sIndex + i < scriptWords.length && tIndex + i < tWords.length && scriptWords[sIndex + i].clean === tWords[tIndex + i].clean) {
                    if (i < minDistance) { minDistance = i; bestMatch = { sStep: i, tStep: i }; }
                }
            }

            if (bestMatch) {
                if (bestMatch.tStep > 0) {
                   for (let j = 0; j < bestMatch.tStep; j++) {
                       tWords[tIndex + j].segmentIndex = scriptWords[sIndex].segmentIndex;
                   }
                }
                sIndex += bestMatch.sStep;
                tIndex += bestMatch.tStep;
            } else {
                // Force advance both
                tWords[tIndex].segmentIndex = scriptWords[sIndex].segmentIndex;
                sIndex++;
                tIndex++;
            }
        }
    }

    // 4. Calculate durations
    const result = new Array(segments.length).fill(0);
    let lastValidSegmentIndex = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
        if (tWords.some(tw => tw.segmentIndex === i)) {
            lastValidSegmentIndex = i;
            break;
        }
    }

    let lastEndTimeMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const mappedTWords = tWords.filter(tw => tw.segmentIndex === i);
        
        if (mappedTWords.length > 0) {
            let endTimeMs = mappedTWords[mappedTWords.length - 1].end;
            
            if (i === lastValidSegmentIndex) {
                endTimeMs = totalAudioDuration * 1000;
            }
            
            if (endTimeMs < lastEndTimeMs) {
                endTimeMs = lastEndTimeMs;
            }
            
            const durationSec = (endTimeMs - lastEndTimeMs) / 1000;
            result[i] = durationSec;
            lastEndTimeMs = endTimeMs;
            console.log(`[Alignment] Segment ${i + 1} duration: ${durationSec}s`);
        } else {
            console.log(`[Alignment] Segment ${i + 1} completely skipped by TTS. Duration: 0s`);
            result[i] = 0;
        }
    }

    console.log(`[Alignment] Final Segment Durations: ${JSON.stringify(result)}`);
    return result;
}

export function getDuration(filePath) {
  try {
      const out = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${filePath}"`);
      const json = JSON.parse(out.toString());
      return { width: json.streams[0].width, height: json.streams[0].height };
  } catch(e) {
      console.warn("ffprobe resolution fetch failed, defaulting to 1920x1080", e.message);
      return { width: 1920, height: 1080 };
  }
}

export function getDurationValue(filePath) {
  try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const val = parseFloat(out.toString().trim());
      return isNaN(val) ? 0.0 : val;
  } catch (e) {
      console.warn("ffprobe duration fetch failed, defaulting to 0", e.message);
      return 0.0;
  }
}

export function parseTime(t) {
    if (typeof t === 'number') return t;
    if (!t) return 0;
    const parts = t.toString().split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

export async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

export function cleanup(files) {
    files.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
}
