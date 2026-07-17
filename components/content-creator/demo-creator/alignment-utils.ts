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
    let lastEndTimeFrames = 0;

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
        let endFrame = tWords[endWordIndex]?.end || lastEndTimeFrames;
        
        if (i === segments.length - 1 && totalAudioDuration) {
            // Assuming totalAudioDuration is still in seconds, convert to frames
            endFrame = totalAudioDuration * 30; // Assuming 30 FPS
        }

        const durationFrames = endFrame - lastEndTimeFrames;
        const durationSec = durationFrames / 30;
        result.push(Math.max(0, durationSec));
        
        lastEndTimeFrames = endFrame;
        tIndex = currentTIndex;
    }

    return result;
}

export function computeFilesData(segments: any[], transcription: any, hookStyles: any, globalHookStyle: any, totalAudioDuration: number) {
    if (!transcription || !transcription.words || transcription.words.length === 0) {
        return [];
    }

    // Clean transcription words
    const tWords: any[] = [];
    transcription.words.forEach((w: any) => {
        let cleanText = w.text.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
        const splitWords = cleanText.split(/\s+/).filter((x: string) => x.length > 0);
        splitWords.forEach((sw: string) => {
            tWords.push({ ...w, clean: sw });
        });
    });

    if (tWords.length === 0) return [];

    const filesData: any[] = [];
    let tIndex = 0;
    let lastEndTimeFrames = 0;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segWordsRaw = (seg.narration || '').toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 0);
        
        if (segWordsRaw.length === 0) {
            continue;
        }

        let sIndex = 0;
        let currentTIndex = tIndex;
        let startWordIndex = currentTIndex; // Start of segment

        while (sIndex < segWordsRaw.length && currentTIndex < tWords.length) {
            const sWord = segWordsRaw[sIndex];
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
                        if (sIndex + lookahead < segWordsRaw.length && segWordsRaw[sIndex + lookahead] === tWord) {
                            sIndex += lookahead;
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    sIndex++;
                    currentTIndex++;
                }
            }
        }

        let endWordIndex = currentTIndex > tIndex ? currentTIndex - 1 : currentTIndex;
        endWordIndex = Math.min(endWordIndex, tWords.length - 1);
        startWordIndex = Math.min(startWordIndex, tWords.length - 1);

        let startTimeFrames = tWords[startWordIndex]?.start || lastEndTimeFrames;
        let endTimeFrames = tWords[endWordIndex]?.end || lastEndTimeFrames;

        if (i === segments.length - 1 && totalAudioDuration) {
            endTimeFrames = totalAudioDuration * 30; // Assuming 30 FPS
        }

        // Get the applied hook style for this segment
        // hookStyles usually comes from project.hook_style or project.video_transform.hooks
        // But activeHookIndex is checked via project.segments[i]?.hook_style || hookStyles[i]
        const currentStyle = seg.hook_style || (hookStyles && hookStyles[i]) || globalHookStyle;
        
        if (currentStyle && currentStyle.style === 'media' && currentStyle.media) {
            filesData.push({
                file_url: currentStyle.media,
                start: startTimeFrames,
                end: endTimeFrames,
                unit: 'frames'
            });
        }

        lastEndTimeFrames = endTimeFrames;
        tIndex = currentTIndex;
    }

    return filesData;
}
