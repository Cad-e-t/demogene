import React, { useState, useEffect, useRef } from 'react';
import { editImageSegment, saveSegments, regenerateImageSegment, generateAssets, exportVideo, generateUploadUrl, updateSegmentImage } from './api';
import { ContentVideoPlayer } from './ContentVideoPlayer';
import { supabase } from '../../supabaseClient';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { EFFECT_PRESETS, NARRATION_STYLES, SUBTITLE_PRESETS, SubtitleConfiguration, DEFAULT_SUBTITLE_CONFIG } from './types';
import { STYLE_PREVIEWS } from './creator-assets';
import { SubtitlePreview } from './SubtitlePreviews';


export const ContentEditor = ({ session, project, initialSegments, onBack, onComplete }: any) => {
    const [segments, setSegments] = useState(initialSegments);
    const [localProject, setLocalProject] = useState(project); // Local project copy for status sync
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [regeneratePrompt, setRegeneratePrompt] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showAudioConfirmation, setShowAudioConfirmation] = useState(false);

    const [uploadConfirmSegmentId, setUploadConfirmSegmentId] = useState<string | null>(null);
    const [uploadingSegmentId, setUploadingSegmentId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                // Return the actual error message from the server instead of a generic one
                return message;
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

    const handleUploadClick = (segmentId: string, hasImage: boolean) => {
        if (hasImage) {
            setUploadConfirmSegmentId(segmentId);
        } else {
            setUploadingSegmentId(segmentId);
            setTimeout(() => fileInputRef.current?.click(), 0);
        }
    };

    const handleConfirmUpload = () => {
        setUploadingSegmentId(uploadConfirmSegmentId);
        setUploadConfirmSegmentId(null);
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingSegmentId) return;

        try {
            setLoadingImage(true);
            const segment = segments.find((s: any) => s.id === uploadingSegmentId);
            
            const { signedUrl, publicUrl } = await generateUploadUrl(project.id, uploadingSegmentId, file.name, file.type);

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });
            
            if (!uploadRes.ok) throw new Error("Failed to upload image. Please try again.");

            await updateSegmentImage(uploadingSegmentId, publicUrl, segment?.image_url);
            
            setSegments((prev: any[]) => prev.map(s => s.id === uploadingSegmentId ? { ...s, image_url: publicUrl } : s));
        } catch (err: any) {
            console.error("Upload failed", err);
            setNotification({
                message: err.message || "Failed to upload image.",
                type: 'error'
            });
            setTimeout(() => setNotification(null), 6000);
        } finally {
            setLoadingImage(false);
            setUploadingSegmentId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
    const [narrationView, setNarrationView] = useState<'summary' | 'edit_script'>('summary');
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
    const [subtitleState, setSubtitleState] = useState<'enabled' | 'disabled'>(project.subtitle_state || 'enabled');
    
    // Audio Preview
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

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
                if (payload.new.subtitle_state) {
                    setSubtitleState(payload.new.subtitle_state);
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
            let finalPrompt = seg.image_prompt;
            
            if (regeneratePrompt !== seg.image_prompt) {
                await supabase.from('content_segments').update({ image_prompt: regeneratePrompt }).eq('id', seg.id);
                finalPrompt = regeneratePrompt;
                setSegments((prev: any[]) => prev.map(s => s.id === regeneratingId ? { ...s, image_prompt: regeneratePrompt } : s));
            }

            const res = await regenerateImageSegment(
                seg.id, 
                project.id, 
                finalPrompt, 
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

    const handleSubtitleStateToggle = () => {
        const newState = subtitleState === 'enabled' ? 'disabled' : 'enabled';
        setSubtitleState(newState);
        supabase.from('content_projects').update({ subtitle_state: newState }).eq('id', project.id).then();
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
                if (narrationView === 'edit_script') {
                    return (
                        <div className="md:space-y-4 space-y-2">
                            <button 
                                onClick={() => setNarrationView('summary')}
                                className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-1 md:mb-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                            </button>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {segments.map((seg: any, idx: number) => (
                                    <div key={seg.id} className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Segment {idx + 1}</label>
                                        <textarea
                                            value={seg.narration}
                                            onChange={(e) => {
                                                const newText = e.target.value;
                                                setSegments((prev: any[]) => prev.map(s => s.id === seg.id ? { ...s, narration: newText } : s));
                                            }}
                                            className="w-full p-3 bg-black border border-white/10 rounded-xl text-sm text-zinc-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 outline-none resize-y min-h-[80px]"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => {
                                    setNarrationView('summary');
                                    handleRegenerateVoice();
                                }}
                                disabled={isGeneratingAssets}
                                className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm mt-4"
                            >
                                {isGeneratingAssets ? 'Regenerating...' : 'Save & Regenerate Audio'}
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        {/* Script Edit Button */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationView('edit_script')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Script</div>
                                    <div className="font-bold text-white">Edit Segment by Segment</div>
                                </div>
                                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </div>

                        {/* Voice Accordion */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'voice' ? null : 'voice')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Voice</div>
                                    <div className="font-bold text-white">{voice.name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-zinc-500 transition-transform ${narrationSection === 'voice' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'voice' && (
                                <div className="p-2 bg-zinc-900 border-t border-white/10 space-y-2 max-h-60 overflow-y-auto">
                                    {VOICES.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleVoiceSelect(v)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${voice.id === v.id ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                        >
                                            <span className="font-bold">{v.name}</span>
                                            {VOICE_SAMPLES[v.id] && (
                                                <div onClick={(e) => toggleVoiceSample(e, v.id)} className={`p-1 rounded-full ${voice.id === v.id ? 'bg-zinc-700 text-zinc-600' : 'bg-black hover:bg-zinc-900 text-zinc-400'}`}>
                                                    {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Style Accordion */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'style' ? null : 'style')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Narration Style</div>
                                    <div className="font-bold text-white">{narrationStyle.name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-zinc-500 transition-transform ${narrationSection === 'style' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'style' && (
                                <div className="p-2 bg-zinc-900 border-t border-white/10 space-y-2 max-h-60 overflow-y-auto">
                                    {NARRATION_STYLES.map(s => (
                                        <button
                                            key={s.prompt}
                                            onClick={() => handleNarrationStyleChange(s)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${narrationStyle.prompt === s.prompt ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold">{s.name}</div>
                                                <div className={`text-[10px] ${narrationStyle.prompt === s.prompt ? 'text-zinc-500' : 'text-zinc-500'}`}>{s.description}</div>
                                            </div>
                                            {s.sampleUrl && (
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (playingVoiceId === `style-${s.id}`) {
                                                            audioRef.current?.pause();
                                                            setPlayingVoiceId(null);
                                                        } else {
                                                            if (audioRef.current) audioRef.current.pause();
                                                            const audio = new Audio(s.sampleUrl);
                                                            audioRef.current = audio;
                                                            audio.play();
                                                            setPlayingVoiceId(`style-${s.id}`);
                                                            audio.onended = () => setPlayingVoiceId(null);
                                                        }
                                                    }} 
                                                    className={`p-1 rounded-full ${playingVoiceId === `style-${s.id}` ? 'bg-zinc-700 text-zinc-600' : 'bg-black hover:bg-zinc-900 text-zinc-400'}`}
                                                >
                                                    {playingVoiceId === `style-${s.id}` ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                </div>
                                            )}
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
                    <div className="md:space-y-4 space-y-2">
                        {segments.map((seg: any, idx: number) => (
                            <div key={seg.id} className="flex gap-3 items-start p-2 md:p-3 bg-zinc-900 rounded-xl border border-white/5">
                                <div className="w-12 h-12 md:w-16 md:aspect-square bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-white/10 relative cursor-pointer flex items-center justify-center" onClick={() => seg.image_url && setExpandedImage(seg.image_url)}>
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
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
                                            <div className="text-[8px] font-bold text-zinc-500 uppercase">Generating</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Segment {idx + 1}</div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => { setRegeneratingId(seg.id); setRegeneratePrompt(seg.image_prompt || ''); }} className="px-3 py-1.5 bg-black border border-white/10 hover:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-200 transition">Regenerate</button>
                                        <button onClick={() => setEditingImageId(seg.id)} className="px-3 py-1.5 bg-black border border-white/10 hover:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-200 transition">Edit</button>
                                        <button onClick={() => handleUploadClick(seg.id, !!seg.image_url)} className="p-1.5 bg-black border border-white/10 hover:bg-zinc-900 rounded-lg text-zinc-200 transition flex items-center justify-center" title="Upload Image">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                        </button>
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
                                className={`w-full text-left px-3 py-3 border rounded-xl transition-all ${effect.id === e.id ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                            >
                                <div className="font-bold text-sm">{e.name}</div>
                                <div className={`text-[10px] ${effect.id === e.id ? 'text-zinc-500' : 'text-zinc-500'}`}>{e.description}</div>
                            </button>
                        ))}
                    </div>
                );
            case 'captions':
                if (subtitleView === 'summary') {
                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${subtitleState === 'enabled' ? 'bg-green-900/20 text-green-600' : 'bg-zinc-900 text-zinc-500'}`}>
                                        <Icons.Captions />
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
                        </div>
                    );
                }
                return (
                    <div className="md:space-y-4 space-y-2">
                        <button 
                            onClick={() => setSubtitleView('summary')}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-1 md:mb-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                        </button>
                        {/* Placement */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Placement</label>
                            <div className="flex gap-2">
                                {['top', 'middle', 'bottom'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handleSubtitleUpdate({ placement: p as any })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${subtitles.placement === p ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 text-zinc-200 hover:border-white/20'}`}
                                    >
                                        {p.toUpperCase()}
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

                        {/* Animation Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Animation Style</label>
                            <select
                                value={subtitles.animationType}
                                onChange={(e) => handleSubtitleUpdate({ animationType: e.target.value as any })}
                                className="w-full p-2 bg-black border border-white/10 rounded-lg text-sm font-bold text-white outline-none focus:border-yellow-500"
                            >
                                <option value="pulse_bold">Pulse Bold</option>
                                <option value="glow_focus">Typewriter Glow</option>
                                <option value="impact_pop">Rapid Pop</option>
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

                        {/* Text Transform */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Transform</label>
                            <div className="flex gap-2">
                                {['none', 'uppercase', 'capitalize'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => handleSubtitleUpdate({ textTransform: t as any })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${subtitles.textTransform === t ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 text-zinc-200 hover:border-white/20'}`}
                                    >
                                        {t === 'none' ? 'Normal' : t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Buttons */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <button
                                onClick={handleSaveAsDefault}
                                disabled={saveDefaultStatus === 'saving'}
                                className={`w-full py-3 text-sm font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
                                    saveDefaultStatus === 'success' ? 'bg-green-500 text-white border border-green-500' :
                                    saveDefaultStatus === 'error' ? 'bg-red-500 text-white border border-red-500' :
                                    'bg-black border border-white/10 text-white hover:bg-zinc-900'
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
        <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col h-full overflow-hidden">
            {/* Notifications */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {notification.type === 'error' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 hover:bg-black/20 rounded-full p-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Modals */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setExpandedImage(null)}
                >
                    <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setExpandedImage(null)}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            
            {/* Top Bar (Full Width) */}
            <div className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-30 relative">
                <button onClick={onBack} className="text-zinc-400 hover:text-white text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-black transition-colors">
                    ← Back
                </button>
                <div className="flex items-center gap-4">
                    {isGeneratingAssets && (
                        <div className="flex items-center gap-2 text-[10px] text-yellow-600 font-bold animate-pulse bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-900/30">
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
                <div className="hidden md:block w-4 bg-black shrink-0 border-r border-white/10/50"></div>

                {/* Video Preview Area */}
                <div className={`flex-1 bg-zinc-900 flex flex-col relative overflow-hidden h-full transition-all duration-300 ${isMobileConfigOpen ? 'md:h-full h-[35%]' : 'h-full'}`}>
                    <div className={`flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 w-full relative transition-all duration-300 ${isMobileConfigOpen ? 'scale-90 md:scale-100' : 'scale-100'}`}>
                        {(!audioUrl || segmentDurations.length === 0) ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Preparing Preview...</div>
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
                                subtitleState={subtitleState}
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
                <div className="hidden md:flex h-full shrink-0 z-20 shadow-xl relative border-l border-white/10">
                    {/* Wing (Content) */}
                    <div className={`bg-black border-r border-white/10 overflow-y-auto transition-all duration-300 ease-in-out ${activeModule ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                        <div className="p-6 min-w-[20rem]">
                            {activeModule && renderModuleContent(activeModule)}
                        </div>
                    </div>

                    {/* Strip (Icons) */}
                    <div className="w-24 bg-black flex flex-col items-center py-6 gap-4 z-30">
                        <button 
                            onClick={() => setActiveModule(activeModule === 'narration' ? null : 'narration')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'narration' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Narration />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Audio</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'images' ? null : 'images')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'images' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Images />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Images</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'effect' ? null : 'effect')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'effect' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Effect />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight text-center leading-none">Video<br/>Effects</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'captions' ? null : 'captions')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'captions' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Captions />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Subtitles</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile: Edit FAB */}
            <button 
                className="md:hidden absolute bottom-20 right-4 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center z-40"
                onClick={() => setIsMobileConfigOpen(true)}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </button>

            {/* Mobile: Settings Drawer */}
            <div className={`md:hidden fixed inset-x-0 bottom-0 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 transition-transform duration-300 ease-out transform ${isMobileConfigOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className={`p-6 ${activeModule ? 'p-4 max-h-[55vh]' : 'max-h-[70vh]'} overflow-y-auto transition-all duration-300`}>
                    {/* Drawer Handle */}
                    <div className="w-12 h-1.5 bg-zinc-900 rounded-full mx-auto mb-4 md:mb-6" onClick={() => setIsMobileConfigOpen(false)}></div>

                    {!activeModule ? (
                        // Menu View
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setActiveModule('narration')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Narration /></div>
                                <span className="font-bold text-sm text-zinc-200">Audio</span>
                            </button>
                            <button onClick={() => setActiveModule('images')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Images /></div>
                                <span className="font-bold text-sm text-zinc-200">Images</span>
                            </button>
                            <button onClick={() => setActiveModule('effect')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Effect /></div>
                                <span className="font-bold text-sm text-zinc-200">Video Effects</span>
                            </button>
                            <button onClick={() => setActiveModule('captions')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Captions /></div>
                                <span className="font-bold text-sm text-zinc-200">Subtitles</span>
                            </button>
                        </div>
                    ) : (
                        // Detail View
                        <div className="animate-fadeIn">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setActiveModule(null)} className="p-2 -ml-2 text-zinc-500 hover:text-white">
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
                    <div className="bg-black rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 text-white">Regenerate Audio?</h3>
                        <p className="text-zinc-400 mb-6 text-sm">This will discard the current audio and generate a new one.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => { setShowAudioConfirmation(false); setErrorMessage(null); }} disabled={isGeneratingAssets} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
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

            {regeneratingId && (() => {
                const seg = segments.find((s: any) => s.id === regeneratingId);
                return (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-black rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                            <h3 className="font-bold text-lg mb-4 text-white">Regenerate Image</h3>
                            
                            {seg?.image_url && (
                                <div className="mb-4 rounded-xl overflow-hidden bg-black border border-white/10">
                                    <img src={seg.image_url} alt="Current" className="w-full h-48 object-contain" />
                                </div>
                            )}

                            <div className="text-left">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Image Prompt</label>
                                <textarea 
                                    className="w-full p-4 bg-zinc-900 rounded-xl border border-white/10 mb-6 text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 outline-none transition-all resize-y min-h-[100px]"
                                    placeholder="Image prompt..."
                                    value={regeneratePrompt}
                                    onChange={(e) => setRegeneratePrompt(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setRegeneratingId(null)} disabled={loadingImage} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                                <button onClick={handleRegenerate} disabled={loadingImage} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-yellow-600 text-black hover:bg-yellow-500">
                                    {loadingImage ? `Generating... ${timer}s` : 'Generate'}
                                </button>
                            </div>
                            {errorMessage && regenerateStatus === 'error' && (
                                <div className="mt-4 text-xs font-bold text-red-600 animate-pulse text-right">
                                    {errorMessage}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {editingImageId && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-black rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-white">Edit Image</h3>
                        <input 
                            className="w-full p-4 bg-zinc-900 rounded-xl border border-white/10 mb-4 text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                            placeholder="Describe change..."
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingImageId(null)} disabled={loadingImage} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
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

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />

            {/* Upload Confirmation Modal */}
            {uploadConfirmSegmentId && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-black rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-white">Replace Image?</h3>
                        <p className="text-sm text-zinc-300 mb-6">
                            This segment already has an image. Uploading a new one will discard the existing image. Do you want to continue?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setUploadConfirmSegmentId(null)} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition">Cancel</button>
                            <button onClick={handleConfirmUpload} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-500">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};