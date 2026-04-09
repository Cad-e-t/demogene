import React from 'react';
import { SubtitleConfiguration } from './types';

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
            if (newWords.length !== transcription.words.length) {
                setTranscriptionError(`Word count must remain ${transcription.words.length}. Current: ${newWords.length}`);
                return;
            }

            const updatedTranscription = {
                ...transcription,
                words: transcription.words.map((w: any, i: number) => ({
                    ...w,
                    text: newWords[i]
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
                    {isEditingTranscription ? 'Word count must remain unchanged' : 'Karaoke highlighting active during playback'}
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
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Caption Styles</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'pulse_bold', label: 'Pulse', className: 'style-tile-pulse' },
                        { id: 'glow_focus', label: 'Typewriter', className: 'style-tile-typewriter' },
                        { id: 'impact_pop', label: 'Pop', className: 'style-tile-pop' }
                    ].map((style) => (
                        <button
                            key={style.id}
                            onClick={() => handleSubtitleUpdate({ animationType: style.id as any })}
                            className={`relative h-16 rounded-xl border-2 overflow-hidden transition-all flex items-center justify-center bg-transparent ${subtitles.animationType === style.id ? 'border-yellow-500' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <span className={`font-bold text-white text-sm ${style.className}`}>{style.label}</span>
                        </button>
                    ))}
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
                    <option value="Chewy">Chewy</option>
                    <option value="Combo">Combo</option>
                    <option value="Edu SA Beginner">Edu SA Beginner</option>
                    <option value="Fredoka Condensed Medium Conden">Fredoka</option>
                    <option value="Griffy">Griffy</option>
                    <option value="Komika Hand">Komika Hand</option>
                    <option value="Tinos">Tinos</option>
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
            {(subtitles.animationType === 'pulse_bold' || subtitles.animationType === 'glow_focus') && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Highlight Color (Karaoke)</label>
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
                        {subtitles.maxWords !== undefined 
                            ? subtitles.maxWords 
                            : (subtitles.animationType === 'pulse_bold' ? 3 : (subtitles.animationType === 'glow_focus' ? 5 : (subtitles.animationType === 'impact_pop' ? 1 : 99)))}
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={subtitles.maxWords !== undefined 
                        ? subtitles.maxWords 
                        : (subtitles.animationType === 'pulse_bold' ? 3 : (subtitles.animationType === 'glow_focus' ? 5 : (subtitles.animationType === 'impact_pop' ? 1 : 10)))}
                    onChange={(e) => handleSubtitleUpdate({ maxWords: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>
        </div>
    );
};
