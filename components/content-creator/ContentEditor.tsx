import React, { useState, useEffect, useRef } from 'react';
import { editImageSegment, saveSegments, generateFinalVideo, regenerateImageSegment } from './api';
import { supabase } from '../../supabaseClient';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { EFFECT_PRESETS, NARRATION_STYLES, PICTURE_QUALITY_OPTIONS, SUBTITLE_PRESETS } from './types';
import { STYLE_PREVIEWS } from './creator-assets';
import { SubtitlePreview } from './SubtitlePreviews';

export const ContentEditor = ({ session, project, initialSegments, onBack, onComplete }: any) => {
    const [segments, setSegments] = useState(initialSegments);
    const [localProject, setLocalProject] = useState(project); // Local project copy for status sync
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Config Panel State
    const [configView, setConfigView] = useState<'main' | 'voice' | 'effect' | 'narration_style' | 'subtitles'>('main');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // Local state for editable settings
    const [voice, setVoice] = useState(VOICES.find(v => v.id === project.voice_id) || VOICES[0]);
    const [effect, setEffect] = useState(EFFECT_PRESETS.find(e => e.id === project.effect) || EFFECT_PRESETS[0]);
    
    // Default style or match by prompt text
    const initialStyle = NARRATION_STYLES.find(s => s.prompt === project.narration_style) || NARRATION_STYLES[0];
    const [narrationStyle, setNarrationStyle] = useState(initialStyle);

    const initialSubtitles = SUBTITLE_PRESETS.find(s => s.id === project.subtitles) || SUBTITLE_PRESETS[0];
    const [subtitles, setSubtitles] = useState(initialSubtitles);
    
    // Audio Preview
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Display Picture Quality
    const pictureQuality = PICTURE_QUALITY_OPTIONS.find(q => q.id === project.picture_quality) || PICTURE_QUALITY_OPTIONS[0];

    // --- SYNC LOGIC ---

    // 0. Initialize Config Panel State
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setIsConfigOpen(true);
        }
    }, []);

    // 1. Fetch latest project status on mount (handles page reloads or delays)
    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await supabase.from('content_projects').select('status').eq('id', project.id).single();
            if (data) {
                setLocalProject((prev: any) => ({ ...prev, status: data.status }));
            }
        };
        fetchProject();
    }, [project.id]);

    // 2. Subscribe to Project Status Changes
    useEffect(() => {
        const channel = supabase.channel(`project-status-${project.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'content_projects',
                filter: `id=eq.${project.id}`
            }, (payload) => {
                setLocalProject((prev: any) => ({ ...prev, status: payload.new.status }));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [project.id]);

    // 3. Subscribe to Segment Changes (Existing)
    useEffect(() => {
        console.log(`[ContentEditor] Subscribing to segment updates for project ${project.id}`);
        const channel = supabase.channel(`project-segments-${project.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'content_segments',
                filter: `project_id=eq.${project.id}`
            }, (payload) => {
                console.log("[ContentEditor] Received segment update", payload);
                setSegments((prev: any[]) => prev.map(s => 
                    s.id === payload.new.id ? { ...s, image_url: payload.new.image_url } : s
                ));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [project.id]);

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

    const handleVoiceSelect = async (newVoice: any) => {
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayingVoiceId(null);
        }
        setVoice(newVoice);
        setConfigView('main');
        await supabase.from('content_projects').update({ voice_id: newVoice.id }).eq('id', project.id);
    };

    const handleTextChange = (id: string, text: string) => {
        setSegments((prev: any[]) => prev.map(s => s.id === id ? { ...s, narration: text } : s));
    };

    const handleRegenerate = async () => {
        if (!regeneratingId) return;
        
        const seg = segments.find((s: any) => s.id === regeneratingId);
        if (!seg) return;

        setLoadingImage(true);
        try {
            const res = await regenerateImageSegment(
                seg.id, 
                project.id, 
                seg.image_prompt, 
                project.aspect_ratio,
                seg.image_url
            );
            
            setSegments((prev: any[]) => prev.map(s => s.id === regeneratingId ? { ...s, image_url: res.imageUrl } : s));
            setRegeneratingId(null);
        } catch (e) {
            console.error(e);
            alert('Regeneration failed');
        } finally {
            setLoadingImage(false);
        }
    };

    const handleImageEdit = async () => {
        if (!editingImageId || !editPrompt) return;
        setLoadingImage(true);
        const seg = segments.find((s: any) => s.id === editingImageId);
        try {
            const res = await editImageSegment(seg.id, seg.image_url, editPrompt);
            setSegments((prev: any[]) => prev.map(s => s.id === editingImageId ? { ...s, image_url: res.imageUrl } : s));
            setEditingImageId(null);
            setEditPrompt('');
        } catch (e) {
            console.error(e);
            alert('Edit failed');
        } finally {
            setLoadingImage(false);
        }
    };

    const handleEffectChange = async (newEffect: any) => {
        setEffect(newEffect);
        setConfigView('main');
        await supabase.from('content_projects').update({ effect: newEffect.id }).eq('id', project.id);
    };

    const handleNarrationStyleChange = async (newStyle: any) => {
        setNarrationStyle(newStyle);
        setConfigView('main');
        await supabase.from('content_projects').update({ narration_style: newStyle.prompt }).eq('id', project.id);
    };

    const handleSubtitlesChange = async (newSubs: any) => {
        setSubtitles(newSubs);
        setConfigView('main');
        await supabase.from('content_projects').update({ subtitles: newSubs.id }).eq('id', project.id);
    };

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            await saveSegments(segments);
            await generateFinalVideo(project.id, voice.id, session.user.id);
            onComplete();
        } catch(e) {
            alert('Failed to start generation');
            setSubmitting(false);
        }
    };

    // Gate completion: All segments must have an image
    const allImagesReady = segments.every((s: any) => s.image_url);

    return (
        <div className="fixed inset-0 z-50 md:static md:inset-auto md:z-auto flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
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
                @keyframes delayedFadeIn {
                    0% { opacity: 0; }
                    90% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-delayed-fade-in {
                    animation: delayedFadeIn 15s forwards;
                }
            `}</style>

            {/* Config Toggle (Desktop & Mobile) - Shows when closed */}
             <div className={`absolute top-4 right-4 z-30 ${isConfigOpen && 'md:hidden'}`}>
                <button 
                    onClick={() => setIsConfigOpen(!isConfigOpen)} 
                    className="p-3 text-white bg-black hover:bg-slate-800 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105 group"
                    title="Open Configuration"
                >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0h-3m-3 0H3.75m11.25 6h4.5m-4.5 0a1.5 1.5 0 01-3 0m3 0h-3m-3 0H3.75m11.25 6h4.5m-4.5 0a1.5 1.5 0 01-3 0m3 0h-3m-3 0H3.75" />
                    </svg>
                </button>
            </div>

            {/* Config Sidebar (Right Side) */}
            <div className={`absolute inset-y-0 right-0 w-80 bg-white border-l border-slate-200 p-6 transform transition-transform z-40 ${isConfigOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'} overflow-y-auto thin-scrollbar`}>
                
                {/* Close Button (Universal) */}
                <div className="flex justify-end mb-4">
                    <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {configView === 'main' && (
                    <>
                        <h3 className="font-black text-xl mb-4 uppercase tracking-tight text-slate-900">Configuration</h3>
                        
                        <div className="space-y-6">
                            
                            {/* --- VISUAL CONFIG SECTION (READ ONLY + EFFECTS) --- */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Visual Config</h4>
                                
                                <div className="space-y-3">
                                    {/* Style (Read Only) */}
                                    <div className="w-full flex items-center justify-between p-2 pl-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold opacity-70 cursor-not-allowed">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0 shadow-sm border border-slate-200">
                                                <img src={STYLE_PREVIEWS[project.image_style || 'Realistic']} alt={project.image_style} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Style</span>
                                                <span className="text-slate-900">{project.image_style || 'Realistic'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ratio (Read Only) */}
                                    <div className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold opacity-70 cursor-not-allowed">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block leading-tight">Ratio</span>
                                            <span className="text-slate-900">{project.aspect_ratio === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}</span>
                                        </div>
                                    </div>

                                    {/* Quality (Read Only) */}
                                    <div className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold opacity-70 cursor-not-allowed">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block leading-tight">Quality</span>
                                            <span className="text-slate-900">{pictureQuality.name}</span>
                                        </div>
                                    </div>

                                    {/* Effects (Editable) */}
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

                            {/* --- VOICE CONFIG SECTION (EDITABLE) --- */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-4 border-b border-slate-100 pb-2">Voice Config</h4>
                                
                                <div className="space-y-3">
                                    {/* Narrator */}
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

                                    {/* Narration Style */}
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

                                    {/* Subtitles */}
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

                {/* Sub Views */}
                {configView === 'effect' && (
                    <>
                         <div className="flex items-center gap-2 mb-6">
                            <button onClick={() => setConfigView('main')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                            <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Video Effects</h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                            {EFFECT_PRESETS.map(e => (
                                <button
                                    key={e.id}
                                    onClick={() => handleEffectChange(e)}
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
                            <button onClick={() => setConfigView('main')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                            <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Subtitles</h3>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-2 thin-scrollbar">
                            {SUBTITLE_PRESETS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSubtitlesChange(s)}
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
                            <button onClick={() => setConfigView('main')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
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
                            <button onClick={() => setConfigView('main')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
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

            {/* Header */}
            <div className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 transition-all duration-300 ${isConfigOpen ? 'md:mr-80' : ''} relative`}>
                <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-black z-10">
                    ← <span className="hidden md:inline">Back</span>
                </button>
                <h3 className="hidden md:block font-black text-lg truncate max-w-xs absolute left-1/2 -translate-x-1/2 text-slate-900">{project.title}</h3>
                <div className="md:hidden absolute left-1/2 -translate-x-1/2 w-max">
                     <button 
                        onClick={handleFinalize}
                        disabled={submitting || !allImagesReady}
                        className="px-6 py-2 bg-yellow-600 text-black font-bold rounded-full shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                    >
                        {submitting ? 'Starting...' : 'Generate'}
                    </button>
                </div>
                <button 
                    onClick={handleFinalize}
                    disabled={submitting || !allImagesReady}
                    className="hidden md:block px-6 py-2 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title={!allImagesReady ? "Wait for all images to generate" : ""}
                >
                    {submitting ? 'Starting...' : 'Generate Video'}
                </button>
            </div>

            {/* Content List */}
            <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isConfigOpen ? 'md:mr-80' : ''} thin-scrollbar bg-slate-50`}>
                <div className="max-w-3xl mx-auto w-full p-6 space-y-8">
                    {segments.map((seg: any, idx: number) => (
                        <div key={seg.id || idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6">
                            {/* Image Preview Area */}
                            <div className="relative w-full md:w-48 aspect-[9/16] md:aspect-square bg-slate-100 rounded-2xl overflow-hidden shrink-0 group">
                                {seg.image_url ? (
                                    <>
                                        <img src={seg.image_url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => setRegeneratingId(seg.id)}
                                                className="p-2 bg-white/20 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition"
                                                title="Regenerate Image"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => setEditingImageId(seg.id)}
                                                className="p-2 bg-white/20 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition"
                                                title="Edit with AI"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 relative group border-2 border-dashed border-slate-200">
                                        {localProject.status === 'generating' ? (
                                            /* Generating State: Spinner Only */
                                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                        ) : (
                                            /* Finished (Failed) State: Retry Button Immediately */
                                            <div className="flex flex-col items-center gap-2">
                                                 <button 
                                                    onClick={() => setRegeneratingId(seg.id)}
                                                    className="px-4 py-2 bg-white text-blue-600 text-xs font-bold rounded-lg shadow-sm border border-blue-100 hover:bg-blue-50 transition"
                                                    title="Retry Generation"
                                                >
                                                    Retry
                                                </button>
                                                <span className="text-[10px] text-red-400 font-bold">
                                                    Generation Failed
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Text Editor */}
                            <div className="flex-1 flex flex-col">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Segment {idx + 1}</span>
                                <textarea 
                                    className="w-full flex-1 resize-none outline-none text-lg font-medium text-slate-800 placeholder-slate-300"
                                    value={seg.narration}
                                    onChange={(e) => handleTextChange(seg.id, e.target.value)}
                                    placeholder="Write narration..."
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Regeneration Confirmation Modal */}
            {regeneratingId && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 text-slate-900">Regenerate Image?</h3>
                        <p className="text-slate-500 mb-6 text-sm">This will discard the current image (if any) and generate a new one using the original prompt.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setRegeneratingId(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                            <button 
                                onClick={handleRegenerate}
                                disabled={loadingImage}
                                className="px-6 py-2 bg-yellow-600 text-black rounded-xl font-bold hover:bg-yellow-500 transition shadow-lg"
                            >
                                {loadingImage ? 'Generating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingImageId && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-slate-900">Edit Image</h3>
                        <input 
                            className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Describe change (e.g., 'make it night time')"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingImageId(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                            <button 
                                onClick={handleImageEdit}
                                disabled={loadingImage}
                                className="px-6 py-2 bg-yellow-600 text-black rounded-xl font-bold hover:bg-yellow-500 transition shadow-lg"
                            >
                                {loadingImage ? 'Editing...' : 'Apply Edit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};