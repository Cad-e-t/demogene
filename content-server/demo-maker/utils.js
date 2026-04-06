
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
        let cleanText = w.text.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
        if (/^\d+$/.test(cleanText)) {
            try {
                cleanText = numberToWords.toWords(parseInt(cleanText, 10)).replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
            } catch (e) {}
        }
        const splitWords = cleanText.split(/\s+/).filter(x => x.length > 0);
        splitWords.forEach(sw => {
            tWords.push({
                ...w,
                clean: sw
            });
        });
    });

    console.log(`[Alignment] Normalized ${tWords.length} transcription words.`);

    if (tWords.length === 0) return null;

    const result = [];
    let tIndex = 0;
    let lastEndTimeMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        console.log(`\n[Alignment] Processing Segment ${i + 1}: "${seg.narration.substring(0, 30)}..."`);
        
        // Clean segment words (remove punctuation, lowercase, convert numbers)
        const segWordsRaw = seg.narration.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        const segWords = [];
        segWordsRaw.forEach(w => {
            if (/^\d+$/.test(w)) {
                try {
                    const converted = numberToWords.toWords(parseInt(w, 10)).replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
                    converted.split(/\s+/).filter(x => x.length > 0).forEach(sw => segWords.push(sw));
                } catch (e) {
                    segWords.push(w);
                }
            } else {
                segWords.push(w);
            }
        });

        console.log(`[Alignment] Segment ${i + 1} normalized words: ${segWords.length}`);

        if (segWords.length === 0) {
            console.log(`[Alignment] Segment ${i + 1} has no words. Duration: 0s`);
            result.push(0);
            continue;
        }

        let sIndex = 0;
        let currentTIndex = tIndex;

        // Two-pointer approach with lookahead for fuzzy matching
        while (sIndex < segWords.length && currentTIndex < tWords.length) {
            const sWord = segWords[sIndex];
            const tWord = tWords[currentTIndex].clean;

            if (sWord === tWord) {
                console.log(`[Alignment] Matched: "${sWord}"`);
                sIndex++;
                currentTIndex++;
            } else {
                let found = false;
                // Lookahead in transcription (e.g. TTS expanded "100" to "one hundred")
                for (let lookahead = 1; lookahead <= 5; lookahead++) {
                    if (currentTIndex + lookahead < tWords.length && tWords[currentTIndex + lookahead].clean === sWord) {
                        console.log(`[Alignment] Lookahead matched transcription word "${sWord}" at offset +${lookahead}`);
                        currentTIndex += lookahead; // Advance to the match
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Lookahead in segment (e.g. TTS skipped a word)
                    for (let lookahead = 1; lookahead <= 5; lookahead++) {
                        if (sIndex + lookahead < segWords.length && segWords[sIndex + lookahead] === tWord) {
                            console.log(`[Alignment] Lookahead matched segment word "${tWord}" at offset +${lookahead}`);
                            sIndex += lookahead; // Advance to the match
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    // Force advance both if completely lost
                    console.log(`[Alignment] Mismatch at sWord="${sWord}", tWord="${tWord}". Forcing advance.`);
                    sIndex++;
                    currentTIndex++;
                }
            }
        }

        // The end of this segment is the word we just passed
        let endWordIndex = currentTIndex > tIndex ? currentTIndex - 1 : currentTIndex;
        endWordIndex = Math.min(endWordIndex, tWords.length - 1);
        
        let endTimeMs = tWords[endWordIndex].end;
        
        // If this is the last segment, ensure it captures the very end of the audio
        if (i === segments.length - 1) {
            endTimeMs = totalAudioDuration * 1000;
            console.log(`[Alignment] Final segment. Forcing end time to total audio duration: ${endTimeMs}ms`);
        }

        const durationSec = (endTimeMs - lastEndTimeMs) / 1000;
        console.log(`[Alignment] Segment ${i + 1} mapped to transcription words [${tIndex} ... ${endWordIndex}]. Duration: ${durationSec}s`);
        
        result.push(Math.max(0, durationSec)); // Ensure no negative durations
        
        lastEndTimeMs = endTimeMs;
        tIndex = currentTIndex;
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
