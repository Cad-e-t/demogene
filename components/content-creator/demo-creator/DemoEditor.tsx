import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { API_URL, sanitizeErrorMsg, generateUploadUrl, updateSegmentImage } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_SUBTITLE_CONFIG, SubtitleConfiguration } from '../types';
import { Layout, Type, Layers, ChevronLeft, Settings2, Palette, Undo2, Redo2, Edit2, CheckCheck, Mic, Sparkles, Upload, Image, Trash2 } from 'lucide-react';
import { HookStyleModal } from './HookStyleModal';
import { alignSegmentsWithTranscription, computeFilesData } from './alignment-utils';
import { VOICES } from '../../../voiceConfig';
import { VOICE_SAMPLES } from '../../../voiceSamples';

interface DemoEditorProps {
    session: any;
    projectId: string | null;
    onToggleSidebar: () => void;
    onBack: () => void;
    onNavigate: (path: string) => void;
}

export const DemoEditor: React.FC<DemoEditorProps> = ({ session, projectId, onToggleSidebar, onBack, onNavigate }) => {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const [showHookStyleModal, setShowHookStyleModal] = useState(false);
    const [activeHookIndex, setActiveHookIndex] = useState<number | null>(null);
    
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Editor States for Frame Segments
    const [isEditingFrames, setIsEditingFrames] = useState(false);
    const [editingSegments, setEditingSegments] = useState<any[]>([]);

    // AI segments state from demo_segments table
    const [demoSegments, setDemoSegments] = useState<any[]>([]);
    const [loadingImageId, setLoadingImageId] = useState<string | null>(null);
    const segmentFileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadingSegmentId, setUploadingSegmentId] = useState<string | null>(null);

    const handleSegmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>, segmentId: string) => {
        const file = e.target.files?.[0];
        if (!file || !segmentId) return;

        try {
            setLoadingImageId(segmentId);
            const segment = demoSegments.find((s: any) => s.id === segmentId);
            const oldUrl = segment?.image_url || '';
            
            const { signedUrl, publicUrl } = await generateUploadUrl(project.id, segmentId, file.name, file.type);

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });
            
            if (!uploadRes.ok) throw new Error("Failed to upload image. Please try again.");

            await updateSegmentImage(segmentId, publicUrl, oldUrl, 'demo_segments');
            
            setDemoSegments((prev: any[]) => prev.map(s => s.id === segmentId ? { ...s, image_url: publicUrl } : s));
        } catch (err: any) {
            console.error("Segment image upload failed", err);
            setErrorMessage(sanitizeErrorMsg(err, "Failed to upload image. Please try again."));
        } finally {
            setLoadingImageId(null);
            setUploadingSegmentId(null);
            if (segmentFileInputRef.current) segmentFileInputRef.current.value = '';
        }
    };

    const handleRemoveSegmentImage = async (segmentId: string) => {
        try {
            setLoadingImageId(segmentId);
            const segment = demoSegments.find((s: any) => s.id === segmentId);
            const oldUrl = segment?.image_url || '';
            
            await updateSegmentImage(segmentId, '', oldUrl, 'demo_segments');
            
            setDemoSegments((prev: any[]) => prev.map(s => s.id === segmentId ? { ...s, image_url: null } : s));
        } catch (err: any) {
            console.error("Remove segment image failed", err);
            setErrorMessage(sanitizeErrorMsg(err, "Failed to remove image. Please try again."));
        } finally {
            setLoadingImageId(null);
        }
    };

    const [narrationView, setNarrationView] = useState<'summary' | 'edit_script'>('summary');
    const [narrationSection, setNarrationSection] = useState<'voice' | 'style' | null>(null);
    const [voice, setVoice] = useState(VOICES[0]);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(-1);
    const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        historyIndexRef.current = historyIndex;
    }, [historyIndex]);

    // Auto-correction for existing incorrectly sized segments
    useEffect(() => {
        if (!project || !project.segments || !project.transcription?.words || !project.total_audio_duration) return;
        
        const numSegments = project.segments.length;
        const currentDurations = project.segment_durations || [];
        
        let needsCorrection = false;
        
        if (currentDurations.length !== numSegments) {
            needsCorrection = true;
        } else {
            const currentTotal = currentDurations.reduce((a: number, b: number) => a + b, 0);
            if (Math.abs(currentTotal - project.total_audio_duration) > 0.1) {
                needsCorrection = true;
            }
        }

        if (needsCorrection) {
            const newDurations = alignSegmentsWithTranscription(project.segments, project.transcription, project.total_audio_duration);
            if (newDurations && newDurations.length === numSegments) {
                updateProject({ segment_durations: newDurations }, true);
            }
        }
    }, [project?.id, project?.segments?.length, !!project?.transcription?.words, project?.total_audio_duration]);

    const checkAndConvertData = async (data: any) => {
        let updated = false;
        const FPS = 30;
        const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);

        let newTranscription = data.transcription;
        if (newTranscription && newTranscription.words && newTranscription.unit !== 'frames') {
            newTranscription = {
                ...newTranscription,
                unit: 'frames',
                words: newTranscription.words.map((w: any) => ({
                    ...w,
                    start: w.start !== undefined ? msToFrames(w.start) : w.start,
                    end: w.end !== undefined ? msToFrames(w.end) : w.end
                }))
            };
            updated = true;
        }

        if (updated) {
            await supabase.from('demo_projects').update({
                transcription: newTranscription,
            }).eq('id', data.id);
            return { ...data, transcription: newTranscription };
        }
        return data;
    };

    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            setLoading(true);
            const { data: rawData, error } = await supabase
                .from('demo_projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            if (error) {
                console.error("Error fetching project:", error);
            } else {
                const data = await checkAndConvertData(rawData);
                setProject(data);
                setHistory([data]);
                setHistoryIndex(0);
                if (data.voice_id) {
                    const v = VOICES.find(v => v.id === data.voice_id);
                    if (v) setVoice(v);
                }
            }
            setLoading(false);
        };

        fetchProject();

        // Subscribe to changes
        const channel = supabase.channel(`demo_project_${projectId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'demo_projects',
                filter: `id=eq.${projectId}`
            }, (payload) => {
                setProject((prev: any) => {
                    if (!prev) return payload.new;
                    const updated = {
                        ...prev,
                        ...payload.new,
                        // Preserve large JSONB columns if they are missing from the payload due to TOAST
                        segments: payload.new.segments || prev.segments,
                        transcription: payload.new.transcription || prev.transcription,
                        segment_durations: payload.new.segment_durations || prev.segment_durations,
                        hook_style: payload.new.hook_style || prev.hook_style,
                        subtitles: payload.new.subtitles || prev.subtitles
                    };
                    
                    setHistory(h => {
                        const idx = historyIndexRef.current;
                        if (h.length > 0 && idx >= 0 && idx < h.length) {
                            const newH = [...h];
                            newH[idx] = { ...newH[idx], ...updated };
                            return newH;
                        }
                        return h;
                    });

                    return updated;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;

        const fetchDemoSegments = async () => {
            const { data, error } = await supabase
                .from('demo_segments')
                .select('*')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });
            
            if (!error && data) {
                setDemoSegments(data);
            } else if (error) {
                console.error("Error fetching demo segments:", error);
            }
        };

        fetchDemoSegments();

        const channel = supabase.channel(`demo_segments_${projectId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'demo_segments',
                filter: `project_id=eq.${projectId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDemoSegments((prev) => {
                        const exists = prev.find(s => s.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new].sort((a, b) => a.order_index - b.order_index);
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setDemoSegments((prev) => prev.map(s => 
                        s.id === payload.new.id ? { ...s, ...payload.new } : s
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setDemoSegments((prev) => prev.filter(s => s.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);

    const updateProject = async (updates: any, skipHistory = false) => {
        if (!project) return;
        
        let finalUpdates = { ...updates };
        const newState = { ...project, ...finalUpdates };
        
        if (updates.segments !== undefined || updates.hook_style !== undefined || updates.video_transform !== undefined || updates.transcription !== undefined || updates.segment_durations !== undefined) {
            const filesData = computeFilesData(
                newState.segments || [],
                newState.transcription,
                newState.video_transform?.hooks || {},
                newState.hook_style,
                newState.total_audio_duration,
                newState.segment_durations
            );
            finalUpdates.files_data = filesData;
            newState.files_data = filesData;
        }

        const FPS = 30;
        const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);

        if (finalUpdates.files_data) {
            finalUpdates.files_data = finalUpdates.files_data.map((file: any) => {
                if (file.unit === 'frames') return file;
                return {
                    ...file,
                    unit: 'frames',
                    start: file.start !== undefined ? msToFrames(file.start) : file.start,
                    end: file.end !== undefined ? msToFrames(file.end) : file.end
                };
            });
            newState.files_data = finalUpdates.files_data;
        }

        if (finalUpdates.transcription && finalUpdates.transcription.words) {
            if (finalUpdates.transcription.unit !== 'frames') {
                finalUpdates.transcription = {
                    ...finalUpdates.transcription,
                    unit: 'frames',
                    words: finalUpdates.transcription.words.map((w: any) => ({
                        ...w,
                        start: w.start !== undefined ? msToFrames(w.start) : w.start,
                        end: w.end !== undefined ? msToFrames(w.end) : w.end
                    }))
                };
            }
            newState.transcription = finalUpdates.transcription;
        }
        
        if (!skipHistory) {
            if (updates.video_transform) {
                if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
                historyTimeoutRef.current = setTimeout(() => {
                    setHistory(prev => {
                        const newHistory = prev.slice(0, historyIndexRef.current + 1);
                        newHistory.push(newState);
                        setHistoryIndex(newHistory.length - 1);
                        return newHistory;
                    });
                }, 500);
            } else {
                if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
                setHistory(prev => {
                    const newHistory = prev.slice(0, historyIndexRef.current + 1);
                    newHistory.push(newState);
                    setHistoryIndex(newHistory.length - 1);
                    return newHistory;
                });
            }
        }
        
        // Optimistic update
        setProject(newState);

        const { error } = await supabase
            .from('demo_projects')
            .update(finalUpdates)
            .eq('id', project.id);
        
        if (error) console.error("Update failed:", error);
    };

    const applyHistoryState = async (state: any) => {
        const updates = {
            subtitle_state: state.subtitle_state,
            subtitles: state.subtitles,
            transcription: state.transcription,
            background_type: state.background_type,
            aspect_ratio: state.aspect_ratio,
            hook_style: state.hook_style,
            video_transform: state.video_transform
        };
        
        await updateProject(updates, true);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            applyHistoryState(history[newIndex]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            applyHistoryState(history[newIndex]);
        }
    };

    const handleTranscriptionUpdate = (newTranscription: any) => {
        updateProject({ transcription: newTranscription });
    };

    const handleRegenerateVoice = async () => {
        if (!project || isGeneratingAssets) return;
        setIsGeneratingAssets(true);
        setErrorMessage(null);
        try {
            const res = await fetch(`${API_URL}/demo/regenerate-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectId: project.id, 
                    segments: project.segments, 
                    voiceId: voice.id, 
                    userId: session.user.id 
                })
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Voice regeneration failed.");
            }
            
            // Success: database gets updated in background/wait
            await res.json();
            
            // Fetch updated project
            const { data: rawData } = await supabase.from('demo_projects').select('*').eq('id', project.id).single();
            if (rawData) {
                const data = await checkAndConvertData(rawData);
                setProject(data);
                if (data.voice_id) {
                    const v = VOICES.find(v => v.id === data.voice_id);
                    if (v) setVoice(v);
                }
            }
        } catch (e: any) {
            console.error("Audio regeneration error", e);
            setErrorMessage(sanitizeErrorMsg(e, "Audio regeneration failed."));
        } finally {
            setIsGeneratingAssets(false);
        }
    };

    const handleVoiceSelect = (v: typeof VOICES[0]) => {
        setVoice(v);
        updateProject({ voice_id: v.id });
    };

    const toggleVoiceSample = (e: React.MouseEvent, vId: string) => {
        e.stopPropagation();
        if (playingVoiceId === vId) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const sampleUrl = VOICE_SAMPLES[vId];
            if (sampleUrl) {
                const audio = new window.Audio(sampleUrl);
                audioRef.current = audio;
                audio.play();
                setPlayingVoiceId(vId);
                audio.onended = () => setPlayingVoiceId(null);
            }
        }
    };

    const handleExport = async (exportQuality: '1080p' | '480p') => {
        if (!project) return;
        setExporting(true);
        setShowExportMenu(false);
        try {
            const res = await fetch(`${API_URL}/demo/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id, userId: session.user.id, exportQuality })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Export failed');
            }
            // Navigate to stories immediately
            onNavigate('/content-creator/stories');
        } catch (e: any) {
            console.error(e);
            alert(sanitizeErrorMsg(e, `Export failed. Please try again.`));
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-black text-white">
                <p>Project not found.</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg">Go Back</button>
            </div>
        );
    }

    const isProcessing = project.status === 'processing';

    const MODULES = [
        { id: 'frames', icon: Layers, label: 'Frames' },
        { id: 'segments', icon: Sparkles, label: 'AI Scenes' },
        { id: 'audio', icon: Mic, label: 'Audio' },
        { id: 'subtitles', icon: Type, label: 'Subtitles' },
        { id: 'background', icon: Palette, label: 'Background' },
        { id: 'size', icon: Layout, label: 'Size' }
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-black text-white overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-zinc-900/50 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{project.title}</h1>
                    
                    <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-4">
                        <button 
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Undo"
                        >
                            <Undo2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Redo"
                        >
                            <Redo2 className="w-5 h-5" />
                        </button>
                    </div>

                    {isProcessing && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded-full animate-pulse">
                            Processing...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isProcessing || exporting}
                        className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {exporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                Exporting...
                            </>
                        ) : (
                            'Export Video'
                        )}
                    </button>
                    {showExportMenu && !exporting && (
                        <div className="absolute top-full mt-2 right-0 bg-zinc-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[200px]">
                            <button 
                                onClick={() => handleExport('1080p')}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors text-sm font-bold flex flex-col border-b border-white/5"
                            >
                                <span>Export HD (1080p)</span>
                                <span className="text-xs text-zinc-400 font-normal">High Quality, standard format</span>
                            </button>
                            <button 
                                onClick={() => handleExport('480p')}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors text-sm font-bold flex flex-col"
                            >
                                <span>Export SD (480p)</span>
                                <span className="text-xs text-zinc-400 font-normal">Data saving, faster export</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left: Video Player Area */}
                <div className="flex-1 bg-zinc-950 relative flex flex-col overflow-hidden">
                    {isProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-40">
                            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h3 className="text-xl font-bold text-white mb-2">Generating Demo...</h3>
                            <p className="text-zinc-400 text-center max-w-md px-4">
                                We are analyzing your video, generating the voiceover, and syncing everything up. This usually takes a minute.
                            </p>
                        </div>
                    ) : (
                        <DemoVideoPlayer 
                            videoUrl={project.video_url}
                            audioUrl={project.voice_path}
                            totalAudioDuration={project.total_audio_duration}
                            segments={demoSegments}
                            segmentDurations={project.segment_durations || []}
                            transcription={project.transcription}
                            filesData={project.files_data || []}
                            subtitleStyle={project.subtitles || DEFAULT_SUBTITLE_CONFIG}
                            hookStyle={project.hook_style}
                            aspectRatio={project.aspect_ratio || '16:9'}
                            isPlaying={isPlaying}
                            onPlayPause={() => setIsPlaying(!isPlaying)}
                            currentTime={currentTime}
                            onTimeUpdate={setCurrentTime}
                            videoTransform={project.video_transform}
                            onVideoTransformChange={async (transform) => {
                                updateProject({ video_transform: transform });
                            }}
                            backgroundType={project.background_type || 'white'}
                        />
                    )}
                </div>

                {/* Right: Redesigned Config Panel (Strip + Wing) */}
                <div className="flex shrink-0 z-40">
                    {/* Wing Panel (Collapsible) */}
                    <AnimatePresence mode="wait">
                        {activeModule && (
                            <motion.div 
                                key={activeModule}
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="h-full bg-zinc-900 border-l border-white/10 overflow-hidden flex flex-col"
                            >
                                <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                                    {activeModule === 'frames' && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-lg font-bold">Script Segments</h2>
                                                <button
                                                    onClick={() => {
                                                        if (isEditingFrames) {
                                                            // Save logic
                                                            const newSegments = editingSegments.map((seg: any) => {
                                                                const { _duration, _originalIndex, ...rest } = seg;
                                                                return { ...rest, isHook: true };
                                                            });
                                                            
                                                            let newDurations = alignSegmentsWithTranscription(newSegments, project.transcription, project.total_audio_duration);
                                                            if (!newDurations || newDurations.length !== newSegments.length) {
                                                                newDurations = editingSegments.map((seg: any) => seg._duration);
                                                            }
                                                            
                                                            const oldTransform = project.video_transform || {};
                                                            const newHooks: Record<string, any> = {};
                                                            const newSegmentList: Record<string, any> = {};
                                                            
                                                            editingSegments.forEach((seg: any, newIndex: number) => {
                                                                if (seg._originalIndex !== undefined) {
                                                                    const isSegHook = seg.isHook !== undefined ? seg.isHook : true;
                                                                    if (isSegHook) {
                                                                        if (oldTransform.hooks && oldTransform.hooks[seg._originalIndex]) {
                                                                            newHooks[newIndex] = oldTransform.hooks[seg._originalIndex];
                                                                        }
                                                                        // fallback hook check
                                                                        else if (oldTransform.hook && newIndex === 0) {
                                                                            // This is a rough fallback to keep the overall hook transform if nothing is indexed
                                                                            newHooks[newIndex] = oldTransform.hook;
                                                                        }
                                                                    } else {
                                                                        if (oldTransform.segmentList && oldTransform.segmentList[seg._originalIndex]) {
                                                                            newSegmentList[newIndex] = oldTransform.segmentList[seg._originalIndex];
                                                                        }
                                                                    }
                                                                }
                                                            });
                                                            
                                                            const newTransform = { ...oldTransform, hooks: newHooks, segmentList: newSegmentList };
                                                            
                                                            updateProject({ segments: newSegments, segment_durations: newDurations, video_transform: newTransform });
                                                            setIsEditingFrames(false);
                                                        } else {
                                                            // Enter edit mode
                                                            setEditingSegments((project.segments || []).map((seg: any, i: number) => ({
                                                                ...seg,
                                                                isHook: true,
                                                                _duration: project.segment_durations?.[i] || 0,
                                                                _originalIndex: i
                                                            })));
                                                            setIsEditingFrames(true);
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                                    title={isEditingFrames ? "Save Segments" : "Edit Hook Segments"}
                                                >
                                                    {isEditingFrames ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Edit2 className="w-4 h-4 text-zinc-400" />}
                                                </button>
                                            </div>

                                            {isEditingFrames && (
                                                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                    <p className="text-[11px] text-blue-300 leading-relaxed">
                                                        <strong className="text-blue-200">Editor Mode:</strong> Place cursor and press <kbd className="bg-blue-500/20 px-1 py-0.5 rounded border border-blue-500/30">Ctrl+Enter</kbd> to split a segment. Delete the line between segments to merge them.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {(isEditingFrames ? editingSegments : project.segments || []).map((seg: any, i: number) => {
                                                    let currentAudioTime = 0;
                                                    let isActive = false;
                                                    
                                                    if (!isEditingFrames) {
                                                        for (let j = 0; j <= i; j++) {
                                                            const dur = project.segment_durations?.[j] || 0;
                                                            if (j === i) {
                                                                isActive = currentTime >= currentAudioTime && currentTime <= currentAudioTime + dur;
                                                            }
                                                            currentAudioTime += dur;
                                                        }
                                                    }

                                                    if (isEditingFrames) {
                                                        const isNextHook = i < editingSegments.length - 1;
                                                        return (
                                                            <div key={i} className="mb-2">
                                                                <div className="p-4 rounded-xl border bg-zinc-900 border-yellow-500/30 focus-within:border-yellow-500/70 transition-colors shadow-inner">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                                                                            Hook {i + 1}
                                                                        </span>
                                                                    </div>
                                                                    <textarea
                                                                        className="w-full bg-transparent text-sm leading-relaxed text-white outline-none resize-none overflow-hidden"
                                                                        value={seg.narration}
                                                                        style={{ height: 'auto', minHeight: '60px' }}
                                                                        onInput={(e: any) => {
                                                                            e.target.style.height = 'auto';
                                                                            e.target.style.height = e.target.scrollHeight + 'px';
                                                                        }}
                                                                        onChange={() => {}} // Controlled strictly via keyboard events
                                                                        onKeyDown={(e) => {
                                                                            const allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'Meta', 'c', 'a'];
                                                                            if (e.ctrlKey || e.metaKey) {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    const target = e.currentTarget;
                                                                                    const cursorPosition = target.selectionStart;
                                                                                    const text1 = seg.narration.substring(0, cursorPosition).trim();
                                                                                    const text2 = seg.narration.substring(cursorPosition).trim();
                                                                                    if (!text1 || !text2) return;
                                                                                    const ratio = text1.length / (text1.length + text2.length);
                                                                                    const dur1 = seg._duration * ratio;
                                                                                    const dur2 = seg._duration * (1 - ratio);
                                                                                    const newSeg1 = { ...seg, narration: text1, _duration: dur1 };
                                                                                    const newSeg2 = { ...seg, narration: text2, _duration: dur2 };
                                                                                    const newSegments = [...editingSegments];
                                                                                    newSegments.splice(i, 1, newSeg1, newSeg2);
                                                                                    setEditingSegments(newSegments);
                                                                                }
                                                                                return;
                                                                            }
                                                                            if (e.key === 'Backspace') {
                                                                                if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
                                                                                    e.preventDefault();
                                                                                    if (i > 0) {
                                                                                        const prev = editingSegments[i - 1];
                                                                                        const newSeg = { ...prev, narration: prev.narration + ' ' + seg.narration, _duration: prev._duration + seg._duration };
                                                                                        const newSegments = [...editingSegments];
                                                                                        newSegments.splice(i - 1, 2, newSeg);
                                                                                        setEditingSegments(newSegments);
                                                                                    }
                                                                                } else { e.preventDefault(); }
                                                                                return;
                                                                            }
                                                                            if (e.key === 'Delete') {
                                                                                if (e.currentTarget.selectionStart === e.currentTarget.value.length && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
                                                                                    e.preventDefault();
                                                                                    if (isNextHook) {
                                                                                        const next = editingSegments[i + 1];
                                                                                        const newSeg = { ...seg, narration: seg.narration + ' ' + next.narration, _duration: seg._duration + next._duration };
                                                                                        const newSegments = [...editingSegments];
                                                                                        newSegments.splice(i, 2, newSeg);
                                                                                        setEditingSegments(newSegments);
                                                                                    }
                                                                                } else { e.preventDefault(); }
                                                                                return;
                                                                            }
                                                                            if (!allowedKeys.includes(e.key) && e.key.length === 1) e.preventDefault();
                                                                        }}
                                                                    />
                                                                </div>
                                                                {isNextHook && (
                                                                    <div className="flex justify-center -my-1 relative z-10">
                                                                        <div className="w-1/2 border-t-2 border-dashed border-zinc-600"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }

                                                    // Normal immutable view
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className={`p-4 rounded-xl border transition-all ${isEditingFrames ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-white/5' : (isActive ? 'cursor-pointer bg-yellow-500/10 border-yellow-500/50 scale-[1.02]' : 'cursor-pointer bg-zinc-800/50 border-white/5 hover:border-white/20')}`}
                                                            onClick={() => {
                                                                if (isEditingFrames) return;
                                                                let startTime = 0;
                                                                for (let j = 0; j < i; j++) startTime += project.segment_durations?.[j] || 0;
                                                                setCurrentTime(startTime);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                                                                    Hook {i + 1}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {!isEditingFrames && (
                                                                        <button 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                setActiveHookIndex(i);
                                                                                setShowHookStyleModal(true); 
                                                                            }}
                                                                            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold text-white transition-colors"
                                                                        >
                                                                            <Settings2 className="w-3 h-3" /> Styles
                                                                        </button>
                                                                    )}
                                                                    <span className="text-[10px] font-mono text-zinc-500">
                                                                        {seg.video_start} - {seg.video_end}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className={`text-sm leading-relaxed ${isActive && !isEditingFrames ? 'text-white' : 'text-zinc-400'}`}>
                                                                {seg.narration}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {activeModule === 'segments' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h2 className="text-lg font-bold">AI Scenes</h2>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    Review AI-generated scene prompts and upload your own custom visual assets for each segment.
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                {demoSegments.length === 0 ? (
                                                    <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-zinc-800/20">
                                                        <Sparkles className="w-8 h-8 mx-auto text-zinc-600 mb-2 animate-pulse" />
                                                        <p className="text-sm font-medium text-zinc-400">No AI Scenes found.</p>
                                                        <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                                                            Segments will be created automatically when you generate a script.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    demoSegments.map((seg, idx) => {
                                                        const isUploadingThis = uploadingSegmentId === seg.id;
                                                        const isLoadingThis = loadingImageId === seg.id;
                                                        
                                                        return (
                                                            <div 
                                                                key={seg.id}
                                                                className="p-4 rounded-xl border border-white/5 bg-zinc-800/40 space-y-3"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                                                                        Scene {idx + 1}
                                                                    </span>
                                                                </div>

                                                                <p className="text-xs text-zinc-300 leading-relaxed italic">
                                                                    "{seg.narration}"
                                                                </p>

                                                                {seg.image_prompt && (
                                                                    <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                                                                        <div className="text-[8px] font-bold text-zinc-500 uppercase">Image Prompt</div>
                                                                        <p className="text-[10px] text-zinc-400 leading-normal">{seg.image_prompt}</p>
                                                                    </div>
                                                                )}

                                                                {seg.animation_prompt && (
                                                                    <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                                                                        <div className="text-[8px] font-bold text-zinc-500 uppercase">Animation Prompt</div>
                                                                        <p className="text-[10px] text-zinc-400 leading-normal">{seg.animation_prompt}</p>
                                                                    </div>
                                                                )}

                                                                <div className="space-y-2 pt-1">
                                                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Visual Asset</label>
                                                                    {seg.image_url ? (
                                                                        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black flex items-center justify-center">
                                                                            <img 
                                                                                src={seg.image_url} 
                                                                                className="w-full h-full object-cover" 
                                                                                referrerPolicy="no-referrer"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setUploadingSegmentId(seg.id);
                                                                                        setTimeout(() => segmentFileInputRef.current?.click(), 0);
                                                                                    }}
                                                                                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-md text-[10px] font-bold border border-white/10 hover:bg-zinc-800 transition flex items-center gap-1.5 shadow-md"
                                                                                >
                                                                                    <Upload className="w-3 h-3" /> Replace
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRemoveSegmentImage(seg.id)}
                                                                                    disabled={isLoadingThis}
                                                                                    className="px-3 py-1.5 bg-red-950/80 text-red-300 rounded-md text-[10px] font-bold border border-red-500/20 hover:bg-red-900 transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" /> Remove
                                                                                </button>
                                                                            </div>
                                                                            {isLoadingThis && (
                                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div 
                                                                            onClick={() => {
                                                                                if (isLoadingThis) return;
                                                                                setUploadingSegmentId(seg.id);
                                                                                setTimeout(() => segmentFileInputRef.current?.click(), 0);
                                                                            }}
                                                                            className="border border-dashed border-white/10 hover:border-yellow-500/50 bg-zinc-900/50 hover:bg-zinc-900/80 rounded-lg p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 aspect-video relative"
                                                                        >
                                                                            {isLoadingThis ? (
                                                                                <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                                            ) : (
                                                                                <>
                                                                                    <Image className="w-5 h-5 text-zinc-500" />
                                                                                    <span className="text-[10px] font-bold text-zinc-400">Upload Visual Asset</span>
                                                                                    <span className="text-[8px] text-zinc-600">Drag & drop or click</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Hidden File Input */}
                                            <input 
                                                type="file"
                                                ref={segmentFileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (uploadingSegmentId) {
                                                        handleSegmentFileChange(e, uploadingSegmentId);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}

                                    {activeModule === 'audio' && (
                                        <div className="space-y-4">
                                            {narrationView === 'edit_script' ? (
                                                <div className="space-y-2">
                                                    <button 
                                                        onClick={() => setNarrationView('summary')}
                                                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                                                    </button>
                                                    <div className="space-y-4 pr-2">
                                                        {(project.segments || []).map((seg: any, idx: number) => (
                                                            <div key={idx} className="space-y-1">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{seg.isHook ? `Hook ${idx + 1}` : `Segment ${idx + 1}`}</label>
                                                                <textarea
                                                                    value={seg.narration}
                                                                    onChange={(e) => {
                                                                        const newText = e.target.value;
                                                                        const newSegments = [...project.segments];
                                                                        newSegments[idx] = { ...seg, narration: newText };
                                                                        updateProject({ segments: newSegments });
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
                                            ) : (
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

                                                    <button 
                                                        onClick={handleRegenerateVoice}
                                                        disabled={isGeneratingAssets}
                                                        className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm mt-4"
                                                    >
                                                        {isGeneratingAssets ? 'Regenerating...' : 'Regenerate Audio'}
                                                    </button>
                                                    {errorMessage && !isGeneratingAssets && (
                                                        <div className="text-[10px] font-bold text-red-600 animate-pulse text-center">
                                                            {errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeModule === 'subtitles' && (
                                        <div className="space-y-8">
                                            <div className="space-y-4 mt-8">
                                                <h2 className="text-lg font-bold">Highlighted Words</h2>
                                                <p className="text-xs text-zinc-400">Type a word and press enter to add it. These words will be colored green in the subtitles.</p>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 text-white"
                                                            placeholder="Type a word..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (val) {
                                                                        const current = Array.isArray(project.subtitles) ? project.subtitles : [];
                                                                        if (!current.includes(val)) {
                                                                            updateProject({ subtitles: [...current, val] });
                                                                        }
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(Array.isArray(project.subtitles) ? project.subtitles : []).map((word: string, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-[#34C759]/20 border border-[#34C759]/30 text-[#34C759] px-3 py-1 rounded-full text-xs">
                                                                <span>{word}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const current = Array.isArray(project.subtitles) ? project.subtitles : [];
                                                                        updateProject({ subtitles: current.filter(w => w !== word) });
                                                                    }}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                        </div>
                                    )}

                                    {activeModule === 'background' && (
                                        <div className="space-y-6">
                                            <h2 className="text-lg font-bold">Background Style</h2>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'white', label: 'White', color: '#FFFFFF' },
                                                    { id: 'black', label: 'Black', color: '#000000' },
                                                    { id: 'blur', label: 'Blur', isBlur: true },
                                                    { id: 'grid', label: 'Grid', isGrid: true },
                                                    { id: 'blue', label: 'Blue', color: '#3B82F6', isGrid: true },
                                                    { id: 'purple', label: 'Purple', color: '#8B5CF6', isGrid: true },
                                                    { id: 'green', label: 'Green', color: '#10B981', isGrid: true },
                                                    { id: 'red', label: 'Red', color: '#EF4444', isGrid: true }
                                                ].map((bg) => (
                                                    <button
                                                        key={bg.id}
                                                        onClick={() => updateProject({ background_type: bg.id })}
                                                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${project.background_type === bg.id || (!project.background_type && bg.id === 'white') ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800/50 border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <div 
                                                            className="w-full aspect-video rounded-lg border border-white/10 overflow-hidden relative"
                                                            style={{ 
                                                                backgroundImage: bg.isGrid ? `linear-gradient(to right, ${bg.id === 'grid' ? '#d1d5db' : 'rgba(255,255,255,0.3)'} 2px, transparent 2px), linear-gradient(to bottom, ${bg.id === 'grid' ? '#d1d5db' : 'rgba(255,255,255,0.3)'} 2px, transparent 2px)` : undefined,
                                                                backgroundSize: bg.isGrid ? '14.28% 33.33%' : undefined,
                                                                backgroundColor: bg.id === 'grid' ? '#ffffff' : bg.color
                                                            }}
                                                        >
                                                            {bg.isBlur && (
                                                                <div className="absolute inset-0 bg-zinc-700 flex items-center justify-center">
                                                                    <div className="w-8 h-8 bg-white/20 rounded-full blur-md"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold">{bg.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeModule === 'size' && (
                                        <div className="space-y-6">
                                            <h2 className="text-lg font-bold">Video Size</h2>
                                            <div className="grid grid-cols-1 gap-4">
                                                {[
                                                    { id: '16:9', label: 'Landscape (16:9)', desc: 'Best for YouTube, Desktop' },
                                                    { id: '9:16', label: 'Portrait (9:16)', desc: 'Best for TikTok, Reels, Shorts' }
                                                ].map((ratio) => (
                                                    <button
                                                        key={ratio.id}
                                                        onClick={() => updateProject({ aspect_ratio: ratio.id })}
                                                        className={`p-4 rounded-xl border text-left transition-all ${project.aspect_ratio === ratio.id ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800/50 border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <div className="font-bold mb-1">{ratio.label}</div>
                                                        <div className="text-xs text-zinc-500">{ratio.desc}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Strip Panel (Icons) */}
                    <div className="w-20 h-full bg-zinc-900 border-l border-white/10 flex flex-col items-center py-6 gap-4">
                        {MODULES.map((module) => (
                            <button
                                key={module.id}
                                onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
                                className={`group flex flex-col items-center gap-1 w-full py-3 transition-all relative ${activeModule === module.id ? 'text-yellow-500' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <module.icon className={`w-6 h-6 transition-transform ${activeModule === module.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{module.label}</span>
                                {activeModule === module.id && (
                                    <motion.div 
                                        layoutId="active-indicator"
                                        className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-full"
                                    />
                                )}
                            </button>
                        ))}
                        
                        <div className="mt-auto pt-4 border-t border-white/5 w-full flex flex-col items-center gap-4">
                            <button className="p-3 text-zinc-500 hover:text-white transition-colors">
                                <Settings2 className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <HookStyleModal 
                isOpen={showHookStyleModal}
                onClose={() => setShowHookStyleModal(false)}
                currentStyle={activeHookIndex !== null ? (project.segments?.[activeHookIndex]?.hook_style || project.hook_style) : project.hook_style}
                onUpdateStyle={async (newStyle) => {
                    if (activeHookIndex !== null) {
                        const newSegments = [...(project.segments || [])];
                        newSegments[activeHookIndex] = { ...newSegments[activeHookIndex], hook_style: newStyle };
                        await updateProject({ segments: newSegments });
                    } else {
                        await updateProject({ hook_style: newStyle });
                    }
                }}
                userId={session.user.id}
            />
        </div>
    );
};
