




import React, { useState, useEffect, useRef } from 'react';
import { editImageSegment, saveSegments, generateFinalVideo, regenerateImageSegment } from './api';
import { supabase } from '../../supabaseClient';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { EFFECT_PRESETS, NARRATION_STYLES } from './types';

export const ContentEditor = ({ session, project, initialSegments, onBack, onComplete }: any) => {
    const [segments, setSegments] = useState(initialSegments);
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Config Panel State
    const [configView, setConfigView] = useState<'main' | 'voice' | 'effect' | 'narration_style'>('main');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // Local state for editable settings
    const [voice, setVoice] = useState(VOICES.find(v => v.id === project.voice_id) || VOICES[0]);
    const [effect, setEffect] = useState(EFFECT_PRESETS.find(e => e.id === project.effect) || EFFECT_PRESETS[0]);
    
    // Default style or match by prompt text
    const initialStyle = NARRATION_STYLES.find(s => s.prompt === project.narration_style) || NARRATION_STYLES[0];
    const [narrationStyle, setNarrationStyle] = useState(initialStyle);
    
    // Audio Preview
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Subscribe to DB updates for images
    useEffect(() => {
        console.log(`[ContentEditor] Subscribing to updates for project ${project.id}`);
        const channel = supabase.channel(`project-${project.id}`)
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

    const handleVoiceChange = async (newVoice: any) => {
        setVoice(newVoice);
        setConfigView('main');
        await supabase.from('content_projects').update({ voice_id: newVoice.id }).eq('id', project.id);
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

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            await saveSegments(segments);
            // Pass the current voice/effect state to ensure consistency, though DB update should have handled it
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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative">
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

            {/* Config Toggle (Mobile) */}
             <div className="md:hidden absolute top-4 right-4 z-20">
                <button onClick={() => setIsConfigOpen(!isConfigOpen)} className="p-2 bg-white rounded-lg shadow">⚙️</button>
            </div>

            {/* Config Sidebar (Right Side) */}
            <div className={`absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-200 p-6 transform transition-transform z-30 ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
                
                {configView === 'main' && (
                    <>
                        <h3 className="font-black text-xl mb-8 uppercase tracking-tight">Project Settings</h3>
                        
                        <div className="space-y-6">
                            {/* Disabled Fields */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Aspect Ratio</label>
                                <div className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-400 cursor-not-allowed">
                                    {project.aspect_ratio === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Image Style</label>
                                <div className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-400 cursor-not-allowed">
                                    {project.image_style || 'Realistic'}
                                </div>
                            </div>

                            {/* Editable Fields */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Effects</label>
                                <button 
                                    onClick={() => setConfigView('effect')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{effect.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Narrator</label>
                                <button 
                                    onClick={() => setConfigView('voice')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span>{voice.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Narration Style</label>
                                <button 
                                    onClick={() => setConfigView('narration_style')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                                >
                                    <span className="truncate">{narrationStyle.name} ({narrationStyle.description.split(',')[0]}...)</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
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
                                    onClick={() => handleEffectChange(e)}
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
                                    onClick={() => handleVoiceChange(v)}
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
                                    onClick={() => handleNarrationStyleChange(s)}
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

            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 md:mr-80">
                <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-black">← Back</button>
                <h3 className="font-black text-lg truncate max-w-xs">{project.title}</h3>
                <button 
                    onClick={handleFinalize}
                    disabled={submitting || !allImagesReady}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!allImagesReady ? "Wait for all images to generate" : ""}
                >
                    {submitting ? 'Starting...' : 'Generate Video'}
                </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto md:mr-80 thin-scrollbar bg-gray-50">
                <div className="max-w-3xl mx-auto w-full p-6 space-y-8">
                    {segments.map((seg: any, idx: number) => (
                        <div key={seg.id || idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                            {/* Image Preview */}
                            <div className="relative w-full md:w-48 aspect-[9/16] md:aspect-square bg-gray-100 rounded-2xl overflow-hidden shrink-0 group">
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
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-50 relative group">
                                        <div className="absolute inset-0 animate-pulse bg-indigo-100/50"></div>
                                        {/* Retry Icon for Stuck Generations */}
                                        <button 
                                            onClick={() => setRegeneratingId(seg.id)}
                                            className="absolute z-10 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition transform hover:scale-110"
                                            title="Retry Generation"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Text Editor */}
                            <div className="flex-1 flex flex-col">
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">Segment {idx + 1}</span>
                                <textarea 
                                    className="w-full flex-1 resize-none outline-none text-lg font-medium text-gray-800 placeholder-gray-300"
                                    value={seg.narration}
                                    onChange={(e) => handleTextChange(seg.id, e.target.value)}
                                    placeholder="Write narration..."
                                />
                                <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                                    <span className="font-bold">Visual Prompt:</span> {seg.image_prompt.substring(0, 50)}...
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Regeneration Confirmation Modal */}
            {regeneratingId && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
                        <h3 className="font-bold text-lg mb-2">Regenerate Image?</h3>
                        <p className="text-gray-500 mb-6 text-sm">This will discard the current image and generate a new one using the original prompt.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setRegeneratingId(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                            <button 
                                onClick={handleRegenerate}
                                disabled={loadingImage}
                                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition"
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
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
                        <h3 className="font-bold text-lg mb-4">Edit Image</h3>
                        <input 
                            className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4"
                            placeholder="Describe change (e.g., 'make it night time')"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingImageId(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                            <button 
                                onClick={handleImageEdit}
                                disabled={loadingImage}
                                className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition"
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