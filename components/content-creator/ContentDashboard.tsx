
import React, { useState, useRef, useEffect } from 'react';
import { Equal, ChevronRight, ChevronLeft, Mic, Monitor, MonitorPlay, Sparkles, Settings2, Play, Pause } from 'lucide-react';
import { generateSegments } from './api';
import { ContentEditor } from './ContentEditor';
import { IMAGE_STYLES, EFFECT_PRESETS, NARRATION_STYLES, SUBTITLE_PRESETS, DEFAULT_SUBTITLE_CONFIG, SubtitleConfiguration } from './types';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { STYLE_PREVIEWS } from './creator-assets';
import { SubtitlePreview } from './SubtitlePreviews';
import { supabase } from '../../supabaseClient';

export const ContentDashboard = ({ session, onViewChange, initialProjectData, onClearProject, onToggleSidebar }: any) => {
    const [prompt, setPrompt] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    
    // Typewriter State
    const [placeholder, setPlaceholder] = useState('');
    const placeholderText = "Paste your script to instantly create a voiceover and video..";

    // Config Defaults
    const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
    const [style, setStyle] = useState(IMAGE_STYLES[0]);
    const [voice, setVoice] = useState(VOICES[0]); // Default to Charon (now first)
    const [narrationStyle, setNarrationStyle] = useState(NARRATION_STYLES[0].prompt); // Default to Charismatic prompt
    const [effect, setEffect] = useState(EFFECT_PRESETS[0]); // Default to Chaos Mode (now first)
    
    const [subtitles, setSubtitles] = useState<SubtitleConfiguration>(DEFAULT_SUBTITLE_CONFIG); 
    
    const [configView, setConfigView] = useState<'main' | 'voice' | 'narration_style' | 'aspect' | 'style' | 'effect' | 'mobile_settings'>('main');
    const [voiceAccordion, setVoiceAccordion] = useState<'narrator' | 'tone' | null>(null);
    const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
    const promptBoxRef = useRef<HTMLDivElement>(null);

    // Audio Preview State
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const galleryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (galleryRef.current) {
            const selectedElement = galleryRef.current.querySelector(`[data-style="${style}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }
    }, [style]);

    // Data
    const [project, setProject] = useState<any>(null);
    const [segments, setSegments] = useState<any[]>([]);
    
    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

    // Image Count Estimation Logic
    const sentenceCount = React.useMemo(() => {
        if (!prompt.trim()) return 0;
        return prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    }, [prompt]);

    const estimatedImages = React.useMemo(() => {
        if (sentenceCount === 0) return 0;
        let count = Math.round(sentenceCount / 2);
        return Math.max(1, count);
    }, [sentenceCount]);

    // 0. Init & Credit Check & Typewriter Effect
    useEffect(() => {
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
                    
                    if (data.voice_id) {
                        const v = VOICES.find(x => x.id === data.voice_id);
                        if (v) setVoice(v);
                    }
                    if (data.narration_style) {
                        const s = NARRATION_STYLES.find(x => x.id.toString() === data.narration_style || x.name === data.narration_style || x.prompt === data.narration_style);
                        if (s) setNarrationStyle(s.prompt);
                        else setNarrationStyle(data.narration_style);
                    }
                    if (data.effect) {
                        const e = EFFECT_PRESETS.find(x => x.id === data.effect);
                        if (e) setEffect(e);
                    }
                    if (data.subtitles) {
                        // Check if it's a string (old preset ID) or object
                        if (typeof data.subtitles === 'string') {
                             const s = SUBTITLE_PRESETS.find(x => x.id === data.subtitles);
                             // If it was a preset, we might want to map it to a config, but for now let's just use default if it's a string to avoid type errors, or maybe we can map it?
                             // Since we are transitioning, let's just use default if it's a string, or maybe we can try to parse it if it's a JSON string?
                             // But the previous code stored just the ID.
                             // Let's just fallback to default for now to be safe and encourage new config.
                             setSubtitles(DEFAULT_SUBTITLE_CONFIG);
                        } else {
                            setSubtitles(data.subtitles as SubtitleConfiguration);
                        }
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
                voice_id: voice.id,
                narration_style: narrationStyle,
                effect: effect.id,
                updated_at: new Date().toISOString()
            });
        };

        const timer = setTimeout(saveData, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [prompt, narrationStyle, aspect, style, voice, effect, session]);

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
                setNarrationStyle(initialProjectData.project.narration_style);
            }
            if (initialProjectData.project.subtitles) {
                setSubtitles(initialProjectData.project.subtitles as SubtitleConfiguration);
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

    const handleNarrationStyleChange = (prompt: string) => {
        setNarrationStyle(prompt);
    };

    // Close modals on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            const isModal = target.closest('.config-modal');
            const isButton = target.closest('.config-control-button');
            
            if (configView !== 'main' && !isModal && !isButton) {
                setConfigView('main');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [configView]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            console.log("[ContentDashboard] Starting generation...");
            const res = await generateSegments(prompt, aspect, style, effect.id, session.user.id, narrationStyle, subtitles, voice.id);
            console.log("[ContentDashboard] Text segments received:", res.segments.length);
            
            setProject({ 
                id: res.projectId, 
                title: prompt, 
                aspect_ratio: aspect, 
                voice_id: voice.id,
                effect: effect.id,
                image_style: style,
                narration_style: narrationStyle,
                subtitles: subtitles,
                status: 'generating'
            });
            setSegments(res.segments);
            // We transition immediately to editor even if images are null
        } catch (e: any) {
            console.error("[ContentDashboard] Generation failed", e);
            setNotification({ message: e.message || "Generation failed", type: 'error' });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const MAX_CHARS = 6000;

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
            <div className="flex-1 h-full relative flex flex-col bg-black overflow-hidden">
                {/* Credits Low Banner */}
                {credits !== null && credits < 3 && (
                    <div className="hidden md:block absolute top-4 right-4 z-50 max-w-[calc(100vw-2rem)] md:max-w-none">
                        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-500 whitespace-nowrap">
                            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-amber-900/20 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] sm:text-[18px] md:text-xs font-black text-zinc-400  tracking-tight">Credits Low Top Up to create amazing content</span>
                            </div>
                            <button 
                                onClick={() => onViewChange('creator-pricing')}
                                className="px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white text-[7px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-600/20 shrink-0 ml-1 sm:ml-2"
                            >
                                Top Up
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile Sidebar Toggle */}
                <div className="md:hidden absolute top-4 left-4 z-20">
                    <button 
                        onClick={onToggleSidebar}
                        className="p-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                {/* Style Gallery Section */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 pb-32 overflow-hidden">
                    <h1 className="text-sm sm:text-2xl md:text-4xl font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 md:mb-12 text-center whitespace-nowrap">
                        Faceless Explainer Videos
                    </h1>
                    
                    <div 
                        ref={galleryRef}
                        className="w-full flex gap-4 overflow-x-auto pb-4 thin-scrollbar snap-x snap-mandatory px-4 md:px-12"
                    >
                        {IMAGE_STYLES.map((s) => (
                            <div 
                                key={s}
                                data-style={s}
                                onClick={() => setStyle(s)}
                                onMouseEnter={() => setHoveredStyle(s)}
                                onMouseLeave={() => setHoveredStyle(null)}
                                className={`flex-none snap-start cursor-pointer transition-all duration-300 ${style === s ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}
                            >
                                <div className={`relative rounded-2xl overflow-hidden border-4 transition-colors duration-300 ${style === s ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-white/5'}`}>
                                    <video 
                                        src={STYLE_PREVIEWS[s]} 
                                        className="h-[30vh] md:h-[40vh] w-auto aspect-auto object-cover"
                                        autoPlay={style === s || hoveredStyle === s} 
                                        muted 
                                        loop 
                                        playsInline
                                        ref={(el) => {
                                            if (el) {
                                                if (style === s || hoveredStyle === s) {
                                                    el.play().catch(() => {});
                                                } else {
                                                    el.pause();
                                                }
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                </div>
                                <p className={`mt-3 text-center font-black uppercase tracking-widest text-xs transition-colors ${style === s ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                    {s}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prompt Box Section */}
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 flex justify-center z-20 pointer-events-none">
                    <div ref={promptBoxRef} className={`w-full max-w-3xl bg-zinc-900 rounded-3xl shadow-2xl border ${prompt.length > MAX_CHARS ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10'} pointer-events-auto flex flex-col transition-colors duration-200`}>
                        {/* Text Area Section */}
                        <div className="p-4 md:p-6 pb-2">
                            <textarea 
                                ref={textareaRef}
                                className="w-full bg-transparent text-zinc-100 text-lg font-medium outline-none resize-none placeholder-zinc-500 leading-relaxed max-h-[30vh] overflow-y-auto thin-scrollbar"
                                placeholder="Paste your script.."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={1}
                            />
                            {prompt.length > MAX_CHARS && (
                                <div className="mt-2 text-right animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                        Limit Exceeded: {prompt.length} / {MAX_CHARS}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Configuration Bar Section */}
                        <div className="p-3 md:p-4 bg-zinc-900 border-t border-white/5 flex items-center justify-between gap-2 rounded-b-3xl">
                            {/* Left Side: Config Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap pb-1">
                                        {/* Style Button */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setConfigView(configView === 'style' ? 'main' : 'style')}
                                                className={`config-control-button px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${configView === 'style' ? 'bg-yellow-500 text-black' : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60'}`}
                                            >
                                                {style}
                                            </button>
                                            {configView === 'style' && (
                                                <div className="config-modal absolute bottom-full left-0 mb-4 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    {IMAGE_STYLES.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => { setStyle(s); setConfigView('main'); }}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${style === s ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Desktop Only Buttons */}
                                        <div className="hidden md:flex items-center gap-1.5">
                                            {/* Ratio Button */}
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setConfigView(configView === 'aspect' ? 'main' : 'aspect')}
                                                    className={`config-control-button px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${configView === 'aspect' ? 'bg-yellow-500 text-black' : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60'}`}
                                                >
                                                    {aspect === '9:16' ? (
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
                                                    )}
                                                    {aspect}
                                                </button>
                                                {configView === 'aspect' && (
                                                    <div className="config-modal absolute bottom-full left-0 mb-4 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                        {[
                                                            { id: '9:16', label: '9:16 Vertical' },
                                                            { id: '16:9', label: '16:9 Landscape' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => { setAspect(opt.id as any); setConfigView('main'); }}
                                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${aspect === opt.id ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Voice Button */}
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setConfigView(configView === 'voice' ? 'main' : 'voice')}
                                                    className={`config-control-button px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${configView === 'voice' ? 'bg-yellow-500 text-black' : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60'}`}
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                                    {voice.name}
                                                </button>
                                                {configView === 'voice' && (
                                                    <div className="config-modal absolute bottom-full left-0 mb-4 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                        {/* Voice Selection Accordion */}
                                                        <div className="mb-2">
                                                            <button 
                                                                onClick={() => setVoiceAccordion(voiceAccordion === 'narrator' ? null : 'narrator')}
                                                                className="w-full flex items-center justify-between px-2 py-1 mb-1 hover:bg-white/5 rounded-lg transition-colors"
                                                            >
                                                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Narrator</h4>
                                                                <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${voiceAccordion === 'narrator' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                            </button>
                                                            {voiceAccordion === 'narrator' && (
                                                                <div className="space-y-1 max-h-48 overflow-y-auto thin-scrollbar pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    {VOICES.map(v => (
                                                                        <button
                                                                            key={v.id}
                                                                            onClick={() => handleVoiceSelect(v)}
                                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${voice.id === v.id ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                        >
                                                                            <span>{v.name}</span>
                                                                            {VOICE_SAMPLES[v.id] && (
                                                                                <div 
                                                                                    onClick={(e) => toggleVoiceSample(e, v.id)} 
                                                                                    className={`p-1 rounded-full ${playingVoiceId === v.id ? 'bg-black/20 text-black' : 'text-zinc-500 hover:text-white'}`}
                                                                                >
                                                                                    {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Tone Selection Accordion */}
                                                        <div>
                                                            <button 
                                                                onClick={() => setVoiceAccordion(voiceAccordion === 'tone' ? null : 'tone')}
                                                                className="w-full flex items-center justify-between px-2 py-1 mb-1 hover:bg-white/5 rounded-lg transition-colors"
                                                            >
                                                                <div className="flex flex-col items-start w-full pr-4 overflow-hidden">
                                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tone</h4>
                                                                    {voiceAccordion !== 'tone' && (
                                                                        <span className="text-[10px] text-yellow-500 font-bold truncate w-full text-left">{narrationStyle}</span>
                                                                    )}
                                                                </div>
                                                                <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 shrink-0 ${voiceAccordion === 'tone' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                            </button>
                                                            {voiceAccordion === 'tone' && (
                                                                <div className="space-y-2 max-h-60 overflow-y-auto thin-scrollbar pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    <textarea
                                                                        value={narrationStyle}
                                                                        onChange={(e) => setNarrationStyle(e.target.value)}
                                                                        placeholder="Enter custom narration style..."
                                                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500 resize-none min-h-[60px]"
                                                                    />
                                                                    <div className="space-y-1">
                                                                        {NARRATION_STYLES.map(s => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={() => handleNarrationStyleChange(s.prompt)}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle === s.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                            >
                                                                                <span>{s.name}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile Only Settings Button */}
                                        <div className="flex md:hidden items-center relative">
                                            <button 
                                                onClick={() => setConfigView(configView === 'mobile_settings' ? 'main' : 'mobile_settings')}
                                                className={`config-control-button p-2 rounded-xl transition-all ${configView === 'mobile_settings' ? 'bg-yellow-500 text-black' : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-black/60'}`}
                                            >
                                                <Equal className="w-5 h-5" />
                                            </button>

                                            {/* Mobile Settings Modal */}
                                            {configView === 'mobile_settings' && (
                                                <div className="config-modal absolute bottom-full left-0 mb-4 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <button
                                                        onClick={() => setConfigView('aspect')}
                                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center">
                                                                <Monitor className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-black uppercase tracking-widest">Ratio</div>
                                                                <div className="text-[10px] text-zinc-500">{aspect}</div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfigView('voice')}
                                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center">
                                                                <Mic className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-black uppercase tracking-widest">Voice</div>
                                                                <div className="text-[10px] text-zinc-500">{voice.name}</div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Sub-modals for mobile */}
                                            {(configView === 'aspect' || configView === 'voice') && (
                                                <div className="config-modal md:hidden absolute bottom-full left-0 mb-4 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[70] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <button 
                                                        onClick={() => setConfigView('mobile_settings')}
                                                        className="flex items-center gap-2 px-2 py-1 mb-2 text-zinc-500 hover:text-white transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                                                    </button>
                                                    
                                                    {configView === 'aspect' && (
                                                        <div className="space-y-1">
                                                            {[
                                                                { id: '9:16', label: '9:16 Vertical' },
                                                                { id: '16:9', label: '16:9 Landscape' }
                                                            ].map((opt) => (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => { setAspect(opt.id as any); setConfigView('main'); }}
                                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${aspect === opt.id ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {configView === 'voice' && (
                                                        <div className="p-1">
                                                            <div className="mb-2">
                                                                <button 
                                                                    onClick={() => setVoiceAccordion(voiceAccordion === 'narrator' ? null : 'narrator')}
                                                                    className="w-full flex items-center justify-between px-2 py-1 mb-1 hover:bg-white/5 rounded-lg transition-colors"
                                                                >
                                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Narrator</h4>
                                                                    <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${voiceAccordion === 'narrator' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                                </button>
                                                                {voiceAccordion === 'narrator' && (
                                                                    <div className="space-y-1 max-h-48 overflow-y-auto thin-scrollbar pr-1">
                                                                        {VOICES.map(v => (
                                                                            <button
                                                                                key={v.id}
                                                                                onClick={() => handleVoiceSelect(v)}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${voice.id === v.id ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                            >
                                                                                <span>{v.name}</span>
                                                                                {VOICE_SAMPLES[v.id] && (
                                                                                    <div 
                                                                                        onClick={(e) => toggleVoiceSample(e, v.id)} 
                                                                                        className={`p-1 rounded-full ${playingVoiceId === v.id ? 'bg-black/20 text-black' : 'text-zinc-500 hover:text-white'}`}
                                                                                    >
                                                                                        {playingVoiceId === v.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <button 
                                                                    onClick={() => setVoiceAccordion(voiceAccordion === 'tone' ? null : 'tone')}
                                                                    className="w-full flex items-center justify-between px-2 py-1 mb-1 hover:bg-white/5 rounded-lg transition-colors"
                                                                >
                                                                    <div className="flex flex-col items-start w-full pr-4 overflow-hidden">
                                                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tone</h4>
                                                                        {voiceAccordion !== 'tone' && (
                                                                            <span className="text-[10px] text-yellow-500 font-bold truncate w-full text-left">{narrationStyle}</span>
                                                                        )}
                                                                    </div>
                                                                    <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 shrink-0 ${voiceAccordion === 'tone' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                                </button>
                                                                {voiceAccordion === 'tone' && (
                                                                    <div className="space-y-2 max-h-60 overflow-y-auto thin-scrollbar pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <textarea
                                                                            value={narrationStyle}
                                                                            onChange={(e) => setNarrationStyle(e.target.value)}
                                                                            placeholder="Enter custom narration style..."
                                                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500 resize-none min-h-[60px]"
                                                                        />
                                                                        <div className="space-y-1">
                                                                            {NARRATION_STYLES.map(s => (
                                                                                <button
                                                                                    key={s.id}
                                                                                    onClick={() => handleNarrationStyleChange(s.prompt)}
                                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle === s.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                                >
                                                                                    <span>{s.name}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                            </div>

                            {/* Right Side: Generate Button */}
                            <button 
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim() || prompt.length > MAX_CHARS}
                                className="w-12 h-12 flex-none bg-yellow-600 text-black rounded-2xl flex items-center justify-center hover:bg-yellow-500 transition disabled:opacity-50 shadow-lg shadow-yellow-500/20 transform active:scale-95 duration-200"
                            >
                                {loading ? (
                                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                                ) : (
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
            
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {notification.type === 'error' ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 hover:bg-zinc-900/20 rounded-full p-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Render Content */}
            {renderContent()}
        </div>
    );
};