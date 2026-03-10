import React, { useState, useEffect, useRef } from 'react';
import { editImageSegment, saveSegments, regenerateImageSegment, generateAssets, exportVideo } from './api';
import { ContentVideoPlayer } from './ContentVideoPlayer';
import { supabase } from '../../supabaseClient';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { EFFECT_PRESETS, NARRATION_STYLES, PICTURE_QUALITY_OPTIONS, SUBTITLE_PRESETS, SubtitleConfiguration, DEFAULT_SUBTITLE_CONFIG } from './types';
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
    const [showAudioConfirmation, setShowAudioConfirmation] = useState(false);

    // New State for Real-time Preview
    const [audioUrl, setAudioUrl] = useState<string | null>(project.voice_file_path || null);
    const [transcription, setTranscription] = useState<any | null>(project.transcription || null);
    const [segmentDurations, setSegmentDurations] = useState<number[]>(project.segment_durations || []);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
    
    // Action Status States
    const [exportStatus, setExportStatus] = useState<'idle' | 'error'>('idle');
    const [regenerateStatus, setRegenerateStatus] = useState<'idle' | 'error'>('idle');
    const [editStatus, setEditStatus] = useState<'idle' | 'error'>('idle');
    const [saveDefaultStatus, setSaveDefaultStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
    const [lastStatus, setLastStatus] = useState<string | null>(project.status);
    const [lastRenderStatus, setLastRenderStatus] = useState<string | null>(project.render_status);

    // Timer logic for generation
    const sanitizeError = (error: any, fallback: string) => {
        const message = error?.message || String(error) || "";
        const lowerMessage = message.toLowerCase();
        
        const isTechnical = 
            lowerMessage.includes('quota') || 
            lowerMessage.includes('limit') || 
            lowerMessage.includes('rate') ||
            lowerMessage.includes('credit') || 
            lowerMessage.includes('balance') || 
            lowerMessage.includes('insufficient') ||
            lowerMessage.includes('gemini') || 
            lowerMessage.includes('ai') || 
            lowerMessage.includes('model') || 
            lowerMessage.includes('safety') ||
            lowerMessage.includes('network') || 
            lowerMessage.includes('fetch') || 
            lowerMessage.includes('timeout') ||
            lowerMessage.includes('{') ||
            message.length > 100;

        if (isTechnical) {
            if (lowerMessage.includes('credit') || lowerMessage.includes('balance') || lowerMessage.includes('insufficient')) {
                return "Insufficient credits to perform this action.";
            }
            if (lowerMessage.includes('safety')) {
                return "The content was flagged by our safety filters. Please try a different prompt.";
            }
            return fallback;
        }

        return message || fallback;
    };

    useEffect(() => {
        let interval: any;
        if (isGeneratingAssets || loadingImage || submitting) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isGeneratingAssets, loadingImage, submitting]);

    // Fetch latest project details on mount
    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await supabase.from('content_projects').select('*').eq('id', project.id).single();
            if (data) {
                setLocalProject(data);
                setAudioUrl(data.voice_file_path);
                setTranscription(data.transcription);
                setSegmentDurations(data.segment_durations || []);
                if (data.subtitles) {
                    setSubtitles(data.subtitles as SubtitleConfiguration);
                }
            }
        };
        fetchProject();
    }, [project.id]);

    // Generate Assets if missing
    useEffect(() => {
        // Removed automatic background generation on mount.
        // The server now handles this in the background when the project is first created.
        // Manual regeneration is still available via handleRegenerateVoice.
    }, [audioUrl, localProject.status, localProject.render_status]);

    const handleGenerateAssets = async () => {
        setIsGeneratingAssets(true);
        setErrorMessage(null);
        try {
            // Save segments first to ensure script is up to date
            await saveSegments(segments);
            const res = await generateAssets(project.id, voice.id, session.user.id);
            setAudioUrl(res.audioUrl);
            setTranscription(res.transcription);
            setSegmentDurations(res.segmentDurations);
            // Refresh project to get updated status
            const { data } = await supabase.from('content_projects').select('*').eq('id', project.id).single();
            if (data) setLocalProject(data);
            return true;
        } catch (e: any) {
            console.error("Asset generation failed", e);
            const friendlyError = sanitizeError(e, "Asset generation failed. Credits were not charged or have been refunded.");
            setErrorMessage(friendlyError);
            setNotification({
                message: friendlyError,
                type: 'error'
            });
            setTimeout(() => {
                setErrorMessage(null);
                setNotification(null);
            }, 6000);
            return false;
        } finally {
            setIsGeneratingAssets(false);
        }
    };

    const handleExport = async () => {
        setSubmitting(true);
        setExportStatus('idle');
        setErrorMessage(null);
        try {
            await supabase.from('content_projects').update({ subtitles: subtitles }).eq('id', project.id);
            await exportVideo(project.id, session.user.id);
            onComplete();
        } catch (e: any) {
            setExportStatus('error');
            const friendlyError = sanitizeError(e, "Export failed. Please try again.");
            setErrorMessage(friendlyError);
            setNotification({
                message: friendlyError,
                type: 'error'
            });
            setTimeout(() => {
                setExportStatus('idle');
                setErrorMessage(null);
                setNotification(null);
            }, 6000);
            setSubmitting(false);
        }
    };

    const handleRegenerateVoice = async () => {
        if (isGeneratingAssets) return;
        setShowAudioConfirmation(true);
    };

    const confirmRegenerateVoice = async () => {
        const success = await handleGenerateAssets();
        if (success) {
            setShowAudioConfirmation(false);
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);
    const handleTimeUpdate = (t: number) => setCurrentTime(t);
    
    // Config Panel State
    const [activeModule, setActiveModule] = useState<'narration' | 'images' | 'effect' | 'captions' | null>('images');
    const [isMobileConfigOpen, setIsMobileConfigOpen] = useState(true);
    const [narrationSection, setNarrationSection] = useState<'voice' | 'style' | null>(null);
    const [subtitleView, setSubtitleView] = useState<'summary' | 'edit'>('summary');
    
    // Local state for editable settings
    const [voice, setVoice] = useState(VOICES.find(v => v.id === project.voice_id) || VOICES[0]);
    const [effect, setEffect] = useState(EFFECT_PRESETS.find(e => e.id === project.effect) || EFFECT_PRESETS[0]);
    
    // Default style or match by prompt text
    const initialStyle = NARRATION_STYLES.find(s => s.prompt === project.narration_style) || NARRATION_STYLES[0];
    const [narrationStyle, setNarrationStyle] = useState(initialStyle);

    // Initialize subtitles from project or default
    const [subtitles, setSubtitles] = useState<SubtitleConfiguration>(() => {
        return project.subtitles as SubtitleConfiguration || DEFAULT_SUBTITLE_CONFIG;
    });
    
    // Audio Preview
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Display Picture Quality
    const pictureQuality = PICTURE_QUALITY_OPTIONS.find(q => q.id === project.picture_quality) || PICTURE_QUALITY_OPTIONS[0];

    // --- SYNC LOGIC ---

    // 2. Subscribe to Project Status Changes
    useEffect(() => {
        const channel = supabase.channel(`project-status-${project.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'content_projects',
                filter: `id=eq.${project.id}`
            }, (payload) => {
                console.log("[ContentEditor] Project update received", payload.new);
                const oldStatus = lastStatus || localProject.status;
                const oldRenderStatus = lastRenderStatus || localProject.render_status;
                
                setLocalProject((prev: any) => ({ ...prev, ...payload.new }));
                setLastStatus(payload.new.status);
                setLastRenderStatus(payload.new.render_status);

                // Check for image generation failures
                if (oldStatus === 'generating' && payload.new.status === 'draft') {
                    // We need to wait a bit for segments to sync or fetch them
                    setTimeout(async () => {
                        const { data: currentSegments } = await supabase.from('content_segments').select('image_url').eq('project_id', project.id);
                        if (currentSegments) {
                            const failedCount = currentSegments.filter(s => !s.image_url).length;
                            if (failedCount > 0) {
                                setNotification({
                                    message: `${failedCount} image generation failed, credits refunded. Try regenerating the images.`,
                                    type: 'error'
                                });
                                setTimeout(() => setNotification(null), 6000);
                            }
                        }
                    }, 1000);
                }

                // Check for audio generation failures
                if (oldRenderStatus === 'generating' && payload.new.render_status === 'failed') {
                    setNotification({
                        message: `Audio generation failed, credits refunded. Try regenerating the audio.`,
                        type: 'error'
                    });
                    setTimeout(() => setNotification(null), 6000);
                }
                
                // Auto-load assets when they appear in the DB
                if (payload.new.voice_file_path && !audioUrl) {
                    setAudioUrl(payload.new.voice_file_path);
                    setTranscription(payload.new.transcription);
                    setSegmentDurations(payload.new.segment_durations || []);
                    // Auto-play when ready
                    setIsPlaying(true);
                }
                if (payload.new.subtitles) {
                    setSubtitles(payload.new.subtitles as SubtitleConfiguration);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [project.id, audioUrl]);

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
        await supabase.from('content_projects').update({ voice_id: newVoice.id }).eq('id', project.id);
    };

    const handleRegenerate = async () => {
        if (!regeneratingId) return;
        
        const seg = segments.find((s: any) => s.id === regeneratingId);
        if (!seg) return;

        setLoadingImage(true);
        setRegenerateStatus('idle');
        setErrorMessage(null);
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
        } catch (e: any) {
            console.error(e);
            setRegenerateStatus('error');
            const friendlyError = sanitizeError(e, "Image regeneration failed. Credits were not charged or have been refunded.");
            setErrorMessage(friendlyError);
            setNotification({
                message: friendlyError,
                type: 'error'
            });
            setTimeout(() => {
                setRegenerateStatus('idle');
                setErrorMessage(null);
                setNotification(null);
            }, 6000);
        } finally {
            setLoadingImage(false);
        }
    };

    const handleImageEdit = async () => {
        if (!editingImageId || !editPrompt) return;
        setLoadingImage(true);
        setEditStatus('idle');
        setErrorMessage(null);
        const seg = segments.find((s: any) => s.id === editingImageId);
        try {
            const res = await editImageSegment(seg.id, seg.image_url, editPrompt);
            setSegments((prev: any[]) => prev.map(s => s.id === editingImageId ? { ...s, image_url: res.imageUrl } : s));
            setEditingImageId(null);
            setEditPrompt('');
        } catch (e: any) {
            console.error(e);
            setEditStatus('error');
            const friendlyError = sanitizeError(e, "Image edit failed. Credits were not charged or have been refunded.");
            setErrorMessage(friendlyError);
            setNotification({
                message: friendlyError,
                type: 'error'
            });
            setTimeout(() => {
                setEditStatus('idle');
                setErrorMessage(null);
                setNotification(null);
            }, 6000);
        } finally {
            setLoadingImage(false);
        }
    };

    const handleEffectChange = async (newEffect: any) => {
        setEffect(newEffect);
        await supabase.from('content_projects').update({ effect: newEffect.id }).eq('id', project.id);
    };

    const handleNarrationStyleChange = async (newStyle: any) => {
        setNarrationStyle(newStyle);
        await supabase.from('content_projects').update({ narration_style: newStyle.prompt }).eq('id', project.id);
    };

    const handleSubtitleUpdate = (updates: Partial<SubtitleConfiguration>) => {
        const newConfig = { ...subtitles, ...updates };
        setSubtitles(newConfig);
        // Persist to DB
        supabase.from('content_projects').update({ subtitles: newConfig }).eq('id', project.id).then();
    };

    const handleApplySubtitlePreset = (presetId: string) => {
        let updates: Partial<SubtitleConfiguration> = {};
        if (presetId === 'pulse_bold') {
            updates = { animationType: 'pulse_bold', fontFamily: 'Arimo', fontSize: 24, highlightColor: '#FFFF00', primaryColor: '#ffffff', strokeWidth: 4 };
        } else if (presetId === 'glow_focus') {
            updates = { animationType: 'glow_focus', fontFamily: 'Griffy', fontSize: 28, primaryColor: '#ffffff', strokeWidth: 0 };
        } else if (presetId === 'impact_pop') {
            updates = { animationType: 'impact_pop', fontFamily: 'Chewy', fontSize: 32, highlightColor: '#FFFF00', primaryColor: '#ffffff', strokeWidth: 4 };
        } else if (presetId === 'comic_burst') {
            updates = { animationType: 'pulse_bold', fontFamily: 'Komika Hand', fontSize: 30, primaryColor: '#ffffff', secondaryColor: '#000000', strokeWidth: 6 };
        }
        handleSubtitleUpdate(updates);
    };

    const handleSaveAsDefault = async () => {
        if (!session?.user?.id) return;
        setSaveDefaultStatus('saving');
        try {
            // Strip 'enabled' flag from global defaults as it should be project-specific
            const { enabled, ...configToSave } = subtitles;
            
            await supabase.from('user_configurations').upsert({
                user_id: session.user.id,
                subtitles: configToSave,
                updated_at: new Date().toISOString()
            });
            setSaveDefaultStatus('success');
            setTimeout(() => setSaveDefaultStatus('idle'), 2000);
        } catch (e) {
            setSaveDefaultStatus('error');
            setTimeout(() => setSaveDefaultStatus('idle'), 3000);
        }
    };


    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    // Gate completion: All segments must have an image
    const allImagesReady = segments.every((s: any) => s.image_url);

    // Module Icons
    const Icons = {
        Narration: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
        Images: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        Effect: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
        Captions: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    };

    const renderModuleContent = (module: string) => {
        switch (module) {
            case 'narration':
                return (
                    <div className="space-y-4">
                        {/* Voice Accordion */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'voice' ? null : 'voice')}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Voice</div>
                                    <div className="font-bold text-slate-900">{voice.name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-slate-400 transition-transform ${narrationSection === 'voice' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'voice' && (
                                <div className="p-2 bg-slate-50 border-t border-slate-200 space-y-2 max-h-60 overflow-y-auto">
                                    {VOICES.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleVoiceSelect(v)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${voice.id === v.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}
                                        >
                                            <span className="font-bold">{v.name}</span>
                                            {VOICE_SAMPLES[v.id] && (
                                                <div onClick={(e) => toggleVoiceSample(e, v.id)} className={`p-1 rounded-full ${voice.id === v.id ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}>
                                                    {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Style Accordion */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'style' ? null : 'style')}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Narration Style</div>
                                    <div className="font-bold text-slate-900">{narrationStyle.name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-slate-400 transition-transform ${narrationSection === 'style' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'style' && (
                                <div className="p-2 bg-slate-50 border-t border-slate-200 space-y-2 max-h-60 overflow-y-auto">
                                    {NARRATION_STYLES.map(s => (
                                        <button
                                            key={s.prompt}
                                            onClick={() => handleNarrationStyleChange(s)}
                                            className={`w-full text-left px-3 py-2 text-sm border rounded-lg transition-all ${narrationStyle.prompt === s.prompt ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}
                                        >
                                            <div className="font-bold">{s.name}</div>
                                            <div className={`text-[10px] ${narrationStyle.prompt === s.prompt ? 'text-slate-400' : 'text-slate-400'}`}>{s.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleRegenerateVoice}
                            disabled={isGeneratingAssets}
                            className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm"
                        >
                            {isGeneratingAssets ? 'Regenerating...' : 'Regenerate Audio'}
                        </button>
                        {errorMessage && !isGeneratingAssets && !regeneratingId && !editingImageId && exportStatus === 'idle' && (
                            <div className="text-[10px] font-bold text-red-600 animate-pulse text-center">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                );
            case 'images':
                return (
                    <div className="space-y-4">
                        {segments.map((seg: any, idx: number) => (
                            <div key={seg.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="w-16 aspect-square bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative cursor-pointer flex items-center justify-center" onClick={() => seg.image_url && setExpandedImage(seg.image_url)}>
                                    {seg.image_url ? (
                                        <img src={seg.image_url} className="w-full h-full object-cover" />
                                    ) : localProject.status === 'draft' ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase">Generating</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Segment {idx + 1}</div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setRegeneratingId(seg.id)} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700 transition">Regenerate</button>
                                        <button onClick={() => setEditingImageId(seg.id)} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700 transition">Edit</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'effect':
                return (
                    <div className="space-y-2">
                        {EFFECT_PRESETS.map(e => (
                            <button
                                key={e.id}
                                onClick={() => handleEffectChange(e)}
                                className={`w-full text-left px-3 py-3 border rounded-xl transition-all ${effect.id === e.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}
                            >
                                <div className="font-bold text-sm">{e.name}</div>
                                <div className={`text-[10px] ${effect.id === e.id ? 'text-slate-400' : 'text-slate-400'}`}>{e.description}</div>
                            </button>
                        ))}
                    </div>
                );
            case 'captions':
                if (subtitleView === 'summary') {
                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${subtitles.enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Icons.Captions />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">Subtitles</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {subtitles.enabled ? 'Enabled' : 'Disabled'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleSubtitleUpdate({ enabled: !subtitles.enabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${subtitles.enabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${subtitles.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <button 
                                onClick={() => setSubtitleView('edit')}
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-300 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-900">Edit Style</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Customize appearance</div>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4">
                        <button 
                            onClick={() => setSubtitleView('summary')}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition mb-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                        </button>
                        {/* Placement */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Placement</label>
                            <div className="flex gap-2">
                                {['top', 'middle', 'bottom'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handleSubtitleUpdate({ placement: p as any })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${subtitles.placement === p ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
                                    >
                                        {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font Family */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Font</label>
                            <select
                                value={subtitles.fontFamily}
                                onChange={(e) => handleSubtitleUpdate({ fontFamily: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
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

                        {/* Font Size */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase">Size</label>
                                <span className="text-xs font-bold text-slate-900">{subtitles.fontSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={subtitles.fontSize}
                                onChange={(e) => handleSubtitleUpdate({ fontSize: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                            />
                        </div>

                        {/* Animation Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Animation Style</label>
                            <select
                                value={subtitles.animationType}
                                onChange={(e) => handleSubtitleUpdate({ animationType: e.target.value as any })}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                            >
                                <option value="pulse_bold">Pulse Bold</option>
                                <option value="glow_focus">Typewriter Glow</option>
                                <option value="impact_pop">Rapid Pop</option>
                            </select>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={subtitles.primaryColor}
                                        onChange={(e) => handleSubtitleUpdate({ primaryColor: e.target.value })}
                                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 overflow-hidden"
                                    />
                                    <span className="text-xs font-mono text-slate-500">{subtitles.primaryColor}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Outline Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={subtitles.secondaryColor}
                                        onChange={(e) => handleSubtitleUpdate({ secondaryColor: e.target.value })}
                                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 overflow-hidden"
                                    />
                                    <span className="text-xs font-mono text-slate-500">{subtitles.secondaryColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* Highlight Color */}
                        {(subtitles.animationType === 'pulse_bold') && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Highlight Color (Karaoke)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={subtitles.highlightColor}
                                        onChange={(e) => handleSubtitleUpdate({ highlightColor: e.target.value })}
                                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 overflow-hidden"
                                    />
                                    <span className="text-xs font-mono text-slate-500">{subtitles.highlightColor}</span>
                                </div>
                            </div>
                        )}

                        {/* Stroke Width */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase">Outline Width</label>
                                <span className="text-xs font-bold text-slate-900">{subtitles.strokeWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={subtitles.strokeWidth}
                                onChange={(e) => handleSubtitleUpdate({ strokeWidth: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                            />
                        </div>

                        {/* Letter Spacing */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase">Letter Spacing</label>
                                <span className="text-xs font-bold text-slate-900">{subtitles.letterSpacing}px</span>
                            </div>
                            <input
                                type="range"
                                min="-2"
                                max="20"
                                value={subtitles.letterSpacing}
                                onChange={(e) => handleSubtitleUpdate({ letterSpacing: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                            />
                        </div>

                        {/* Text Transform */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Transform</label>
                            <div className="flex gap-2">
                                {['none', 'uppercase', 'capitalize'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => handleSubtitleUpdate({ textTransform: t as any })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${subtitles.textTransform === t ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
                                    >
                                        {t === 'none' ? 'Normal' : t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Buttons */}
                        <div className="pt-4 border-t border-slate-200 space-y-3">
                            <button
                                onClick={handleSaveAsDefault}
                                disabled={saveDefaultStatus === 'saving'}
                                className={`w-full py-3 text-sm font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
                                    saveDefaultStatus === 'success' ? 'bg-green-500 text-white border border-green-500' :
                                    saveDefaultStatus === 'error' ? 'bg-red-500 text-white border border-red-500' :
                                    'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {saveDefaultStatus === 'saving' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                                {saveDefaultStatus === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                {saveDefaultStatus === 'saving' ? 'Saving...' :
                                 saveDefaultStatus === 'success' ? 'Saved' :
                                 saveDefaultStatus === 'error' ? 'Failed' : 'Save as Default Style'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-full overflow-hidden">
            {/* Notifications */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {notification.type === 'error' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Modals */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setExpandedImage(null)}
                >
                    <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setExpandedImage(null)}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            
            {/* Top Bar (Full Width) */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 relative">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-900 text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    ← Back
                </button>
                <div className="flex items-center gap-4">
                    {isGeneratingAssets && (
                        <div className="flex items-center gap-2 text-[10px] text-yellow-600 font-bold animate-pulse bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                            GENERATING ASSETS... {timer}s
                        </div>
                    )}
                    <button 
                        onClick={handleExport}
                        disabled={submitting || isGeneratingAssets}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 transition shadow-sm flex items-center gap-2 ${exportStatus === 'error' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                    >
                        {submitting ? `Exporting... ${timer}s` : exportStatus === 'error' ? (errorMessage || 'Export Failed') : 'Export Video'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Left Margin Frame */}
                <div className="hidden md:block w-4 bg-white shrink-0 border-r border-slate-200/50"></div>

                {/* Video Preview Area */}
                <div className="flex-1 bg-slate-50 flex flex-col relative overflow-hidden h-full">
                    <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 w-full relative">
                        {(!audioUrl || segmentDurations.length === 0) ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Preparing Preview...</div>
                            </div>
                        ) : (
                            <ContentVideoPlayer
                                segments={segments}
                                audioUrl={audioUrl}
                                transcription={transcription}
                                segmentDurations={segmentDurations}
                                aspectRatio={project.aspect_ratio}
                                effect={effect}
                                subtitleStyle={subtitles}
                                isPlaying={isPlaying}
                                onPlayPause={togglePlay}
                                currentTime={currentTime}
                                onTimeUpdate={handleTimeUpdate}
                            />
                        )}
                    </div>

                    {/* Playback Controls removed from here and moved to ContentVideoPlayer */}
                </div>

                {/* Desktop: Config Panel (Strip + Wing) */}
                <div className="hidden md:flex h-full shrink-0 z-20 shadow-xl relative border-l border-slate-200">
                    {/* Wing (Content) */}
                    <div className={`bg-white border-r border-slate-200 overflow-y-auto transition-all duration-300 ease-in-out ${activeModule ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                        <div className="p-6 min-w-[20rem]">
                            {activeModule && renderModuleContent(activeModule)}
                        </div>
                    </div>

                    {/* Strip (Icons) */}
                    <div className="w-24 bg-white flex flex-col items-center py-6 gap-4 z-30">
                        <button 
                            onClick={() => setActiveModule(activeModule === 'narration' ? null : 'narration')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'narration' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <Icons.Narration />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Audio</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'images' ? null : 'images')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'images' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <Icons.Images />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Images</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'effect' ? null : 'effect')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'effect' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <Icons.Effect />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight text-center leading-none">Video<br/>Effects</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'captions' ? null : 'captions')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'captions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <Icons.Captions />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Subtitles</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile: Edit FAB */}
            <button 
                className="md:hidden absolute bottom-20 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-40"
                onClick={() => setIsMobileConfigOpen(true)}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </button>

            {/* Mobile: Settings Drawer */}
            <div className={`md:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 transition-transform duration-300 ease-out transform ${isMobileConfigOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Drawer Handle */}
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setIsMobileConfigOpen(false)}></div>

                    {!activeModule ? (
                        // Menu View
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setActiveModule('narration')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-900"><Icons.Narration /></div>
                                <span className="font-bold text-sm text-slate-700">Audio</span>
                            </button>
                            <button onClick={() => setActiveModule('images')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-900"><Icons.Images /></div>
                                <span className="font-bold text-sm text-slate-700">Images</span>
                            </button>
                            <button onClick={() => setActiveModule('effect')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-900"><Icons.Effect /></div>
                                <span className="font-bold text-sm text-slate-700">Video Effects</span>
                            </button>
                            <button onClick={() => setActiveModule('captions')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-900"><Icons.Captions /></div>
                                <span className="font-bold text-sm text-slate-700">Subtitles</span>
                            </button>
                        </div>
                    ) : (
                        // Detail View
                        <div className="animate-fadeIn">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setActiveModule(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                            </div>
                            {renderModuleContent(activeModule)}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals (Regenerate/Edit) - Reused from previous implementation */}
            {showAudioConfirmation && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 text-slate-900">Regenerate Audio?</h3>
                        <p className="text-slate-500 mb-6 text-sm">This will discard the current audio and generate a new one.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => { setShowAudioConfirmation(false); setErrorMessage(null); }} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                            <button onClick={confirmRegenerateVoice} disabled={isGeneratingAssets} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-yellow-600 text-black hover:bg-yellow-500">
                                {isGeneratingAssets ? `Generating... ${timer}s` : 'Confirm'}
                            </button>
                        </div>
                        {errorMessage && !isGeneratingAssets && (
                            <div className="mt-4 text-xs font-bold text-red-600 animate-pulse">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {regeneratingId && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 text-slate-900">Regenerate Image?</h3>
                        <p className="text-slate-500 mb-6 text-sm">This will discard the current image and generate a new one.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setRegeneratingId(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                            <button onClick={handleRegenerate} disabled={loadingImage} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-yellow-600 text-black hover:bg-yellow-500">
                                {loadingImage ? `Generating... ${timer}s` : 'Confirm'}
                            </button>
                        </div>
                        {errorMessage && regenerateStatus === 'error' && (
                            <div className="mt-4 text-xs font-bold text-red-600 animate-pulse">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingImageId && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-slate-900">Edit Image</h3>
                        <input 
                            className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Describe change..."
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingImageId(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                            <button onClick={handleImageEdit} disabled={loadingImage} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-yellow-600 text-black hover:bg-yellow-500">
                                {loadingImage ? `Editing... ${timer}s` : 'Apply Edit'}
                            </button>
                        </div>
                        {errorMessage && editStatus === 'error' && (
                            <div className="mt-4 text-xs font-bold text-red-600 animate-pulse text-right">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};