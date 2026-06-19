
import React, { useState, useRef, useEffect } from 'react';
import { Equal, ChevronRight, ChevronLeft, Mic, Monitor, MonitorPlay, Sparkles, Settings2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { generateSegments, generateFreeTrialSegments, sanitizeErrorMsg } from './api';
import { ContentEditor } from './ContentEditor';
import { IMAGE_STYLES, EFFECT_PRESETS, LONG_FORM_PRESETS, VOICE_STYLES, VOICE_PACES, VOICE_ACCENTS, VoiceStyleConfig, SUBTITLE_PRESETS, DEFAULT_SUBTITLE_CONFIG, SubtitleConfiguration } from './types';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { STYLE_PREVIEWS, LANDING_PREVIEWS } from './creator-assets';
import { supabase } from '../../supabaseClient';
import { CreatorPricingCards } from './CreatorPricingCards';
import { createCheckoutSession } from '../../frontend-api';

const CHOSEN_GALLERY_VIDEOS = [
    "Hoorror Story",
    "Animated Story",
    "Skeleton Videos",
    "Stickman Videos",
    "Immersive Long Forms "
];

const GALLERY_VIDEO_MAPPINGS: Record<string, { style: string, aspect: '9:16' | '16:9' }> = {
    "Immersive Long Forms ": { style: "Realistic", aspect: "16:9" },
    "Hoorror Story": { style: "Creepy", aspect: "9:16" },
    "Animated Story": { style: "Game3D", aspect: "9:16" },
    "Stickman Videos": { style: "Stickman", aspect: "16:9" },
    "Skeleton Videos": { style: "Skeleton", aspect: "9:16" },
    "Motivational": { style: "Cartoon", aspect: "16:9" }
};

export const ContentDashboard = ({ session, onViewChange, initialProjectData, onClearProject, onToggleSidebar }: any) => {
    const [prompt, setPrompt] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    
    // Typewriter State
    const [placeholder, setPlaceholder] = useState('');
    const placeholderText = "Paste your script to instantly create a voiceover and video..";

    // Config Defaults
    const defaultVoiceStylePrompt = VOICE_STYLES.find(s => s.id === 'storyteller')?.prompt || VOICE_STYLES[0].prompt;
    const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
    const [style, setStyle] = useState(IMAGE_STYLES[0]);
    const [voice, setVoice] = useState(VOICES[0]); // Default to Charon (now first)
    const [narrationStyle, setNarrationStyle] = useState<VoiceStyleConfig>({ style: defaultVoiceStylePrompt, pace: VOICE_PACES.find(p => p.name === 'Fast')?.prompt || VOICE_PACES[1].prompt, accent: VOICE_ACCENTS[0].prompt }); // Default voice style config
    const [effect, setEffect] = useState(EFFECT_PRESETS[0]); // Default to Cinematic Pan

    useEffect(() => {
        if (aspect === '9:16' && (effect.id === 'documentary' || effect.id === 'immersive' || effect.id === 'storyteller' || effect.id === 'minimalist')) {
            setEffect(EFFECT_PRESETS[0]);
        }
    }, [aspect]);
    
    const [subtitles, setSubtitles] = useState<SubtitleConfiguration>(DEFAULT_SUBTITLE_CONFIG); 
    
    const [configView, setConfigView] = useState<'main' | 'voice' | 'narration_style' | 'aspect' | 'style' | 'effect' | 'mobile_settings'>('main');
    const [voiceAccordion, setVoiceAccordion] = useState<'narrator' | 'tone' | null>(null);
    const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
    const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});
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

    // Free Trial State
    const [usedFreeTrial, setUsedFreeTrial] = useState(false);
    const [dodoCustomerId, setDodoCustomerId] = useState<string | null>(null);
    const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
    
    // Pricing Overlay State
    const [showPricingModal, setShowPricingModal] = useState(false);

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
        // Fetch Credits and Profile details (for display only, gating handled in parent)
        const fetchProfileData = async () => {
            if (!session?.user?.id) return;
            const { data } = await supabase.from('profiles').select('credits, used_free_trial, dodo_customer_id').eq('id', session.user.id).single();
            if (data) {
                setCredits(data.credits || 0);
                setUsedFreeTrial(data.used_free_trial || false);
                setDodoCustomerId(data.dodo_customer_id || null);
            }
        };
        fetchProfileData();

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
                        let parsedStyle: any = null;
                        if (typeof data.narration_style === 'object') {
                            parsedStyle = { ...data.narration_style };
                        } else if (typeof data.narration_style === 'string') {
                            try {
                                parsedStyle = JSON.parse(data.narration_style);
                            } catch (e) {
                                // Ignore legacy string formats
                            }
                        }
                        if (parsedStyle) {
                            if (!VOICE_STYLES.find(s => s.prompt === parsedStyle.style)) {
                                parsedStyle.style = defaultVoiceStylePrompt;
                            }
                            setNarrationStyle(parsedStyle);
                        }
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
                let parsedStyle = { ...initialProjectData.project.narration_style };
                if (!VOICE_STYLES.find(s => s.prompt === parsedStyle.style)) {
                    parsedStyle.style = defaultVoiceStylePrompt;
                }
                setNarrationStyle(parsedStyle);
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

    const handleNarrationStyleChange = (key: keyof VoiceStyleConfig, value: string) => {
        setNarrationStyle(prev => ({ ...prev, [key]: value }));
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

    const handleGenerateClick = () => {
        if (!prompt.trim()) return;
        if (!dodoCustomerId && !usedFreeTrial) {
            setShowFreeTrialModal(true);
        } else {
            handleGenerate(false);
        }
    };

    const handleConfirmFreeTrial = () => {
        setShowFreeTrialModal(false);
        handleGenerate(true);
    };

    const handleGenerate = async (isFreeTrial: boolean) => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            console.log(`[ContentDashboard] Starting generation... (Free Trial: ${isFreeTrial})`);
            
            // Ensure we use the correct default if user hasn't touched it
            let finalEffectId = effect.id;

            let res;
            if (isFreeTrial) {
                res = await generateFreeTrialSegments(prompt, aspect, style, finalEffectId, session.user.id, narrationStyle, subtitles, voice.id);
            } else {
                res = await generateSegments(prompt, aspect, style, finalEffectId, session.user.id, narrationStyle, subtitles, voice.id);
            }
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
            const errorMsg = sanitizeErrorMsg(e, "Generation failed");
            
            if (errorMsg.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setNotification({ message: errorMsg, type: 'error' });
                setTimeout(() => setNotification(null), 5000);
            }
            
            if (e.isPartial && e.projectId && e.segments) {
                setProject({ 
                    id: e.projectId, 
                    title: prompt, 
                    aspect_ratio: aspect, 
                    voice_id: voice.id,
                    effect: effect.id,
                    image_style: style,
                    narration_style: narrationStyle,
                    subtitles: subtitles,
                    status: 'draft'
                });
                setSegments(e.segments);
            }
        } finally {
            setLoading(false);
        }
    };

    const MAX_CHARS = 40000;

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
                dodoCustomerId={dodoCustomerId}
                onViewChange={onViewChange}
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

                {/* Header */}
                <div className="w-full mt-12 md:mt-16 flex flex-col items-center">
                    <h1 className="text-sm sm:text-2xl md:text-4xl font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 text-center whitespace-nowrap">
                        Script To Video
                    </h1>

                    {/* Prompt Box Section */}
                    <div className="w-full max-w-3xl px-4 md:px-8 mb-12 flex justify-center z-20">
                        <div ref={promptBoxRef} className={`w-full bg-zinc-900 rounded-3xl shadow-2xl border ${prompt.length > MAX_CHARS ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10'} flex flex-col transition-colors duration-200`}>
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
                                            <div className="config-modal absolute top-full left-0 mt-4 w-[280px] sm:w-[400px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto thin-scrollbar pr-2">
                                                    {IMAGE_STYLES.map(s => (
                                                        <div
                                                            key={s}
                                                            onClick={() => { setStyle(s); setConfigView('main'); }}
                                                            className={`cursor-pointer rounded-xl overflow-hidden relative border-2 transition-all group ${style === s ? 'border-yellow-500' : 'border-transparent hover:border-white/20'}`}
                                                        >
                                                            <div className="aspect-square w-full">
                                                                <img 
                                                                    src={STYLE_PREVIEWS[s]} 
                                                                    alt={s}
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                />
                                                            </div>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                                                <span className={`text-[10px] sm:text-xs font-bold w-full text-center tracking-wider uppercase ${style === s ? 'text-yellow-500' : 'text-white'}`}>
                                                                    {s}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
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
                                                    <div className="config-modal absolute top-full left-0 mt-4 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
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
                                                    <div className="config-modal absolute top-full left-0 mt-4 w-[360px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
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
                                                                        <span className="text-[10px] text-yellow-500 font-bold truncate w-full text-left">{VOICE_STYLES.find(s => s.prompt === narrationStyle.style)?.name || VOICE_STYLES.find(s => s.id === 'storyteller')?.name || VOICE_STYLES[0].name}</span>
                                                                    )}
                                                                </div>
                                                                <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 shrink-0 ${voiceAccordion === 'tone' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                            </button>
                                                            {voiceAccordion === 'tone' && (
                                                                <div className="flex gap-2 p-1 max-h-[300px] overflow-y-auto thin-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    <div className="flex-1 space-y-1">
                                                                        <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1">Style</div>
                                                                        {VOICE_STYLES.map(s => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={() => handleNarrationStyleChange('style', s.prompt)}
                                                                                className={`w-full flex flex-col items-start px-3 py-2 rounded-xl transition-all ${narrationStyle.style === s.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                                title={s.description}
                                                                            >
                                                                                <span className="text-xs font-bold">{s.name}</span>
                                                                                <span className={`text-[10px] ${narrationStyle.style === s.prompt ? 'text-black/70' : 'text-zinc-500'} text-left line-clamp-1`}>{s.description}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex-1 border-l border-white/5 pl-2 space-y-1">
                                                                        <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1">Pace</div>
                                                                        {VOICE_PACES.map(p => (
                                                                            <button
                                                                                key={p.id}
                                                                                onClick={() => handleNarrationStyleChange('pace', p.prompt)}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle.pace === p.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                            >
                                                                                <span>{p.name}</span>
                                                                            </button>
                                                                        ))}
                                                                        <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1 mt-4">Accent</div>
                                                                        {VOICE_ACCENTS.map(a => (
                                                                            <button
                                                                                key={a.id}
                                                                                onClick={() => handleNarrationStyleChange('accent', a.prompt)}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle.accent === a.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                            >
                                                                                <span>{a.name}</span>
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
                                                <div className="config-modal absolute top-full left-0 mt-4 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
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
                                                <div className={`config-modal md:hidden absolute top-full left-0 mt-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200 ${configView === 'voice' ? 'w-[360px]' : 'w-64'}`}>
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
                                                                            <span className="text-[10px] text-yellow-500 font-bold truncate w-full text-left">{VOICE_STYLES.find(s => s.prompt === narrationStyle.style)?.name || VOICE_STYLES.find(s => s.id === 'storyteller')?.name || VOICE_STYLES[0].name}</span>
                                                                        )}
                                                                    </div>
                                                                    <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 shrink-0 ${voiceAccordion === 'tone' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                                                                </button>
                                                                {voiceAccordion === 'tone' && (
                                                                    <div className="flex gap-2 p-1 max-h-[300px] overflow-y-auto thin-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <div className="flex-1 space-y-1">
                                                                            <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1">Style</div>
                                                                            {VOICE_STYLES.map(s => (
                                                                                <button
                                                                                    key={s.id}
                                                                                    onClick={() => handleNarrationStyleChange('style', s.prompt)}
                                                                                    className={`w-full flex flex-col items-start px-3 py-2 rounded-xl transition-all ${narrationStyle.style === s.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                                    title={s.description}
                                                                                >
                                                                                    <span className="text-xs font-bold">{s.name}</span>
                                                                                    <span className={`text-[10px] ${narrationStyle.style === s.prompt ? 'text-black/70' : 'text-zinc-500'} text-left line-clamp-1`}>{s.description}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex-1 border-l border-white/5 pl-2 space-y-1">
                                                                            <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1">Pace</div>
                                                                            {VOICE_PACES.map(p => (
                                                                                <button
                                                                                    key={p.id}
                                                                                    onClick={() => handleNarrationStyleChange('pace', p.prompt)}
                                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle.pace === p.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                                >
                                                                                    <span>{p.name}</span>
                                                                                </button>
                                                                            ))}
                                                                            <div className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1 mt-4">Accent</div>
                                                                            {VOICE_ACCENTS.map(a => (
                                                                                <button
                                                                                    key={a.id}
                                                                                    onClick={() => handleNarrationStyleChange('accent', a.prompt)}
                                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${narrationStyle.accent === a.prompt ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                                                >
                                                                                    <span>{a.name}</span>
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
                                onClick={handleGenerateClick}
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

                {/* Style Gallery Section */}
                <div className="w-full flex flex-col items-center justify-center p-4 pb-32">
                    <div 
                        ref={galleryRef}
                        className="w-full max-w-7xl flex gap-4 overflow-x-auto pb-4 thin-scrollbar snap-x snap-mandatory px-4 md:px-12"
                    >
                        {CHOSEN_GALLERY_VIDEOS.map((videoId) => {
                            const config = GALLERY_VIDEO_MAPPINGS[videoId] || { style: "Cartoon", aspect: "9:16" };
                            return (
                            <div 
                                key={videoId}
                                onMouseEnter={() => setHoveredStyle(videoId)}
                                onMouseLeave={() => setHoveredStyle(null)}
                                className={`flex-none snap-start transition-all duration-300 opacity-70 hover:opacity-100 cursor-pointer`}
                            >
                                <div className={`relative rounded-2xl overflow-hidden border-4 transition-colors duration-300 border-white/5`}>
                                    <video 
                                        src={LANDING_PREVIEWS[videoId]?.src} 
                                        preload="metadata"
                                        className="h-[30vh] md:h-[40vh] w-auto object-cover"
                                        style={{ aspectRatio: config.aspect === '9:16' ? '9/16' : '16/9' }}
                                        autoPlay={hoveredStyle === videoId} 
                                        muted={mutedStates[videoId] !== false} 
                                        loop 
                                        playsInline
                                        ref={(el) => {
                                            if (el) {
                                                if (hoveredStyle === videoId) {
                                                    el.play().catch(() => {});
                                                } else {
                                                    el.pause();
                                                }
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMutedStates(prev => ({ ...prev, [videoId]: prev[videoId] === false }));
                                        }}
                                        className={`absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/80 transition-opacity duration-300 z-20 ${hoveredStyle === videoId ? 'opacity-100' : 'opacity-0'}`}
                                        aria-label="Toggle sound"
                                    >
                                        {mutedStates[videoId] === false ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                    </button>
                                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${hoveredStyle === videoId ? 'opacity-100' : 'opacity-0'}`}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStyle(config.style);
                                                setAspect(config.aspect);
                                            }}
                                            className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.5)] whitespace-nowrap"
                                        >
                                            Use Style
                                        </button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>

                {/* Free Trial Modal */}
                {showFreeTrialModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-fade-in-up">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white text-center mb-4">Start Your Free Trial!</h2>
                            <p className="text-zinc-300 text-center mb-8 leading-relaxed">
                                You're using your free trial! Your script will be optimized for a 30-40 second short. After this, your own script will be used as-is for future generations.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowFreeTrialModal(false)}
                                    className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmFreeTrial}
                                    className="flex-1 py-3 bg-yellow-600 text-black rounded-xl font-bold hover:bg-yellow-500 transition"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Overlay Modal */}
                {showPricingModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-6 max-w-5xl w-full shadow-2xl relative animate-fade-in-up mt-auto mb-auto my-12 text-center">
                            <button 
                                onClick={() => setShowPricingModal(false)}
                                className="absolute top-6 right-6 p-2 bg-black hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-full transition"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Out of Credits!</h2>
                            <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                                Choose a pack below to continue creating amazing content instantly.
                            </p>
                            
                            <CreatorPricingCards 
                                onAction={async (productId) => {
                                    try {
                                        const { checkout_url } = await createCheckoutSession(productId);
                                        window.location.href = checkout_url;
                                    } catch (e) {
                                        console.error(e);
                                        setNotification({ message: "Failed to initiate checkout", type: "error" });
                                    }
                                }} 
                                actionLabel="Buy Pack" 
                            />
                        </div>
                    </div>
                )}
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