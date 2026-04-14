import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import { API_URL } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { SubtitleConfigurationPanel } from '../SubtitleConfigurationPanel';
import { DEFAULT_SUBTITLE_CONFIG, SubtitleConfiguration } from '../types';
import { Layout, Type, Layers, ChevronLeft, Settings2, Palette, Undo2, Redo2 } from 'lucide-react';
import { HookStyleModal } from './HookStyleModal';

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
    const [subtitleView, setSubtitleView] = useState<'summary' | 'edit' | 'transcription'>('summary');
    const [subtitleState, setSubtitleState] = useState<'enabled' | 'disabled'>('enabled');

    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(-1);
    const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        historyIndexRef.current = historyIndex;
    }, [historyIndex]);

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

    const handleExport = async () => {
        if (!project) return;
        setExporting(true);
        try {
            const res = await fetch(`${API_URL}/demo/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id, userId: session.user.id })
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
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExport}
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
                                            <h2 className="text-lg font-bold">Script Segments</h2>
                                            <div className="space-y-4">
                                                {(project.segments || []).map((seg: any, i: number) => {
                                                    let currentAudioTime = 0;
                                                    let isActive = false;
                                                    for (let j = 0; j <= i; j++) {
                                                        const dur = project.segment_durations?.[j] || 0;
                                                        if (j === i) {
                                                            isActive = currentTime >= currentAudioTime && currentTime <= currentAudioTime + dur;
                                                        }
                                                        currentAudioTime += dur;
                                                    }

                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-yellow-500/10 border-yellow-500/50 scale-[1.02]' : 'bg-zinc-800/50 border-white/5 hover:border-white/20'}`}
                                                            onClick={() => {
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
                                                                    {seg.isHook && (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setShowHookStyleModal(true); }}
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
                                                            <p className={`text-sm leading-relaxed ${isActive ? 'text-white' : 'text-zinc-400'}`}>
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
                                            <h2 className="text-lg font-bold">Subtitle Style</h2>
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
                                                                backgroundImage: bg.isGrid ? `linear-gradient(to right, ${bg.id === 'grid' ? '#e5e7eb' : 'rgba(255,255,255,0.2)'} 1px, transparent 1px), linear-gradient(to bottom, ${bg.id === 'grid' ? '#e5e7eb' : 'rgba(255,255,255,0.2)'} 1px, transparent 1px)` : undefined,
                                                                backgroundSize: bg.isGrid ? '10px 10px' : undefined,
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
                currentStyle={project.hook_style}
                onUpdateStyle={async (newStyle) => {
                    await updateProject({ hook_style: newStyle });
                }}
                userId={session.user.id}
            />
        </div>
    );
};
