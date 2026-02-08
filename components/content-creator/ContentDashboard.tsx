







import React, { useState, useRef, useEffect } from 'react';
import { generateSegments } from './api';
import { ContentEditor } from './ContentEditor';
import { IMAGE_STYLES, EFFECT_PRESETS, NARRATION_STYLES, VISUAL_DENSITIES } from './types';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';

export const ContentDashboard = ({ session, onViewChange, initialProjectData }: any) => {
    const [prompt, setPrompt] = useState('');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Config
    const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
    const [style, setStyle] = useState(IMAGE_STYLES[0]);
    const [visualDensity, setVisualDensity] = useState(VISUAL_DENSITIES[0]); // Default Balanced
    const [voice, setVoice] = useState(VOICES[0]);
    const [narrationStyle, setNarrationStyle] = useState(NARRATION_STYLES[0]); // Default to Charisma Dynamo
    const [effect, setEffect] = useState(EFFECT_PRESETS[0]);
    
    const [configView, setConfigView] = useState<'main' | 'voice' | 'narration_style' | 'aspect' | 'style' | 'effect' | 'density'>('main');

    // Audio Preview State
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Data
    const [project, setProject] = useState<any>(null);
    const [segments, setSegments] = useState<any[]>([]);

    // 1. Load Persisted State on Mount
    useEffect(() => {
        const savedState = localStorage.getItem('content_dashboard_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.prompt) setPrompt(parsed.prompt);
                
                if (parsed.narrationStyleId) {
                    const savedStyle = NARRATION_STYLES.find(s => s.id === parsed.narrationStyleId);
                    if (savedStyle) setNarrationStyle(savedStyle);
                }
                if (parsed.visualDensityId) {
                    const savedDensity = VISUAL_DENSITIES.find(d => d.id === parsed.visualDensityId);
                    if (savedDensity) setVisualDensity(savedDensity);
                }
                
                // Restore Config
                if (parsed.aspect) setAspect(parsed.aspect);
                if (parsed.style) setStyle(parsed.style);
                
                if (parsed.voiceId) {
                    const savedVoice = VOICES.find(v => v.id === parsed.voiceId);
                    if (savedVoice) setVoice(savedVoice);
                }
                
                if (parsed.effectId) {
                    const savedEffect = EFFECT_PRESETS.find(e => e.id === parsed.effectId);
                    if (savedEffect) setEffect(savedEffect);
                }

            } catch (e) {
                console.error("Failed to load saved state", e);
            }
        }
    }, []);

    // 2. Adjust Textarea Height after state load
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    // 3. Persist State on Change (Including all configs)
    useEffect(() => {
        const stateToSave = {
            prompt,
            narrationStyleId: narrationStyle.id,
            visualDensityId: visualDensity.id,
            aspect,
            style,
            voiceId: voice.id,
            effectId: effect.id
        };
        localStorage.setItem('content_dashboard_state', JSON.stringify(stateToSave));
    }, [prompt, narrationStyle, visualDensity, aspect, style, voice, effect]);

    // Initialize from props if present (Project Reload)
    useEffect(() => {
        if (initialProjectData) {
            console.log(`[ContentDashboard] Initializing with project ${initialProjectData.project.id}`);
            setProject(initialProjectData.project);
            setSegments(initialProjectData.segments);
            
            // Sync local state if reloading project
            if (initialProjectData.project.effect) {
                const p = EFFECT_PRESETS.find(e => e.id === initialProjectData.project.effect);
                if (p) setEffect(p);
            }
            if (initialProjectData.project.voice_id) {
                const v = VOICES.find(v => v.id === initialProjectData.project.voice_id);
                if (v) setVoice(v);
            }
            if (initialProjectData.project.narration_style) {
                // Try to match by prompt text since we stored text, or default
                const n = NARRATION_STYLES.find(s => s.prompt === initialProjectData.project.narration_style);
                if (n) setNarrationStyle(n);
            }
        }
    }, [initialProjectData]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleVoiceSample = (e: React.MouseEvent, voiceId: string) => {
        e.stopPropagation();
        const sampleUrl = VOICE_SAMPLES[voiceId];
        if (!sampleUrl) return;

        if (playingVoiceId === voiceId) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(sampleUrl);
            audioRef.current = audio;
            audio.play();
            setPlayingVoiceId(voiceId);
            audio.onended = () => setPlayingVoiceId(null);
        }
    };

    // Sentence Counting & Image Calculation
    const sentenceCount = prompt.trim() ? prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
    const estimatedImages = visualDensity.id === 'Rich' ? sentenceCount : Math.ceil(sentenceCount / 2);
    const displayImageCount = Math.max(0, estimatedImages);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            console.log("[ContentDashboard] Starting generation...");
            const res = await generateSegments(prompt, aspect, style, effect.id, session.user.id, narrationStyle.prompt, visualDensity.id);
            console.log("[ContentDashboard] Text segments received:", res.segments.length);
            
            setProject({ 
                id: res.projectId, 
                title: prompt, 
                aspect_ratio: aspect, 
                voice_id: voice.id,
                effect: effect.id,
                image_style: style,
                narration_style: narrationStyle.prompt
            });
            setSegments(res.segments);
            // We transition immediately to editor even if images are null
        } catch (e) {
            console.error("[ContentDashboard] Generation failed", e);
            alert("Generation failed");
        } finally {
            setLoading(false);
        }
    };

    if (project && segments.length > 0) {
        return <ContentEditor 
            session={session} 
            project={project} 
            initialSegments={segments} 
            onBack={() => { setProject(null); setSegments([]); }} 
            onComplete={() => onViewChange('stories')}
        />;
    }

    return (
        <div className="flex-1 h-full relative flex flex-col">
            {/* Header */}
            <div className="p-6 flex justify-between items-center md:hidden">
                <span className="font-black text-indigo-600 uppercase">Creator</span>
                <button onClick={() => setIsConfigOpen(!isConfigOpen)}>⚙️</button>
            </div>

            {/* Config Panel - Mobile Overlay / Desktop Sidebar */}
            <div className={`absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-200 p-6 transform transition-transform z-30 ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 overflow-y-auto no-scrollbar`}>
                
                {configView === 'main' && (
                    <>
                        <h3 className="font-black text-xl mb-8 uppercase tracking-tight">Configuration</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Aspect Ratio</label>
                                <button 
                                    onClick={() => setConfigView('aspect')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{aspect === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Image Style</label>
                                <button 
                                    onClick={() => setConfigView('style')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{style}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Visual Density</label>
                                <button 
                                    onClick={() => setConfigView('density')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{visualDensity.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Effects</label>
                                <button 
                                    onClick={() => setConfigView('effect')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{effect.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Narrator</label>
                                <button 
                                    onClick={() => setConfigView('voice')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{voice.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Narration Style</label>
                                <button 
                                    onClick={() => setConfigView('narration_style')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span className="truncate">{narrationStyle.name} ({narrationStyle.description.split(',')[0]}...)</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {configView === 'density' && (
                    <>
                        <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Visual Density</h3>
                        </div>
                        
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 no-scrollbar">
                            {VISUAL_DENSITIES.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => { setVisualDensity(d); setConfigView('main'); }}
                                    className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${visualDensity.id === d.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="font-bold flex items-center justify-between">
                                        {d.name}
                                        {visualDensity.id === d.id && <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium mt-1">{d.description}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {configView === 'aspect' && (
                    <>
                        <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Aspect Ratio</h3>
                        </div>
                        
                        <div className="space-y-2">
                            {[
                                { id: '9:16', label: '9:16 Vertical', desc: 'Best for TikTok, Reels, Shorts' },
                                { id: '16:9', label: '16:9 Landscape', desc: 'Best for YouTube, Desktop' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setAspect(opt.id as any); setConfigView('main'); }}
                                    className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${aspect === opt.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="font-bold">{opt.label}</div>
                                    <div className="text-xs text-gray-400 font-medium">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {configView === 'style' && (
                    <>
                         <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Image Style</h3>
                        </div>
                        
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 no-scrollbar">
                            {IMAGE_STYLES.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setStyle(s); setConfigView('main'); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm border rounded-xl transition-all ${style === s ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <span className="font-bold">{s}</span>
                                    {style === s && <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {configView === 'effect' && (
                    <>
                         <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Video Effects</h3>
                        </div>
                        
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 no-scrollbar">
                            {EFFECT_PRESETS.map(e => (
                                <button
                                    key={e.id}
                                    onClick={() => { setEffect(e); setConfigView('main'); }}
                                    className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${effect.id === e.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="font-bold">{e.name}</div>
                                    <div className="text-xs text-gray-400 font-medium">{e.description}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {configView === 'voice' && (
                    <>
                        <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Select Voice</h3>
                        </div>
                        
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 no-scrollbar">
                            {VOICES.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setVoice(v); setConfigView('main'); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm border rounded-xl transition-all ${voice.id === v.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <span className="font-bold text-left">{v.name}</span>
                                    {VOICE_SAMPLES[v.id] && (
                                        <div 
                                            onClick={(e) => toggleVoiceSample(e, v.id)} 
                                            className={`p-1.5 rounded-full shrink-0 ${playingVoiceId === v.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                        >
                                            {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {configView === 'narration_style' && (
                    <>
                        <div className="flex items-center gap-2 mb-6">
                            <button 
                                onClick={() => setConfigView('main')} 
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-xl uppercase tracking-tight">Narration Style</h3>
                        </div>
                        
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 no-scrollbar">
                            {NARRATION_STYLES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setNarrationStyle(s); setConfigView('main'); }}
                                    className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${narrationStyle.id === s.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="font-bold flex items-center justify-between">
                                        {s.name}
                                        {narrationStyle.id === s.id && <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium mt-1">({s.description})</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="flex-1 md:mr-80 flex flex-col items-center justify-center p-6 pb-32">
                 <div className="max-w-2xl w-full text-center space-y-8">
                     <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl shadow-indigo-200">
                         ✨
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900">What's your story?</h2>
                     <p className="text-gray-500 font-medium">Describe a scene, a history fact, a scary story, or a product idea.</p>
                 </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 md:right-80 p-6 bg-gradient-to-t from-white via-white to-transparent">
                <div className="max-w-3xl mx-auto relative group">
                    <textarea 
                        ref={textareaRef}
                        className="w-full bg-white border-2 border-gray-200 focus:border-indigo-500 rounded-3xl p-6 pr-32 shadow-2xl resize-none text-lg font-medium outline-none min-h-[100px]"
                        placeholder="Type a story prompt here..."
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="absolute bottom-4 right-4 px-6 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-wider hover:bg-gray-800 transition disabled:opacity-50"
                    >
                        {loading ? 'Thinking...' : `Generate ${displayImageCount > 0 ? `(${displayImageCount} Images)` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};