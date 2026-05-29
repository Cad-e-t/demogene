export function alignSegmentsWithTranscription(segments: any[], transcription: any, totalAudioDuration: number) {
    if (!transcription || !transcription.words || transcription.words.length === 0) {
        return null;
    }
    
    // 1. Clean transcription words
    const tWords: any[] = [];
    transcription.words.forEach((w: any) => {
        let cleanText = w.text.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
        const splitWords = cleanText.split(/\s+/).filter((x: string) => x.length > 0);
        splitWords.forEach((sw: string) => {
            tWords.push({
                ...w,
                clean: sw
            });
        });
    });

    if (tWords.length === 0) return null;

    const result: number[] = [];
    let tIndex = 0;
    let lastEndTimeMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        
        // Clean segment words
        const segWordsRaw = (seg.narration || '').toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 0);
        const segWords: string[] = [];
        segWordsRaw.forEach((w: string) => {
             segWords.push(w);
        });

        if (segWords.length === 0) {
            result.push(0);
            continue;
        }

        let sIndex = 0;
        let currentTIndex = tIndex;

        while (sIndex < segWords.length && currentTIndex < tWords.length) {
            const sWord = segWords[sIndex];
            const tWord = tWords[currentTIndex].clean;

            if (sWord === tWord) {
                sIndex++;
                currentTIndex++;
            } else {
                let found = false;
                for (let lookahead = 1; lookahead <= 10; lookahead++) {
                    if (currentTIndex + lookahead < tWords.length && tWords[currentTIndex + lookahead].clean === sWord) {
                        currentTIndex += lookahead;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    for (let lookahead = 1; lookahead <= 10; lookahead++) {
                        if (sIndex + lookahead < segWords.length && segWords[sIndex + lookahead] === tWord) {
                            sIndex += lookahead;
                            found = true;
                            break;
                        }
                    }
                }
                
                if (!found) {
                    // advance both if mismatched completely
                    sIndex++;
                    currentTIndex++;
                }
            }
        }

        let endWordIndex = currentTIndex > tIndex ? currentTIndex - 1 : currentTIndex;
        endWordIndex = Math.min(endWordIndex, tWords.length - 1);
        
        // Fix: Use the transcription word's end time.
        // If sIndex reached the end, currentTIndex might have advanced PAST the matching word.
        // wait, when sWord === tWord, we did currentTIndex++.
        // So the actual last matched word is at currentTIndex - 1.
        // Which is what `endWordIndex` is doing!
        let endTimeMs = tWords[endWordIndex]?.end || lastEndTimeMs;
        
        if (i === segments.length - 1 && totalAudioDuration) {
            endTimeMs = totalAudioDuration * 1000;
        }

        const durationSec = (endTimeMs - lastEndTimeMs) / 1000;
        result.push(Math.max(0, durationSec));
        
        lastEndTimeMs = endTimeMs;
        tIndex = currentTIndex;
    }

    return result;
}
