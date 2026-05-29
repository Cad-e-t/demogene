import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { API_URL } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { SubtitleConfigurationPanel } from '../SubtitleConfigurationPanel';
import { DEFAULT_SUBTITLE_CONFIG, SubtitleConfiguration } from '../types';
import { Layout, Type, Layers, ChevronLeft, Settings2, Palette, Undo2, Redo2, Edit2, CheckCheck } from 'lucide-react';
import { HookStyleModal } from './HookStyleModal';
import { alignSegmentsWithTranscription } from './alignment-utils';

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
    const [subtitleView, setSubtitleView] = useState<'summary' | 'edit' | 'transcription'>('summary');
    const [subtitleState, setSubtitleState] = useState<'enabled' | 'disabled'>('enabled');
    const [motionGraphicsEnabled, setMotionGraphicsEnabled] = useState(false);
    const [isGeneratingMotionGraphics, setIsGeneratingMotionGraphics] = useState(false);
    
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Editor States for Frame Segments
    const [isEditingFrames, setIsEditingFrames] = useState(false);
    const [editingSegments, setEditingSegments] = useState<any[]>([]);

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

    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('demo_projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            if (error) {
                console.error("Error fetching project:", error);
            } else {
                setProject(data);
                setHistory([data]);
                setHistoryIndex(0);
                if (data.subtitle_state) {
                    setSubtitleState(data.subtitle_state);
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

    const updateProject = async (updates: any, skipHistory = false) => {
        if (!project) return;
        
        const newState = { ...project, ...updates };
        
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
            .update(updates)
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
        
        if (updates.subtitle_state) {
            setSubtitleState(updates.subtitle_state);
        }
        
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

    const handleSubtitleStateToggle = () => {
        const newState = subtitleState === 'enabled' ? 'disabled' : 'enabled';
        setSubtitleState(newState);
        updateProject({ subtitle_state: newState });
    };

    const handleSubtitleUpdate = (updates: Partial<SubtitleConfiguration>) => {
        const newConfig = { ...(project.subtitles || DEFAULT_SUBTITLE_CONFIG), ...updates };
        updateProject({ subtitles: newConfig });
    };

    const handleTranscriptionUpdate = (newTranscription: any) => {
        updateProject({ transcription: newTranscription });
    };

    const handleExport = async (exportQuality: '1080p' | '480p') => {
        if (!project) return;
        setExporting(true);
        setShowExportMenu(false);
        try {
            const res = await fetch(`${API_URL}/demo/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id, userId: session.user.id, motionGraphicsEnabled, exportQuality })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Export failed');
            }
            // Navigate to stories immediately
            onNavigate('/content-creator/stories');
        } catch (e: any) {
            console.error(e);
            alert(`Export failed: ${e.message}`);
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
                            segments={project.segments || []}
                            segmentDurations={project.segment_durations || []}
                            transcription={project.transcription}
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
                            scriptBreakdown={project.script_breakdown}
                            motionGraphicsEnabled={motionGraphicsEnabled}
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
                                                                const { _duration, ...rest } = seg;
                                                                return rest;
                                                            });
                                                            
                                                            let newDurations = alignSegmentsWithTranscription(newSegments, project.transcription, project.total_audio_duration);
                                                            if (!newDurations || newDurations.length !== newSegments.length) {
                                                                newDurations = editingSegments.map((seg: any) => seg._duration);
                                                            }
                                                            
                                                            updateProject({ segments: newSegments, segment_durations: newDurations });
                                                            setIsEditingFrames(false);
                                                        } else {
                                                            // Enter edit mode
                                                            setEditingSegments((project.segments || []).map((seg: any, i: number) => ({
                                                                ...seg,
                                                                _duration: project.segment_durations?.[i] || 0
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
                                                        <strong className="text-blue-200">Editor Mode:</strong> Place cursor and press <kbd className="bg-blue-500/20 px-1 py-0.5 rounded border border-blue-500/30">Ctrl+Enter</kbd> to split a hook segment. Delete the line between hooks to merge them. Non-hook segments cannot be edited.
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

                                                    if (isEditingFrames && seg.isHook) {
                                                        const isNextHook = i < editingSegments.length - 1 && editingSegments[i+1].isHook;
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
                                                                                    if (i > 0 && editingSegments[i - 1].isHook) {
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
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${seg.isHook ? 'text-purple-400' : 'text-zinc-500'}`}>
                                                                    {seg.isHook ? 'Hook' : `Segment ${i}`}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {seg.isHook && !isEditingFrames && (
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

                                    {activeModule === 'subtitles' && (
                                        <div className="space-y-8">
                                            <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h2 className="text-lg font-bold">Motion Graphics</h2>
                                                        <p className="text-xs text-zinc-400">AI-driven animations for text emphasis.</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!motionGraphicsEnabled) {
                                                                if (!project.script_breakdown) {
                                                                    setIsGeneratingMotionGraphics(true);
                                                                    try {
                                                                        const res = await fetch(`${API_URL}/demo/generate-motion-graphics`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ projectId: project.id })
                                                                        });
                                                                        if (!res.ok) throw new Error('Failed to generate script breakdown.');
                                                                        const data = await res.json();
                                                                        updateProject({ script_breakdown: data.scriptBreakdown });
                                                                        setMotionGraphicsEnabled(true);
                                                                    } catch (e: any) {
                                                                        console.error(e);
                                                                        alert(e.message);
                                                                    } finally {
                                                                        setIsGeneratingMotionGraphics(false);
                                                                    }
                                                                } else {
                                                                    setMotionGraphicsEnabled(true);
                                                                }
                                                            } else {
                                                                setMotionGraphicsEnabled(false);
                                                            }
                                                        }}
                                                        disabled={isGeneratingMotionGraphics}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                            motionGraphicsEnabled ? 'bg-yellow-500' : 'bg-zinc-700'
                                                        } ${isGeneratingMotionGraphics ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                motionGraphicsEnabled ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                                {isGeneratingMotionGraphics && (
                                                    <div className="text-xs text-yellow-500 animate-pulse flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                        Generating animations using LLM...
                                                    </div>
                                                )}
                                                {motionGraphicsEnabled && (
                                                    <div className="text-xs text-zinc-400 bg-black/50 p-3 rounded-lg border border-white/5">
                                                        Traditional subtitles are disabled while Motion Graphics are active.
                                                    </div>
                                                )}
                                            </div>

                                            {!motionGraphicsEnabled && (
                                                <>
                                                    <h2 className="text-lg font-bold mt-8">Standard Subtitles</h2>
                                                    <SubtitleConfigurationPanel
                                                        subtitles={project.subtitles || DEFAULT_SUBTITLE_CONFIG}
                                                        subtitleState={subtitleState}
                                                        subtitleView={subtitleView}
                                                        setSubtitleView={setSubtitleView}
                                                        handleSubtitleStateToggle={handleSubtitleStateToggle}
                                                        handleSubtitleUpdate={handleSubtitleUpdate}
                                                        transcription={project.transcription}
                                                        currentTime={currentTime}
                                                        handleTranscriptionUpdate={handleTranscriptionUpdate}
                                                    />
                                                </>
                                            )}
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
