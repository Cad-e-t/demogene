
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const client = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });

// --- Configuration ---

// 1. Style Presets (Removed hardcoded presets, using dynamic config)
const PRESETS = {}; 

// Helper: Format Time for ASS (h:mm:ss.cc)
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Helper: Convert Hex to ASS Color (&HAABBGGRR)
function hexToAssColor(hex) {
    if (!hex) throw new Error("Missing color hex value");
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    
    // Default opaque
    let r = hex.substring(0, 2);
    let g = hex.substring(2, 4);
    let b = hex.substring(4, 6);
    
    return `&H00${b}${g}${r}`;
}

// Helper: Convert Hex to ASS Tag Color (&HBBGGRR&)
function hexToAssTagColor(hex) {
    if (!hex) return '&HFFFFFF&';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = hex.substring(0, 2);
    let g = hex.substring(2, 4);
    let b = hex.substring(4, 6);
    return `&H${b}${g}${r}&`;
}

// Helper: Generate ASS Header
function getAssHeader(config, aspectRatio) {
    console.log("[Subtitle] Generating ASS Header...");
    const isLandscape = aspectRatio === '16:9';
    const resX = isLandscape ? 1920 : 1080;
    const resY = isLandscape ? 1080 : 1920;
    
    if (!config || typeof config !== 'object') {
        console.error("[Subtitle] CRITICAL: Config is missing or not an object in getAssHeader!");
        throw new Error("Cannot generate ASS header: Invalid configuration object.");
    }

    // Strict Validation: Check for required fields
    const requiredFields = ['fontFamily', 'fontSize', 'primaryColor', 'secondaryColor', 'strokeWidth', 'letterSpacing', 'placement'];
    const missing = requiredFields.filter(f => config[f] === undefined || config[f] === null);
    
    if (missing.length > 0) {
        console.error(`[Subtitle] Missing required fields: ${missing.join(', ')}`);
        throw new Error(`Invalid subtitle config: Missing required fields: ${missing.join(', ')}`);
    }

    const p = {};

    p.font = config.fontFamily;
    p.fontSize = config.fontSize * 2; 
    
    // Map original IDs to technical types for the generator
    const animationType = config.animationType === 'pulse_bold' ? 'karaoke_block' : 
                         config.animationType === 'glow_focus' ? 'fade_group' : 
                         config.animationType === 'impact_pop' ? 'karaoke_bounce' : 
                         config.animationType;

    // Primary = Active (Target), Secondary = Inactive (Start)
    let activeColor = (config.animationType === 'impact_pop') ? config.primaryColor : (config.highlightColor || config.primaryColor);
    let inactiveColor = config.primaryColor;
    
    if (animationType === 'fade_group') {
        activeColor = config.primaryColor; // Target is White
        inactiveColor = config.primaryColor; // Will be made transparent
    }
    
    p.primaryColor = hexToAssColor(activeColor); 
    p.secondaryColor = hexToAssColor(inactiveColor); 
    const outline = config.secondaryColor;

    // For Typewriter (fade_group), make the base color transparent so words "appear" as read
    if (animationType === 'fade_group') {
        p.secondaryColor = "&HFF" + p.primaryColor.substring(4);
    }
    p.outlineColor = hexToAssColor(outline);
    p.backColor = "&H80000000"; 
    p.bold = -1; 
    p.spacing = config.letterSpacing * 2; // Scale for export resolution
    p.outline = config.strokeWidth; // Match visual weight of centered stroke in preview
    p.shadow = 0; 
    p.borderStyle = 1; 
    
    // Map placement to alignment/margin (Match Player 15% logic)
    if (config.placement === 'top') {
        p.alignment = 8; 
        p.marginV = Math.round(resY * 0.15);
    } else if (config.placement === 'middle') {
        p.alignment = 5; 
        p.marginV = 0;
    } else {
        p.alignment = 2; 
        p.marginV = Math.round(resY * 0.15);
    }
    
    return `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${p.font},${p.fontSize},${p.primaryColor},${p.secondaryColor},${p.outlineColor},${p.backColor},${p.bold},0,0,0,100,100,${p.spacing},0,${p.borderStyle},${p.outline},${p.shadow},${p.alignment},20,20,${p.marginV},1
`;
}

// Core Logic: Generate Word Events
function generateEvents(words, config, aspectRatio) {
    let events = "";
    if (!config.animationType) {
        throw new Error("Invalid subtitle config: Missing animationType");
    }

    // Map original IDs to technical types for the generator
    const animationType = config.animationType === 'pulse_bold' ? 'karaoke_block' : 
                         config.animationType === 'glow_focus' ? 'fade_group' : 
                         config.animationType === 'impact_pop' ? 'karaoke_bounce' : 
                         config.animationType;

    const isFade = animationType === 'fade_group';
    const threshold = isFade ? 800 : 300; // Slower pacing for fade
    
    // Word count limits per style
    const maxWords = animationType === 'karaoke_block' ? 4 : (animationType === 'fade_group' ? 5 : (animationType === 'karaoke_bounce' ? 1 : 99));

    const maxCharsPerLine = isFade 
        ? (aspectRatio === '16:9' ? 60 : 35) 
        : (aspectRatio === '16:9' ? 45 : 22); 

    let group = [];
    
    const flushGroup = (nextWordStart) => {
        if (group.length === 0) return "";

        const firstWord = group[0];
        const lastWord = group[group.length - 1];

        const startTime = formatTime(firstWord.start);
        
        let endMs = lastWord.end;
        if (nextWordStart && (nextWordStart - endMs < 300)) {
             endMs = nextWordStart;
        } else {
             endMs += 100; 
        }
        const endTime = formatTime(endMs);

        let content = "";
        const baseColorTag = `{\\1c${hexToAssTagColor(config.primaryColor)}}`;

        // --- Content Construction ---
        if (animationType === 'static' || animationType === 'none') {
            const text = group.map(w => w.text).join(' ');
            content = `${baseColorTag}${text}`; 
        }
        else {
            // Karaoke & Typewriter Styles
            // For these, we rely on the Style's Primary/Secondary colors and \k tags.
            // We only add \fad for a smooth entry/exit of the block.
            content = "{\\fad(100,100)}"; 
            if (animationType === 'fade_group') {
                content += "{\\3a&HFF&}"; // Hide outline for the whole line initially
            }

            group.forEach((word, idx) => {
                const duration = word.end - word.start;
                let gap = 0;
                if (idx < group.length - 1) {
                    gap = group[idx+1].start - word.end;
                }

                const kDur = Math.max(1, Math.round(duration / 10));
                const kGap = Math.max(0, Math.round(gap / 10));

                if (animationType === 'karaoke_bounce') {
                    // Pop Bounce: Localized transform to reduce jitter
                    const startOffset = Math.round((word.start - firstWord.start) / 10);
                    const midOffset = startOffset + Math.round(kDur / 2);
                    const endOffset = startOffset + kDur;
                    
                    content += `{\\k${kDur}\\t(${startOffset},${midOffset},\\fscx115\\fscy115)\\t(${midOffset},${endOffset},\\fscx100\\fscy100)}${word.text} `;
                } else if (animationType === 'fade_group') {
                    // Typewriter: Reveal outline as word appears
                    const startOffsetMs = Math.round(word.start - firstWord.start);
                    content += `{\\t(${startOffsetMs},${startOffsetMs + 50},\\3a&H00&)\\k${kDur}}${word.text} `;
                } else {
                    // Block highlight
                    content += `{\\k${kDur}}${word.text} `;
                }

                if (kGap > 0) content += `{\\k${kGap}} `;
            });
        }

        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${content.trim()}\n`;
    };

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word.text.trim()) continue;
        
        if (config.textTransform === 'uppercase') word.text = word.text.toUpperCase();
        if (config.textTransform === 'capitalize') word.text = word.text.replace(/\b\w/g, l => l.toUpperCase());

        let shouldGroup = true;
        
        // Grouping Logic: Natural pauses and line length and word count
        if (group.length > 0) {
            const prevWord = group[group.length - 1];
            const gap = word.start - prevWord.end;
            const currentLineLength = group.map(w => w.text).join(' ').length;
            
            if (gap > threshold || (currentLineLength + word.text.length > maxCharsPerLine) || group.length >= maxWords) {
                shouldGroup = false;
            }
        }

        if (shouldGroup) {
            group.push(word);
        } else {
            events += flushGroup(word.start);
            group = [word];
        }
    }

    events += flushGroup(null);
    return events;
}

export async function generateSubtitles(transcription, config, aspectRatio) {
    try {
        console.log(`[Subtitle] Generating subtitles from stored transcription...`);
        
        const words = transcription.words;
        if (!words || words.length === 0) return null;

        // Clean transcription: remove specific punctuations
        words.forEach(w => {
            if (w.text) w.text = w.text.replace(/— |;|\.|\,|:/g, '') 
        });

        // Generate Content
        let assContent = getAssHeader(config, aspectRatio);
        assContent += "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
        assContent += generateEvents(words, config, aspectRatio);

        // We return the content directly instead of writing to a file, 
        // to allow in-memory generation for preview and export.
        return assContent;

    } catch (e) {
        console.error("[Subtitle] Generation Error:", e);
        throw e; // Re-throw to ensure failure is visible
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