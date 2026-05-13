import React from 'react';
import { motion } from 'motion/react';
import { SubtitleConfiguration } from './types';

import { subtitlePresets } from './SubtitlePreviews';

const PresetPreview = ({ preset }: { preset: any }) => {
    const isWordByWord = preset.animation.type === 'word-by-word';
    const isWordAccumulate = preset.animation.type === 'word-by-word-accumulate';
    const isLineByLineWordHighlight = preset.animation.type === 'line-by-line-with-word-highlight' || preset.animation.type === 'continuous-fill';
    const isLineByLine = preset.animation.type === 'line-by-line';
    const isLetterByLetter = preset.animation.type === 'letter-by-letter';

    const words = preset.name.split(' ');
    const chars = preset.name.split('');
    
    let highlightColor = preset.colors.highlight === 'none' || preset.colors.highlight === 'transparent' ? '#FFFFFF' : preset.colors.highlight;
    const textColor = preset.colors.text.startsWith('Random') ? '#FFFFFF' : preset.colors.text;
    
    // If text is black, default highlight to something white if it's missing, mostly to make sure they differ if they're both white
    if (highlightColor === '#FFFFFF' && textColor === '#FFFFFF' && isWordByWord === false) {
        highlightColor = '#FFD700'; // fallback just for preview highlighting
    }

    const strokeWidthVal = preset.style?.stroke?.width ? parseFloat(preset.style.stroke.width) : 0;
    // Scale down the stroke width significantly for the 12px preview font, or cap it, so it doesn't obscure the text.
    const strokeW = strokeWidthVal > 0 ? Math.min(1, strokeWidthVal / 10) + 'px' : '0px';

    const baseStyle: React.CSSProperties = {
        fontFamily: preset.font.family,
        fontWeight: preset.font.weight,
        fontStyle: preset.font.italic ? 'italic' : 'normal',
        textTransform: preset.font.transform as any,
        WebkitTextStroke: preset.style?.stroke && strokeWidthVal > 0 ? `${strokeW} ${preset.style.stroke.color}` : undefined,
        paintOrder: 'stroke fill',
        textShadow: !Array.isArray(preset.style?.shadow) && preset.style?.shadow ? `0px 2px ${parseFloat(preset.style.shadow.blur)/2}px ${preset.style.shadow.color}` : 'none',
        color: textColor,
    };

    if (preset.style?.backgroundClip === 'text') {
        baseStyle.backgroundClip = 'text';
        baseStyle.WebkitBackgroundClip = 'text';
        baseStyle.backgroundImage = preset.style.backgroundImage;
        baseStyle.color = 'transparent';
    }
    
    const containerBg = preset.style?.background?.type ? preset.style.background.color.replace('Randomized', 'rgba(0,0,0,0.5)') : 'transparent';
    const hasBg = preset.style?.background?.type && preset.style?.background?.type !== 'none';
    
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.2em',
        width: '100%',
        background: containerBg,
        padding: hasBg ? '4px 8px' : '0',
        borderRadius: preset.style?.background?.type === 'pill' ? '999px' : '4px',
    };

    const durationPerWord = 0.4;
    const totalDuration = words.length * durationPerWord + 1.5; 

    if (isWordByWord) {
        return (
            <div className="flex items-center justify-center w-full h-[30px] relative">
                {words.map((word: string, i: number) => {
                    const startT = i * durationPerWord / totalDuration;
                    const popT = (i * durationPerWord + 0.05) / totalDuration;
                    const endT = ((i + 1) * durationPerWord) / totalDuration;
                    return (
                        <motion.span
                            key={i}
                            className="text-[13px] absolute w-full text-center"
                            style={baseStyle}
                            animate={{
                                opacity: [0, 0, 1, 1, 0, 0],
                                scale: [0.5, 0.5, 1.2, 1, 0.8, 0.8],
                                rotate: preset.style?.rotation?.includes('Randomized') ? [0, 0, (i % 2 === 0 ? 5 : -5), 0, 0, 0] : [0, 0, 0, 0, 0, 0]
                            }}
                            transition={{
                                duration: totalDuration,
                                times: [0, startT, popT, endT - 0.02, endT, 1],
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        >
                            {word}
                        </motion.span>
                    );
                })}
            </div>
        );
    } 

    if (isWordAccumulate) {
        return (
            <div className="flex flex-wrap items-center justify-center gap-[0.2em] w-full text-center">
                {words.map((word: string, i: number) => {
                    const startT = i * durationPerWord / totalDuration;
                    const popT = (i * durationPerWord + 0.05) / totalDuration;
                    return (
                        <motion.span
                            key={i}
                            className="text-[12px]"
                            style={baseStyle}
                            animate={{ 
                                opacity: [0, 0, 1, 1, 0], 
                                scale: [0.5, 0.5, 1, 1, 0.5] 
                            }}
                            transition={{
                                duration: totalDuration,
                                times: [0, startT, popT, 0.9, 1],
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        >
                            {word}
                        </motion.span>
                    );
                })}
            </div>
        );
    }

    if (isLineByLineWordHighlight) {
        return (
            <div className="flex flex-wrap items-center justify-center gap-[0.2em] w-full text-center" style={containerStyle}>
                {words.map((word: string, i: number) => {
                    const startT = i * durationPerWord / totalDuration;
                    const popT = (i * durationPerWord + 0.05) / totalDuration;
                    const endT = ((i + 1) * durationPerWord) / totalDuration;
                    return (
                        <motion.span
                            key={i}
                            className="text-[12px]"
                            style={{
                                ...baseStyle,
                                color: undefined // Let animation handle color
                            }}
                            animate={{
                                color: [textColor, textColor, highlightColor, highlightColor, textColor, textColor],
                                scale: [1, 1, 1.1, 1.1, 1, 1]
                            }}
                            transition={{
                                duration: totalDuration,
                                times: [0, startT, popT, endT - 0.02, endT, 1],
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        >
                            {word}
                        </motion.span>
                    );
                })}
            </div>
        );
    }

    if (isLetterByLetter) {
        const letterDur = 0.1;
        const totLetterDur = chars.length * letterDur + 1.5;
        return (
            <div className="flex items-center justify-center w-full text-center whitespace-pre" style={containerStyle}>
                {chars.map((char: string, i: number) => {
                    const startT = i * letterDur / totLetterDur;
                    const popT = (i * letterDur + 0.05) / totLetterDur;
                    return (
                        <motion.span
                            key={i}
                            className="text-[12px]"
                            style={baseStyle}
                            animate={{ opacity: [0, 0, 1, 1, 0] }}
                            transition={{
                                duration: totLetterDur,
                                times: [0, startT, popT, 0.9, 1],
                                repeat: Infinity,
                            }}
                        >
                            {char}
                        </motion.span>
                    );
                })}
            </div>
        );
    }

    // Default: line-by-line
    return (
        <div style={containerStyle} className="h-full w-full flex items-center justify-center overflow-hidden relative">
            <motion.div 
                className="flex items-center justify-center w-full text-center z-10"
                animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
                transition={{ duration: 2.5, times: [0, 0.1, 0.9, 1], repeat: Infinity, ease: "easeOut" }}
            >
                <span className="text-[12px] whitespace-nowrap" style={baseStyle}>{preset.name}</span>
            </motion.div>
        </div>
    );
};

interface SubtitleConfigurationPanelProps {
    subtitles: SubtitleConfiguration;
    subtitleState: 'enabled' | 'disabled';
    subtitleView: 'summary' | 'edit' | 'transcription';
    setSubtitleView: (view: 'summary' | 'edit' | 'transcription') => void;
    handleSubtitleStateToggle: () => void;
    handleSubtitleUpdate: (updates: Partial<SubtitleConfiguration>) => void;
    transcription?: any;
    currentTime?: number;
    handleTranscriptionUpdate?: (newTranscription: any) => void;
}

export const SubtitleConfigurationPanel: React.FC<SubtitleConfigurationPanelProps> = ({
    subtitles,
    subtitleState,
    subtitleView,
    setSubtitleView,
    handleSubtitleStateToggle,
    handleSubtitleUpdate,
    transcription,
    currentTime = 0,
    handleTranscriptionUpdate
}) => {
    const [isEditingTranscription, setIsEditingTranscription] = React.useState(false);
    const [editedTranscriptionText, setEditedTranscriptionText] = React.useState('');
    const [transcriptionError, setTranscriptionError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (subtitleView === 'transcription' && transcription?.words) {
            setEditedTranscriptionText(transcription.words.map((w: any) => w.text).join(' '));
        }
    }, [subtitleView, transcription]);

    if (subtitleView === 'summary') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${subtitleState === 'enabled' ? 'bg-green-900/20 text-green-600' : 'bg-zinc-900 text-zinc-500'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Subtitles</div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                                {subtitleState === 'enabled' ? 'Enabled' : 'Disabled'}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleSubtitleStateToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${subtitleState === 'enabled' ? 'bg-green-600' : 'bg-zinc-900'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${subtitleState === 'enabled' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => setSubtitleView('edit')}
                        className="w-full p-4 bg-black border border-white/10 rounded-2xl flex items-center justify-between hover:border-white/20 transition group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-white transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-white">Edit Style</div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Customize appearance</div>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <button 
                        onClick={() => setSubtitleView('transcription')}
                        className="w-full p-4 bg-black border border-white/10 rounded-2xl flex items-center justify-between hover:border-white/20 transition group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-white transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-white">Transcription</div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Edit spoken words</div>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        );
    }

    if (subtitleView === 'transcription') {
        const handleSaveTranscription = () => {
            if (!transcription?.words || !handleTranscriptionUpdate) return;
            
            const newWords = editedTranscriptionText.trim().split(/\s+/);
            const updatedTranscription = {
                ...transcription,
                words: newWords.map((text, i) => ({
                    ...(transcription.words[i] || transcription.words[transcription.words.length - 1]),
                    text
                }))
            };

            handleTranscriptionUpdate(updatedTranscription);
            setIsEditingTranscription(false);
            setTranscriptionError(null);
        };

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <button 
                        onClick={() => {
                            setSubtitleView('summary');
                            setIsEditingTranscription(false);
                            setTranscriptionError(null);
                        }}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                    </button>
                    <button 
                        onClick={() => {
                            if (isEditingTranscription) {
                                handleSaveTranscription();
                            } else {
                                setIsEditingTranscription(true);
                            }
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition"
                    >
                        {isEditingTranscription ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        )}
                    </button>
                </div>

                <div className="relative">
                    {isEditingTranscription ? (
                        <textarea
                            value={editedTranscriptionText}
                            onChange={(e) => setEditedTranscriptionText(e.target.value)}
                            className="w-full h-[400px] p-4 bg-black border border-white/10 rounded-2xl text-sm leading-relaxed text-white focus:border-yellow-500 outline-none resize-none"
                        />
                    ) : (
                        <div className="w-full h-[400px] p-4 bg-black border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar">
                            <div className="flex flex-wrap gap-x-1 gap-y-2">
                                {transcription?.words?.map((word: any, i: number) => {
                                    const isHighlighted = currentTime * 1000 >= word.start && currentTime * 1000 <= word.end;
                                    return (
                                        <span 
                                            key={i}
                                            className={`text-sm transition-colors duration-200 ${isHighlighted ? 'text-yellow-500 font-bold' : 'text-zinc-400'}`}
                                        >
                                            {word.text}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {transcriptionError && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-900/50 rounded-lg text-[10px] text-red-500 font-bold uppercase">
                            {transcriptionError}
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                    {isEditingTranscription ? 'Editing transcription' : 'Karaoke highlighting active during playback'}
                </p>
            </div>
        );
    }
    return (
        <div className="md:space-y-4 space-y-2">
            <style>{`
                .style-tile-pulse {
                    animation: tilePulse 1.5s infinite alternate;
                }
                @keyframes tilePulse {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.05); }
                }
                .style-tile-typewriter {
                    display: inline-block;
                    overflow: hidden;
                    white-space: nowrap;
                    border-right: 2px solid white;
                    animation: typing 3s steps(10, end) infinite, blink-caret .75s step-end infinite;
                }
                @keyframes typing {
                    0%, 20% { width: 0; }
                    40%, 80% { width: 100%; }
                    100% { width: 0; }
                }
                @keyframes blink-caret {
                    from, to { border-color: transparent }
                    50% { border-color: white; }
                }
                .style-tile-pop {
                    animation: tilePop 1s infinite;
                }
                @keyframes tilePop {
                    0% { transform: scale(0.9); opacity: 0; }
                    20% { transform: scale(1.1); opacity: 1; }
                    40% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <button 
                onClick={() => setSubtitleView('summary')}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-1 md:mb-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
            </button>

            {/* Caption Styles */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-500 uppercase">Caption Styles</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {subtitlePresets.map((preset) => {
                        const isSelected = subtitles.presetId === preset.id || subtitles.animationType === preset.id;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => {
                                    handleSubtitleUpdate({ 
                                        presetId: preset.id,
                                        animationType: preset.animation.type,
                                        fontFamily: preset.font.family,
                                        textTransform: preset.font.transform as any,
                                        primaryColor: preset.colors.text.startsWith('Random') ? '#FFFFFF' : preset.colors.text,
                                        highlightColor: preset.colors.highlight === 'none' || preset.colors.highlight === 'transparent' ? '#FFFFFF' : preset.colors.highlight,
                                        secondaryColor: preset.style?.stroke?.color || '#000000',
                                        strokeWidth: preset.style?.stroke?.width ? parseInt(preset.style.stroke.width) : 0,
                                        fontStyle: preset.font.italic ? 'italic' : 'normal',
                                        fontWeight: preset.font.weight,
                                        placement: preset.layout.placement || 35,
                                        maxWords: preset.layout.maxLines,
                                        advancedStyle: preset.style,
                                        advancedLayout: preset.layout,
                                        advancedAnimation: preset.animation,
                                        advancedColors: preset.colors
                                    });
                                }}
                                className={`relative h-20 rounded-xl border-2 overflow-hidden transition-all flex flex-col items-center justify-center p-2
                                    ${isSelected ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 hover:border-white/20 bg-zinc-900/50 hover:bg-zinc-800'}`}
                            >
                                <PresetPreview preset={preset} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Font</label>
                <select
                    value={subtitles.fontFamily}
                    onChange={(e) => handleSubtitleUpdate({ fontFamily: e.target.value })}
                    className="w-full p-2 bg-black border border-white/10 rounded-lg text-sm font-bold text-white outline-none focus:border-yellow-500"
                >
                    <option value="Architects Daughter">Architects Daughter</option>
                    <option value="Arial">Arial</option>
                    <option value="Arimo">Arimo</option>
                    <option value="Bangers">Bangers</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Caveat">Caveat</option>
                    <option value="Chewy">Chewy</option>
                    <option value="Cinzel">Cinzel</option>
                    <option value="Combo">Combo</option>
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Edu SA Beginner">Edu SA Beginner</option>
                    <option value="Fredoka">Fredoka</option>
                    <option value="Griffy">Griffy</option>
                    <option value="Helvetica Neue">Helvetica Neue</option>
                    <option value="Impact">Impact</option>
                    <option value="Inter">Inter</option>
                    <option value="Komika Axis">Komika Axis</option>
                    <option value="Lora">Lora</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Proxima Nova">Proxima Nova</option>
                    <option value="SF Pro Display">SF Pro Display</option>
                    <option value="Tinos">Tinos</option>
                    <option value="VCR OSD Mono">VCR OSD Mono</option>
                </select>
            </div>

            {/* Text Transform */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Transform</label>
                <select
                    value={subtitles.textTransform}
                    onChange={(e) => handleSubtitleUpdate({ textTransform: e.target.value as any })}
                    className="w-full p-2 bg-black border border-white/10 rounded-lg text-sm font-bold text-white outline-none focus:border-yellow-500"
                >
                    <option value="none">Normal</option>
                    <option value="uppercase">Uppercase</option>
                    <option value="capitalize">Capitalize</option>
                </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Text Color</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={subtitles.primaryColor}
                            onChange={(e) => handleSubtitleUpdate({ primaryColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer p-0 overflow-hidden"
                        />
                        <span className="text-xs font-mono text-zinc-400">{subtitles.primaryColor}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Outline Color</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={subtitles.secondaryColor}
                            onChange={(e) => handleSubtitleUpdate({ secondaryColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer p-0 overflow-hidden"
                        />
                        <span className="text-xs font-mono text-zinc-400">{subtitles.secondaryColor}</span>
                    </div>
                </div>
            </div>

            {/* Highlight Color */}
            {(['pulse_bold', 'glow_focus', 'karaoke_block', 'karaoke_bounce', 'fade_group'].includes(subtitles.animationType) || 
              subtitles.animationType.includes('highlight') || 
              subtitles.animationType.includes('word') ||
              subtitles.animationType.includes('continuous')) && 
              subtitles.maxWords !== 1 && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Highlight Color</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={subtitles.highlightColor}
                            onChange={(e) => handleSubtitleUpdate({ highlightColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer p-0 overflow-hidden"
                        />
                        <span className="text-xs font-mono text-zinc-400">{subtitles.highlightColor}</span>
                    </div>
                </div>
            )}

            {/* Font Size */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Size</label>
                    <span className="text-xs font-bold text-white">{subtitles.fontSize}px</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="150"
                    value={subtitles.fontSize}
                    onChange={(e) => handleSubtitleUpdate({ fontSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            {/* Stroke Width */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Outline Width</label>
                    <span className="text-xs font-bold text-white">{subtitles.strokeWidth}px</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="20"
                    value={subtitles.strokeWidth}
                    onChange={(e) => handleSubtitleUpdate({ strokeWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            {/* Letter Spacing */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Letter Spacing</label>
                    <span className="text-xs font-bold text-white">{subtitles.letterSpacing}px</span>
                </div>
                <input
                    type="range"
                    min="-2"
                    max="20"
                    value={subtitles.letterSpacing}
                    onChange={(e) => handleSubtitleUpdate({ letterSpacing: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            {/* Placement From Bottom */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Placement From Bottom</label>
                    <span className="text-xs font-bold text-white">{subtitles.placement}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={subtitles.placement}
                    onChange={(e) => handleSubtitleUpdate({ placement: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            {/* Max Words */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Max Words</label>
                    <span className="text-xs font-bold text-white">
                        {subtitles.maxWords !== undefined ? subtitles.maxWords : 99}
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={subtitles.maxWords !== undefined ? subtitles.maxWords : 10}
                    onChange={(e) => handleSubtitleUpdate({ maxWords: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>
        </div>
    );
};
