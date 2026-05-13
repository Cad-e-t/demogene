
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
    // libass maps ASS sizes identically to point units instead of pixel units (like HTML Canvas does). 
    // We multiply by 1.33 (96/72) to precisely map the export back to the WYSIWYG player's 1080p canvas proportions.
    p.fontSize = Math.round(config.fontSize * 1.333); 
    
    // Map original IDs to technical types for the generator
    const animationType = config.animationType === 'pulse_bold' ? 'karaoke_block' : 
                         config.animationType === 'glow_focus' ? 'fade_group' : 
                         config.animationType === 'impact_pop' ? 'karaoke_bounce' : 
                         config.animationType;

    const maxWords = config.maxWords !== undefined ? config.maxWords : 99;
    const isWordByWord = maxWords <= 1;

    // activeColor is for highlighted word, inactiveColor is for non-highlighted word
    // Unless explicitly karaoke bounce (which is a scale effect, not color) we use highlight color
    const isKaraokeBounce = animationType === 'impact_pop' || animationType === 'karaoke_bounce';
    
    let activeColor = isKaraokeBounce ? config.primaryColor : (config.highlightColor || config.primaryColor);
    let inactiveColor = config.primaryColor;
    
    if (animationType === 'fade_group' || isWordByWord) {
        activeColor = config.primaryColor; 
        inactiveColor = config.primaryColor; 
    }
    
    p.primaryColor = hexToAssColor(activeColor); 
    p.secondaryColor = hexToAssColor(inactiveColor); 
    const outline = config.secondaryColor;

    // For Typewriter (fade_group), make the base color transparent so words "appear" as read
    if (animationType === 'fade_group') {
        p.secondaryColor = "&HFF" + p.primaryColor.substring(4);
    }
    
    // Check if we have advanced shadow/glow
    let shadowColorStr = "&H80000000"; // Default semi-transparent black
    if (config.advancedStyle?.shadow) {
        const shadowDef = Array.isArray(config.advancedStyle.shadow) ? config.advancedStyle.shadow[0] : config.advancedStyle.shadow;
        if (shadowDef && shadowDef.color && shadowDef.color !== 'transparent' && shadowDef.color !== 'none') {
            shadowColorStr = hexToAssColor(shadowDef.color);
            // Wait, hexToAssColor returns standard &HBBGGRR&. If we want opacity, we could try parsing it.
            // But hexToAssColor handles hex correctly. Let's just use it.
        }
    }
    
    p.outlineColor = hexToAssColor(outline);
    p.backColor = shadowColorStr; 
    p.bold = isNaN(parseInt(config.fontWeight)) ? (config.fontWeight === 'normal' ? 0 : -1) : parseInt(config.fontWeight);
    p.italic = config.fontStyle === 'italic' ? -1 : 0;
    p.spacing = config.letterSpacing || 0; // Removing multiplier to fix wild spacing issue
    p.outline = config.strokeWidth / 2; // Match centered stroke weight of Canvas 2D, NO 1.33 multiplier as outline shouldn't be inflated
    
    // Correctly map shadow offset, not blur, to ASS shadow depth
    p.shadow = 0;
    if (config.advancedStyle?.shadow) {
        const shadowDef = Array.isArray(config.advancedStyle.shadow) ? config.advancedStyle.shadow[0] : config.advancedStyle.shadow;
        if (shadowDef?.offset) {
            const offsets = shadowDef.offset.split(' ').map(s => parseInt(s));
            // Take the larger of the two offsets for the overall shadow depth
            p.shadow = Math.max(Math.abs(offsets[0] || 0), Math.abs(offsets[1] || 0));
        }
        
        // If there's no offset but there is a blur, give a tiny shadow depth so libass renders the shadow
        if (p.shadow === 0 && shadowDef?.blur && parseFloat(shadowDef.blur) > 0) {
            p.shadow = 0.01;
        }
    }
    
    p.borderStyle = 1; 

    // Make border scaling true so Outline scales correctly without random assumptions
    const borderScalingStr = "ScaledBorderAndShadow: yes";
    
    // Map placement to alignment/margin (Match Player logic)
    p.alignment = 2; // Bottom center
    const placementValue = typeof config.placement === 'number' ? config.placement : 15;
    p.marginV = Math.round(resY * (placementValue / 100));
    
    return `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
ScaledBorderAndShadow: yes
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${p.font},${p.fontSize},${p.primaryColor},${p.secondaryColor},${p.outlineColor},${p.backColor},${p.bold},${p.italic},0,0,100,100,${p.spacing},0,${p.borderStyle},${p.outline},${p.shadow},${p.alignment},20,20,${p.marginV},1\n`;
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

    const maxWords = config.maxWords !== undefined ? config.maxWords : 99;
    const isWordByWord = maxWords <= 1;
    const resolvedHighlightColor = isWordByWord ? config.primaryColor : (config.highlightColor || config.primaryColor);

    const isFade = animationType === 'fade_group';
    const threshold = isFade ? 800 : 300; // Slower pacing for fade
    const maxCharsPerLine = isFade 
        ? (aspectRatio === '16:9' ? 60 : 35) 
        : (aspectRatio === '16:9' ? 45 : 22);

    let group = [];
    
    // Add advanced styling tags (like blur for neon glow)
    let globalStyleTags = "";
    if (config.advancedStyle?.shadow) {
        const shadowDef = Array.isArray(config.advancedStyle.shadow) ? config.advancedStyle.shadow[0] : config.advancedStyle.shadow;
        if (shadowDef?.blur) {
            // Apply a local blur tag to match glowing effect
            const blurVal = parseInt(shadowDef.blur) * 0.15; 
            if (blurVal > 0) {
                globalStyleTags += `\\blur${blurVal.toFixed(1)}\\xshad0.01\\yshad0.01`;
            }
        }
    }
    
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
        const baseColorTag = `{\\1c${hexToAssTagColor(config.primaryColor)}${globalStyleTags}}`;

        // --- Content Construction ---
        if (animationType === 'static' || animationType === 'none' || isWordByWord) {
            const text = group.map(w => w.text).join(' ');
            content = `${baseColorTag}${text}`; 
        }
        else {
            // Karaoke & Typewriter Styles
            // For these, we rely on the Style's Primary/Secondary colors and \k tags.
            // We only add \fad for a smooth entry/exit of the block.
            content = animationType === 'fade_group' ? `{${globalStyleTags}}` : `{\\fad(100,100)${globalStyleTags}}`; 

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
                    
                    content += `{\\k${kDur}\\t(${startOffset},${midOffset},\\fscx115\\fscy115)\\t(${midOffset},${endOffset},\\fscx100\\fscy100)}${word.text}`;
                } else if (animationType === 'fade_group') {
                    // Typewriter: Reveal outline and fill as word appears, with transient highlight
                    const startOffsetMs = Math.round(word.start - firstWord.start);
                    const endOffsetMs = Math.round(word.end - firstWord.start);
                    const highlightTag = hexToAssTagColor(resolvedHighlightColor);
                    const primaryTag = hexToAssTagColor(config.primaryColor);
                    
                    if (startOffsetMs === 0) {
                        // First word: already visible, just handle color transition
                        content += `{\\1c${highlightTag}\\t(${endOffsetMs},${endOffsetMs},\\1c${primaryTag})}${word.text}`;
                    } else {
                        // Subsequent words: hidden initially, reveal and highlight at startOffsetMs
                        content += `{\\1a&HFF&\\3a&HFF&\\t(${startOffsetMs},${startOffsetMs},\\1a&H00&\\3a&H00&)\\1c${highlightTag}\\t(${endOffsetMs},${endOffsetMs},\\1c${primaryTag})}${word.text}`;
                    }
                } else {
                    // Block highlight: Pulse Bold (karaoke_block) should only highlight the ACTIVE word
                    const startOffsetMs = Math.round(word.start - firstWord.start);
                    const endOffsetMs = Math.round(word.end - firstWord.start);
                    const highlightTag = hexToAssTagColor(resolvedHighlightColor);
                    const primaryTag = hexToAssTagColor(config.primaryColor);
                    
                    if (startOffsetMs === 0) {
                        content += `{\\1c${highlightTag}\\t(${endOffsetMs},${endOffsetMs},\\1c${primaryTag})\\k${kDur}}${word.text}`;
                    } else {
                        content += `{\\1c${primaryTag}\\t(${startOffsetMs},${startOffsetMs},\\1c${highlightTag})\\t(${endOffsetMs},${endOffsetMs},\\1c${primaryTag})\\k${kDur}}${word.text}`;
                    }
                }

                if (idx < group.length - 1) {
                    if (kGap > 0 && animationType !== 'fade_group') {
                        content += `{\\k${kGap}} `;
                    } else {
                        content += ` `;
                    }
                }
            });
        }

        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${content.trim()}\n`;
    };

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word.text.trim()) continue;
        
        if (config.textTransform === 'uppercase') word.text = word.text.toUpperCase();
        else if (config.textTransform === 'lowercase') word.text = word.text.toLowerCase();
        else if (config.textTransform === 'capitalize') word.text = word.text.replace(/\b\w/g, l => l.toUpperCase());

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
            if (w.text) w.text = w.text.replace(/— |;|:|(?<!\d)[.,]|[.,](?!\d)/g, '') 
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
            '-crf', '18',
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