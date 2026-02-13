
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const client = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });

// --- ASS Templates ---

// 1. Pulse Bold (High Retention - TikTok)
// Bottom Center, Large Font, Current word scales, Active: Yellow, Shadow
const TEMPLATE_PULSE = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,110,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,4,2,20,20,550,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

// 2. Glow Focus (YouTube)
// Bottom Third, Rounded Font, Glow Effect on Active Word
// Primary: White, Active: Neon Blue Glow
const TEMPLATE_GLOW = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Rounded MT Bold,90,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,50,50,550,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

// 3. Impact Pop (High Energy)
// Bottom, Condensed Font, Active word Gradient/Pop
const TEMPLATE_IMPACT = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Impact,115,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,4,2,30,30,550,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

// Helper: Format Time for ASS (h:mm:ss.cc)
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Helper: Generate Karaoke Lines
function generateKaraokeEvents(words, preset, aspectRatio) {
    let events = "";
    
    // For 9:16: High intensity, max 3 words, swing up animation
    // For 16:9: Standard karaoke block (more words readable)
    const isVertical = aspectRatio === '9:16';
    const CHUNK_SIZE = isVertical ? 3 : 5; 
    
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        const chunk = words.slice(i, i + CHUNK_SIZE);
        const startTimeMs = chunk[0].start;
        const endTimeMs = chunk[chunk.length - 1].end;
        
        // Add small padding to end so words don't disappear instantly
        const startTime = formatTime(startTimeMs);
        const endTime = formatTime(endTimeMs + 100);
        
        let lineText = "";
        
        if (isVertical) {
            // --- 9:16 ANIMATION LOGIC (Vertical Swing Up) ---
            // Tag structure: Start hidden -> Transform to visible/upright at specific time -> Highlight active
            
            chunk.forEach(word => {
                const text = word.text.replace(/—/g, ' ');
                
                // Calculate timing relative to the start of this line event
                const relStart = word.start - startTimeMs;
                // Animation duration (snappy 100ms)
                const animDur = 100;
                
                // Highlight Color based on preset
                let highlightColor = "&H00D4FF&"; // Default Yellow
                if (preset === 'glow_focus') highlightColor = "&H00FFFF&"; // Yellow-ish
                if (preset === 'impact_pop') highlightColor = "&H0080FF&"; // Orange-ish
                
                // Base State: Transparent (Alpha FF), Rotated 90deg X (Flat), Squashed Y (0)
                // Transform:  Opaque (Alpha 00), Rotated 0deg X (Upright), Scale Y 100
                const entryAnim = `\\t(${relStart},${relStart + animDur},\\alpha&H00&\\frx0\\fscy100)`;
                
                // Active State (Highlight): Standard karaoke \k doesn't mix well with \t for geometry.
                // We use another transform for the color pop.
                const activeAnim = `\\t(${relStart},${relStart + animDur},\\1c${highlightColor})`;
                
                // Reset color after word is done? Optional, but keeping it highlighted is better for readability in the chunk.
                
                lineText += `{\\alpha&HFF&\\frx90\\fscy0${entryAnim}${activeAnim}}${text} `;
            });

        } else {
            // --- 16:9 STANDARD KARAOKE ---
            chunk.forEach(word => {
                const durationCs = Math.round((word.end - word.start) / 10);
                const text = word.text.replace(/—/g, ' '); 
                
                // Apply Preset Styling per word
                if (preset === 'pulse_bold') {
                    // Active: Yellow + Scale Up/Down
                    lineText += `{\\k${durationCs}}{\\t(0,100,\\fscx110\\fscy110)\\t(100,${durationCs*10},\\fscx100\\fscy100)\\1c&H00D4FF&}${text}{\\r} `;
                } else if (preset === 'glow_focus') {
                    // Active: Blue Glow (Outline color change)
                    lineText += `{\\k${durationCs}}{\\3c&HFF0000&\\bord5}${text}{\\r} `;
                } else if (preset === 'impact_pop') {
                    // Active: Pop + Shake + Gradient (Simulated by Orange color)
                    lineText += `{\\k${durationCs}}{\\t(0,50,\\fscx115\\fscy115)\\t(50,100,\\fscx100\\fscy100)\\1c&H0080FF&}${text}{\\r} `;
                } else {
                    lineText += `{\\k${durationCs}}${text} `;
                }
            });
        }

        events += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${lineText.trim()}\n`;
    }
    
    return events;
}

export async function generateSubtitles(audioPath, style, aspectRatio) {
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

        // Generate ASS Content
        let assContent = "";
        let presetId = style || 'pulse_bold';
        
        if (presetId === 'pulse_bold') assContent = TEMPLATE_PULSE;
        else if (presetId === 'glow_focus') assContent = TEMPLATE_GLOW;
        else if (presetId === 'impact_pop') assContent = TEMPLATE_IMPACT;
        else assContent = TEMPLATE_PULSE;

        // Adjust for Aspect Ratio (16:9 adjustments)
        if (aspectRatio === '16:9') {
            assContent = assContent.replace("PlayResX: 1080", "PlayResX: 1920");
            assContent = assContent.replace("PlayResY: 1920", "PlayResY: 1080");
            // Adjust margins for landscape (Slightly raised from absolute bottom)
            assContent = assContent.replace(/MarginV, \d+/, "MarginV, 150"); 
        }

        assContent += generateKaraokeEvents(words, presetId, aspectRatio);

        const assPath = path.join(path.dirname(audioPath), 'subtitles.ass');
        fs.writeFileSync(assPath, assContent);
        
        console.log(`[Subtitle] Generated ASS file at ${assPath}`);
        return assPath;

    } catch (e) {
        console.error("[Subtitle] Generation Error:", e);
        return null;
    }
}

export async function burnSubtitles(videoPath, assPath, outputPath) {
    return new Promise((resolve, reject) => {
        // Use forward slashes for filter path even on Windows
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
