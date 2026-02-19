
import React, { useState, useRef, useEffect } from 'react';
import { generateSegments } from './api';
import { ContentEditor } from './ContentEditor';
import { IMAGE_STYLES, EFFECT_PRESETS, NARRATION_STYLES, VISUAL_DENSITIES, PICTURE_QUALITY_OPTIONS, SUBTITLE_PRESETS } from './types';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { STYLE_PREVIEWS } from './creator-assets';
import { SubtitlePreview } from './SubtitlePreviews';
import { supabase } from '../../supabaseClient';

export const ContentDashboard = ({ session, onViewChange, initialProjectData, onClearProject, onToggleSidebar }: any) => {
    const [prompt, setPrompt] = useState('');
    
    // Panel Visibility (Default open on large screens)
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    
    // Typewriter State
    const [placeholder, setPlaceholder] = useState('');
    const placeholderText = "Paste your script to instantly create a voiceover and video..";

    // Config Defaults
    const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
    const [style, setStyle] = useState(IMAGE_STYLES[0]);
    const [visualDensity, setVisualDensity] = useState(VISUAL_DENSITIES[0]); // Default Balanced
    const [voice, setVoice] = useState(VOICES[0]);
    const [narrationStyle, setNarrationStyle] = useState(NARRATION_STYLES[0]); // Default to Charisma Dynamo
    const [effect, setEffect] = useState(EFFECT_PRESETS[0]);
    const [pictureQuality, setPictureQuality] = useState(PICTURE_QUALITY_OPTIONS[0]); // Default to Fast
    
    // Updated Default: Pulse Bold
    const [subtitles, setSubtitles] = useState(SUBTITLE_PRESETS.find(s => s.id === 'pulse_bold') || SUBTITLE_PRESETS[0]); 
    
    const [configView, setConfigView] = useState<'main' | 'voice' | 'narration_style' | 'aspect' | 'style' | 'effect' | 'density' | 'quality' | 'subtitles'>('main');

    // Audio Preview State
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Data
    const [project, setProject] = useState<any>(null);
    const [segments, setSegments] = useState<any[]>([]);

    // 0. Init & Credit Check & Typewriter Effect
    useEffect(() => {
        // Open sidebar by default on desktop
        if (window.innerWidth >= 768) {
            setIsConfigOpen(true);
        }

        // Fetch Credits (for display only, gating handled in parent)
        const fetchCredits = async () => {
            if (!session?.user?.id) return;
            const { data } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
            const currentCredits = data?.credits || 0;
            setCredits(currentCredits);
        };
        fetchCredits();

        // Typewriter
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= placeholderText.length) {
                setPlaceholder(placeholderText.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 40); 
        return () => clearInterval(interval);
    }, [session]);

    // 1. Load Persisted State from DB (Replacing localStorage)
    useEffect(() => {
        if (!session?.user?.id) return;

        const loadConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_configurations')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (data && !error) {
                    if (data.prompt) setPrompt(data.prompt);
                    if (data.aspect_ratio) setAspect(data.aspect_ratio as any);
                    if (data.image_style) setStyle(data.image_style);
                    
                    if (data.visual_density) {
                        const d = VISUAL_DENSITIES.find(x => x.id === data.visual_density);
                        if (d) setVisualDensity(d);
                    }
                    if (data.voice_id) {
                        const v = VOICES.find(x => x.id === data.voice_id);
                        if (v) setVoice(v);
                    }
                    if (data.narration_style) {
                        const s = NARRATION_STYLES.find(x => x.id.toString() === data.narration_style || x.name === data.narration_style);
                        if (s) setNarrationStyle(s);
                    }
                    if (data.effect) {
                        const e = EFFECT_PRESETS.find(x => x.id === data.effect);
                        if (e) setEffect(e);
                    }
                    if (data.picture_quality) {
                        const q = PICTURE_QUALITY_OPTIONS.find(x => x.id === data.picture_quality);
                        if (q) setPictureQuality(q);
                    }
                    if (data.subtitles) {
                        const s = SUBTITLE_PRESETS.find(x => x.id === data.subtitles);
                        if (s) setSubtitles(s);
                    }
                }
            } catch (e) {
                console.error("Failed to load user configuration", e);
            }
        };
        loadConfig();
    }, [session]);

    // 2. Adjust Textarea Height after state load
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    // 3. Persist State to DB on Change (Debounced)
    useEffect(() => {
        if (!session?.user?.id) return;

        const saveData = async () => {
            await supabase.from('user_configurations').upsert({
                user_id: session.user.id,
                prompt,
                aspect_ratio: aspect,
                image_style: style,
                visual_density: visualDensity.id,
                voice_id: voice.id,
                narration_style: narrationStyle.id.toString(), // Storing ID or name for easier lookup
                effect: effect.id,
                picture_quality: pictureQuality.id,
                subtitles: subtitles.id,
                updated_at: new Date().toISOString()
            });
        };

        const timer = setTimeout(saveData, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [prompt, narrationStyle, visualDensity, aspect, style, voice, effect, pictureQuality, subtitles, session]);

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
                const n = NARRATION_STYLES.find(s => s.prompt === initialProjectData.project.narration_style);
                if (n) setNarrationStyle(n);
            }
            if (initialProjectData.project.picture_quality) {
                const q = PICTURE_QUALITY_OPTIONS.find(o => o.id === initialProjectData.project.picture_quality);
                if (q) setPictureQuality(q);
            }
            if (initialProjectData.project.subtitles) {
                const s = SUBTITLE_PRESETS.find(p => p.id === initialProjectData.project.subtitles);
                if (s) setSubtitles(s);
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

    const handleVoiceSelect = (v: any) => {
        // Stop preview if playing
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayingVoiceId(null);
        }
        setVoice(v);
        setConfigView('main');
    };

    const handleNarrationStyleChange = (s: any) => {
        setNarrationStyle(s);
        setConfigView('main');
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            console.log("[ContentDashboard] Starting generation...");
            const res = await generateSegments(prompt, aspect, style, effect.id, session.user.id, narrationStyle.prompt, visualDensity.id, pictureQuality.id, subtitles.id);
            console.log("[ContentDashboard] Text segments received:", res.segments.length);
            
            setProject({ 
                id: res.projectId, 
                title: prompt, 
                aspect_ratio: aspect, 
                voice_id: voice.id,
                effect: effect.id,
                image_style: style,
                narration_style: narrationStyle.prompt,
                picture_quality: pictureQuality.id,
                subtitles: subtitles.id,
                status: 'generating'
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

    // If project is loaded, show Editor
    const renderContent = () => {
        if (project && segments.length > 0) {
            return <ContentEditor 
                session={session} 
                project={project} 
                initialSegments={segments} 
                onBack={() => { 
                    setProject(null); 
                    setSegments([]); 
                    if (onClearProject) onClearProject();
                    onViewChange('projects');
                }} 
                onComplete={() => onViewChange('stories')}
            />;
        }

        return (
            <div className="flex-1 h-full relative flex flex-col">
            
                {/* Mobile Header: Menu + Title */}
                <div className="md:hidden absolute top-4 left-4 z-20 flex items-center gap-3">
                    <button 
                        onClick={onToggleSidebar}
                        className="p-2 -ml-2 bg-white/80 backdrop-blur rounded-lg text-slate-900 shadow-sm border border-slate-200"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                {/* Config Toggle Icon (Top Right) - Visible on Mobile OR when Desktop panel is closed */}
                <div className={`absolute top-4 right-4 z-30 ${isConfigOpen && 'md:hidden'}`}>
                    <button 
                        onClick={() => setIsConfigOpen(!isConfigOpen)} 
                        className="p-3 text-white bg-black hover:bg-slate-800 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105 group"
                        title="Open Configuration"
                    >
                        {/* Sophisticated Sliders Icon */}
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0h-3m-3 0H3.75m11.25 6h4.5m-4.5 0a1.5 1.5 0 01-3 0m3 0h-3m-3 0H3.75m11.25 6h4.5m-4.5 0a1.5 1.5 0 01-3 0m3 0h-3m-3 0H3.75" />
                        </svg>
                    </button>
                </div>

                {/* Config Panel - Sidebar */}
                <div className={`
                    absolute inset-y-0 right-0 
                    w-80 bg-white border-l border-slate-200 p-6 
                    transform transition-transform duration-300 ease-in-out z-40 
                    ${isConfigOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'} 
                    overflow-y-auto thin-scrollbar
                `}>
                    
                    {/* Header Row: Title + Close Button */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Configuration</h3>
                        <button onClick={() => setIsConfigOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {configView === 'main' && (
                        <>
                            <div className="space-y-6">
                                {/* --- VISUAL CONFIG SECTION --- */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Visual Config</h4>
                                    
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => setConfigView('style')}
                                            className="w-full flex items-center justify-between p-2 pl-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0 shadow-sm border border-slate-200">
                                                    <img src={STYLE_PREVIEWS[style]} alt={style} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 block leading-tight">Style</span>
                                                    <span className="text-slate-900">{style}</span>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('aspect')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Ratio</span>
                                                <span className="text-slate-900">{aspect === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('quality')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Quality</span>
                                                <span className="text-slate-900">{pictureQuality.name}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('density')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Density</span>
                                                <span className="text-slate-900">{visualDensity.name}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('effect')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Effects</span>
                                                <span className="text-slate-900">{effect.name}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* --- VOICE CONFIG SECTION --- */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-4 border-b border-slate-100 pb-2">Voice Config</h4>
                                    
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => setConfigView('voice')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Narrator</span>
                                                <span className="text-slate-900">{voice.name}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('narration_style')}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div className="flex-1 min-w-0 pr-2">
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Tone</span>
                                                <span className="text-slate-900 block truncate">{narrationStyle.name}</span>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>

                                        <button 
                                            onClick={() => setConfigView('subtitles')}
                                            className="w-full flex items-center justify-between p-2 pl-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3 w-full min-w-0">
                                                <div className="w-12 h-8 rounded border border-slate-200 bg-black shrink-0 overflow-hidden">
                                                    <SubtitlePreview id={subtitles.id} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-bold text-slate-400 block leading-tight">Subtitles</span>
                                                    <span className="text-slate-900 truncate block">{subtitles.name}</span>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {configView === 'density' && (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <button 
                                    onClick={() => setConfigView('main')} 
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Visual Density</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {VISUAL_DENSITIES.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => { setVisualDensity(d); setConfigView('main'); }}
                                        className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${visualDensity.id === d.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold flex items-center justify-between text-slate-900">
                                            {d.name}
                                            {visualDensity.id === d.id && <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium mt-1">{d.description}</div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {configView === 'quality' && (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <button 
                                    onClick={() => setConfigView('main')} 
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Picture Quality</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {PICTURE_QUALITY_OPTIONS.map(q => (
                                    <button
                                        key={q.id}
                                        onClick={() => { setPictureQuality(q); setConfigView('main'); }}
                                        className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${pictureQuality.id === q.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold flex items-center justify-between text-slate-900">
                                            {q.name}
                                            {pictureQuality.id === q.id && <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium mt-1">{q.description}</div>
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
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Aspect Ratio</h3>
                            </div>
                            
                            <div className="space-y-2">
                                {[
                                    { id: '9:16', label: '9:16 Vertical', desc: 'Best for TikTok, Reels, Shorts' },
                                    { id: '16:9', label: '16:9 Landscape', desc: 'Best for YouTube, Desktop' }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setAspect(opt.id as any); setConfigView('main'); }}
                                        className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${aspect === opt.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold text-slate-900">{opt.label}</div>
                                        <div className="text-xs text-slate-400 font-medium">{opt.desc}</div>
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
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Image Style</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {IMAGE_STYLES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setStyle(s); setConfigView('main'); }}
                                        className={`relative group flex flex-col gap-2 p-2 border rounded-xl transition-all text-left overflow-hidden ${style === s ? 'border-blue-500 bg-blue-50' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="aspect-square w-full rounded-lg bg-slate-200 overflow-hidden relative">
                                            <img src={STYLE_PREVIEWS[s]} alt={s} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            {style === s && (
                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                    <div className="bg-white rounded-full p-1 shadow-sm">
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-xs px-1 text-slate-900">{s}</span>
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
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Video Effects</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {EFFECT_PRESETS.map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => { setEffect(e); setConfigView('main'); }}
                                        className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${effect.id === e.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold text-slate-900">{e.name}</div>
                                        <div className="text-xs text-slate-400 font-medium">{e.description}</div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {configView === 'subtitles' && (
                        <>
                             <div className="flex items-center gap-2 mb-6">
                                <button 
                                    onClick={() => setConfigView('main')} 
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Subtitles</h3>
                            </div>
                            
                            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {SUBTITLE_PRESETS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSubtitles(s); setConfigView('main'); }}
                                        className={`w-full text-left p-3 border rounded-xl transition-all group ${subtitles.id === s.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="aspect-video w-full rounded-lg bg-gray-900 mb-3 overflow-hidden border border-slate-200 relative">
                                            <SubtitlePreview id={s.id} />
                                            {subtitles.id === s.id && (
                                                <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-md z-20">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="font-bold flex items-center justify-between px-1 text-slate-900">
                                            {s.name}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium px-1 mt-0.5">{s.description}</div>
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
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Select Voice</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {VOICES.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => handleVoiceSelect(v)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm border rounded-xl transition-all ${voice.id === v.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <span className="font-bold text-left text-slate-900">{v.name}</span>
                                        {VOICE_SAMPLES[v.id] && (
                                            <div 
                                                onClick={(e) => toggleVoiceSample(e, v.id)} 
                                                className={`p-1.5 rounded-full shrink-0 ${playingVoiceId === v.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
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
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Narration Style</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                                {NARRATION_STYLES.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleNarrationStyleChange(s)}
                                        className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${narrationStyle.id === s.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="font-bold flex items-center justify-between text-slate-900">
                                            {s.name}
                                            {narrationStyle.id === s.id && <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium mt-1">({s.description})</div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

               {/* Main Content Area */}
                <div className={`flex-1 ${isConfigOpen ? 'md:mr-80' : ''} transition-all duration-300 flex flex-col items-center justify-center p-6 h-full overflow-y-auto no-scrollbar relative`}>
                     <div className="w-full max-w-3xl flex flex-col gap-6 transition-transform duration-300 -translate-y-[10vh] md:translate-y-0">
                         
                         {/* Text Section */}
                         <div className="text-center space-y-2">
                             <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">What's your story?</h2>
                         </div>

                         {/* Input Card */}
                         <div className="relative group bg-white focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden isolate w-full border-2 border-slate-100">
                            {/* Text Area */}
                            <div className="relative z-0">
                                <textarea 
                                    ref={textareaRef}
                                    className="w-full bg-transparent p-8 pb-24 text-lg font-medium outline-none resize-none min-h-[140px] max-h-[50vh] overflow-y-auto placeholder-slate-300 text-slate-800"
                                    placeholder={placeholder}
                                    value={prompt}
                                    onChange={(e) => {
                                        setPrompt(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                                {/* Character Count Indicator */}
                                <div className={`absolute bottom-24 right-8 text-xs font-bold transition-colors ${prompt.length > 6000 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {prompt.length} / 6000
                                </div>
                            </div>

                            {/* Button Area */}
                            <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-t from-white via-white/90 to-transparent h-24 items-end pointer-events-none">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={loading || !prompt.trim() || prompt.length > 6000}
                                    className="px-8 py-3 bg-black text-white rounded-full font-black uppercase tracking-wider hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 pointer-events-auto text-sm transform active:scale-95 duration-200"
                                >
                                    {loading ? 'Thinking...' : 'Generate'}
                                </button>
                            </div>
                        </div>

                     </div>
                </div>
            </div>
        );
    }

    const MAX_CHARS = 6000;

    return (
        <div className="flex-1 h-full relative flex flex-col">
            <style>{`
                .thin-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .thin-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .thin-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
                .thin-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
            `}</style>
            {/* Render Content */}
            {renderContent()}
        </div>
    );
};
