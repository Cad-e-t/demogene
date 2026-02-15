
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const client = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });

// --- Configuration ---

// 1. Placement (Margins from bottom)
const PLACEMENT = {
    // 9:16 (1920h) -> Center is 960. 
    // 650 from bottom puts it at y=1270 (approx lower third).
    VERTICAL_9_16_MARGIN: 650, 
    // 16:9 (1080h) -> Center is 540.
    // 150 from bottom puts it at y=930.
    HORIZONTAL_16_9_MARGIN: 150, 
};

// 2. Style Presets
const PRESETS = {
    // Bold Social (Viral / Short-Form)
    // High contrast, yellow highlight, pop-in
    pulse_bold: { 
        font: "Allura",
        fontSize: 105,
        primaryColor: "&H0000FFFF", // Active: Yellow (BGR)
        secondaryColor: "&H00FFFFFF", // Inactive: White
        outlineColor: "&H00000000", // Black outline
        backColor: "&H80000000", // Semi-transparent shadow
        bold: -1, // True
        borderStyle: 1, // Outline
        outline: 4,
        shadow: 2,
        alignment: 2, // Bottom Center
        maxWords: 3,
        threshold: 120, // Strict grouping
        animationType: 'karaoke_block' // Block highlight
    },
    // Clean Pro (Long-Form / Professional)
    // Minimalist, no highlight, soft shadow
    glow_focus: { 
        font: "Inter",
        fontSize: 85,
        primaryColor: "&H00FFFFFF", // White
        secondaryColor: "&H00FFFFFF", // White
        outlineColor: "&H00000000",
        backColor: "&H00000000", 
        bold: 0, // False
        borderStyle: 1,
        outline: 0, // No stroke
        shadow: 3, // Soft shadow
        alignment: 2,
        maxWords: 8, // Longer chunks
        threshold: 300, // Loose grouping
        animationType: 'fade_group' // Fade in line
    },
    // Karaoke / Fun (Entertainment)
    // Colored, bouncy, interactive
    impact_pop: { 
        font: "Fredoka One",
        fontSize: 110,
        primaryColor: "&H00FF8000", // Active: Light Blue/Cyan (BGR)
        secondaryColor: "&H00FFFFFF", // Inactive: White
        outlineColor: "&H00000000",
        backColor: "&H00000000",
        bold: -1,
        borderStyle: 1,
        outline: 5,
        shadow: 0,
        alignment: 2,
        maxWords: 4,
        threshold: 150,
        animationType: 'karaoke_bounce' // Highlight + Bounce
    }
};

// Default fallback
const DEFAULT_PRESET = PRESETS.pulse_bold;

// Helper: Format Time for ASS (h:mm:ss.cc)
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Helper: Generate ASS Header
function getAssHeader(preset, aspectRatio) {
    const isLandscape = aspectRatio === '16:9';
    const resX = isLandscape ? 1920 : 1080;
    const resY = isLandscape ? 1080 : 1920;
    const marginV = isLandscape ? PLACEMENT.HORIZONTAL_16_9_MARGIN : PLACEMENT.VERTICAL_9_16_MARGIN;

    // Use default values if preset missing properties
    const p = { ...DEFAULT_PRESET, ...preset };

    return `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${p.font},${p.fontSize},${p.primaryColor},${p.secondaryColor},${p.outlineColor},${p.backColor},${p.bold},0,0,0,100,100,0,0,${p.borderStyle},${p.outline},${p.shadow},${p.alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

// Core Logic: Generate Word Events
function generateEvents(words, preset, aspectRatio) {
    let events = "";
    // Allow slightly wider text in landscape
    const maxWords = aspectRatio === '16:9' ? preset.maxWords + 1 : preset.maxWords; 
    let group = [];

    const flushGroup = (nextWordStart) => {
        if (group.length === 0) return "";

        const firstWord = group[0];
        const lastWord = group[group.length - 1];

        const startTime = formatTime(firstWord.start);
        
        // Determine sensible end time
        let endMs = lastWord.end;
        if (nextWordStart && (nextWordStart - endMs < 300)) {
             // If next word is close, snap end to next start to prevent flickering
             endMs = nextWordStart;
        } else {
             // Otherwise give a small hold time
             endMs += 100; 
        }
        const endTime = formatTime(endMs);

        // --- Content Construction ---
        let content = "";

        if (preset.animationType === 'fade_group') {
            // Clean Pro: Just text with fade
            const text = group.map(w => w.text).join(' ');
            content = `{\\fad(150,150)}${text}`;
        } 
        else {
            // Karaoke Styles (Bold Social, Fun)
            // ASS Karaoke Logic: Text starts in SecondaryColour. \k tags turn it to PrimaryColour.
            // We set Secondary=White, Primary=Highlight in styles.
            
            // Initial tags
            content = "{\\fad(0,0)}"; 

            group.forEach((word, idx) => {
                const duration = word.end - word.start;
                
                // Calculate gap to next word in this group
                let gap = 0;
                if (idx < group.length - 1) {
                    gap = group[idx+1].start - word.end;
                }

                // Convert to centiseconds for ASS
                const kDur = Math.max(1, Math.round(duration / 10));
                const kGap = Math.max(0, Math.round(gap / 10));

                if (preset.animationType === 'karaoke_bounce') {
                    // Pop effect: Scale up to 120% then back
                    // \t(start, end, modifiers) relative to event start
                    // We approximate per-word bounce using \t timing relative to karaoke flow is hard in one line.
                    // Simplified: Just scale active word via karaoke tag? No, standard ASS doesn't support \k triggers for transform.
                    // Advanced: We simply apply the karaoke fill.
                    content += `{\\k${kDur}}${word.text} `;
                } else {
                    // Block highlight (Bold Social)
                    content += `{\\k${kDur}}${word.text} `;
                }

                // Add spacing time
                if (kGap > 0) content += `{\\k${kGap}} `;
            });
        }

        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${content.trim()}\n`;
    };

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word.text.trim()) continue;

        let shouldGroup = false;
        
        // Grouping Logic
        if (group.length > 0 && group.length < maxWords) {
            const prevWord = group[group.length - 1];
            const gap = word.start - prevWord.end;
            if (gap <= preset.threshold) {
                shouldGroup = true;
            }
        }

        if (shouldGroup) {
            group.push(word);
        } else {
            // Flush old group
            events += flushGroup(word.start);
            // Start new group
            group = [word];
        }
    }

    // Flush final group
    events += flushGroup(null);
    
    return events;
}

export async function generateSubtitles(audioPath, styleId, aspectRatio) {
    if (!ASSEMBLYAI_API_KEY) {
        console.warn("Skipping subtitles: ASSEMBLYAI_API_KEY not found.");
        return null;
    }

    try {
        console.log(`[Subtitle] Transcribing audio...`);
        const transcript = await client.transcripts.transcribe({
            audio: audioPath,
             speech_models: ["universal-3-pro", "universal-2"],
            language_detection: true,
        });

        if (transcript.status === 'error') {
            throw new Error(`Transcription failed: ${transcript.error}`);
        }

        const { words } = transcript;
        if (!words || words.length === 0) return null;

        // Clean transcription: replace em dashes with spaces
        words.forEach(w => {
            if (w.text) w.text = w.text.replace(/—/g, ' ');
        });

        // Select Preset
        const preset = PRESETS[styleId] || PRESETS.pulse_bold;

        // Generate Content
        let assContent = getAssHeader(preset, aspectRatio);
        assContent += generateEvents(words, preset, aspectRatio);

        const assPath = path.join(path.dirname(audioPath), 'subtitles.ass');
        fs.writeFileSync(assPath, assContent);
        
        console.log(`[Subtitle] Generated ASS file at ${assPath} using preset ${styleId}`);
        return assPath;

    } catch (e) {
        console.error("[Subtitle] Generation Error:", e);
        return null;
    }
}

export async function burnSubtitles(videoPath, assPath, outputPath) {
    return new Promise((resolve, reject) => {
        // Use forward slashes for filter path even on Windows to prevent escaping issues
        const filterPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:'); 

        const args = [
            '-i', videoPath,
            '-vf', `ass='${filterPath}'`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-c:a', 'copy',
            '-y', outputPath
        ];

        const proc = spawn('ffmpeg', args);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
            if (code === 0) resolve();
            else {
                console.error("FFmpeg Burn Error:", stderr);
                reject(new Error(`FFmpeg burn failed code ${code}`));
            }
        });
    });
}
