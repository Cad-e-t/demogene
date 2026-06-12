import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { API_URL, sanitizeErrorMsg } from '../api';
import { VOICES, VOICE_SAMPLES } from '../../../voiceConfig';
import { Play, Pause, ChevronDown, Plus, X } from 'lucide-react';

interface Props {
    session: any;
    onToggleSidebar: () => void;
    onProjectCreated?: (projectId: string) => void;
}

interface Section {
    id: string;
    type: 'hook' | 'body';
    text: string;
}

export const DemoVideoPage: React.FC<Props> = ({ session, onToggleSidebar, onProjectCreated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    
    const [sections, setSections] = useState<Section[]>([{ id: uuidv4(), type: 'body', text: '' }]);
    const [voiceId, setVoiceIdState] = useState(VOICES[0].id);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [existingVideos, setExistingVideos] = useState<any[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);

    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voiceDropdownRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
                setIsVoiceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleVoiceSample = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const sampleUrl = VOICE_SAMPLES[id];
        if (!sampleUrl) return;

        if (playingVoiceId === id) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(sampleUrl);
            audioRef.current = audio;
            audio.play();
            setPlayingVoiceId(id);
            audio.onended = () => setPlayingVoiceId(null);
        }
    };

    const openUploadModal = async () => {
        setIsUploadModalOpen(true);
        setIsLoadingVideos(true);
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setExistingVideos(data || []);
        } catch (err) {
            console.error("Failed to fetch videos", err);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const selectExistingVideo = (video: any) => {
        setVideoId(video.id);
        setUploadedVideoUrl(video.input_video_url);
        setIsUploadModalOpen(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setIsUploadModalOpen(false);
            await handleUpload(selectedFile);
        }
    };

    const handleUpload = async (selectedFile: File) => {
        setIsUploading(true);
        setUploadProgress(10);
        try {
            // 1. Get signed URL
            const res = await fetch(`${API_URL}/demo/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    fileType: selectedFile.type
                })
            });
            
            if (!res.ok) throw new Error('Failed to get upload URL');
            const { uploadUrl, publicUrl } = await res.json();
            
            setUploadProgress(40);

            // 2. Upload to R2
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': selectedFile.type,
                },
                body: selectedFile
            });

            if (!uploadRes.ok) throw new Error('Failed to upload file');
            
            setUploadProgress(80);

            // 3. Create DB record
            const newVideoId = uuidv4();
            const { error } = await supabase.from('videos').insert({
                id: newVideoId,
                user_id: session.user.id,
                title: selectedFile.name,
                input_video_url: publicUrl,
                status: 'uploaded'
            });

            if (error) throw error;

            setVideoId(newVideoId);
            setUploadedVideoUrl(publicUrl);
            setUploadProgress(100);
        } catch (err) {
            console.error(err);
            alert('Upload failed. Please try again.');
            setFile(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleProcess = async () => {
        const hasBodyText = sections.some(s => s.type === 'body' && s.text.trim());
        const hasAnyText = sections.some(s => s.text.trim());

        // Body script is optional. If provided, video is required.
        if (hasBodyText && !videoId) {
            alert("A video is required when a Body Script is provided.");
            return;
        }

        // If neither hook nor body is provided, don't submit.
        if (!hasAnyText) return;
        
        setIsProcessing(true);
        setProcessingStatus('Starting process...');
        
        try {
            const res = await fetch(`${API_URL}/demo/process-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: videoId || null,
                    userId: session.user.id,
                    sections: sections.filter(s => s.text.trim() || s.type === 'body'), // filter out empty hooks
                    voiceId,
                    aspectRatio,
                    videoType: 'demo'
                })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to process video');
            }
            
            const data = await res.json();
            setProcessingStatus('Video is processing in the background. Check your projects later!');
            if (onProjectCreated && data.videoId) {
                onProjectCreated(data.videoId);
            }
            
        } catch (err: any) {
            console.error(err);
            alert(sanitizeErrorMsg(err, `Processing failed. Please try again.`));
            setProcessingStatus(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const addHook = (index: number) => {
        const newSections = [...sections];
        newSections.splice(index, 0, { id: uuidv4(), type: 'hook', text: '' });
        setSections(newSections);
    };

    const removeHook = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const updateSectionText = (id: string, text: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, text } : s));
    };

    const hasBodyText = sections.some(s => s.type === 'body' && s.text.trim());
    const hasAnyText = sections.some(s => s.text.trim());

    return (
        <div className="flex-1 flex flex-col h-full bg-black overflow-y-auto relative">
            <header className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <div className="flex items-center w-full">
                    <button onClick={onToggleSidebar} className="md:hidden p-2 text-zinc-400 hover:text-white mr-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <div className="flex-1 flex justify-center">
                        <h1 className="text-sm sm:text-2xl md:text-4xl font-black uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">
                            Demo Video Creator
                        </h1>
                    </div>
                    <div className="w-10 md:hidden"></div>
                </div>
            </header>

            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-8 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
                    {/* Left Column: Video Preview / Upload */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-white">Your Recording <span className="text-sm font-normal text-zinc-500">(Required for Body Script)</span></h3>
                        
                        {!uploadedVideoUrl ? (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); openUploadModal(); }}>
                                <div className="text-4xl mb-4">🎥</div>
                                <h3 className="text-base font-bold text-white mb-2">Select or Upload Video</h3>
                                <p className="text-zinc-400 text-sm text-center max-w-xs mb-4">
                                    Choose an existing recording or upload a new one.
                                </p>
                                <button 
                                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all disabled:opacity-50"
                                    onClick={(e) => { e.stopPropagation(); openUploadModal(); }}
                                    disabled={isUploading}
                                >
                                    {isUploading ? `Uploading... ${uploadProgress}%` : 'Select Video'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 aspect-video relative group">
                                    <video 
                                        src={uploadedVideoUrl} 
                                        controls 
                                        className="w-full h-full object-contain bg-black"
                                    />
                                    <button 
                                        onClick={() => {
                                            setUploadedVideoUrl(null);
                                            setVideoId(null);
                                            setFile(null);
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                        title="Remove Video"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Script Input & Controls */}
                    <div className="flex flex-col gap-4 h-full">
                        {/* Compact Settings & Generate Bar */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
                            
                            <div className="flex flex-wrap items-center gap-4 flex-1">
                                {/* Voice Dropdown */}
                                <div className="relative" ref={voiceDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-white hover:border-yellow-500/50 flex items-center justify-between transition-colors gap-2 text-sm"
                                    >
                                        <span className="font-bold">Voice:</span> 
                                        <span className="text-zinc-300">{VOICES.find(v => v.id === voiceId)?.name || 'Select Voice'}</span>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isVoiceDropdownOpen && (
                                        <div className="absolute z-20 top-full mt-2 left-0 w-64 bg-zinc-800 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                            {VOICES.map(v => (
                                                <div
                                                    key={v.id}
                                                    onClick={() => {
                                                        setVoiceIdState(v.id);
                                                        setIsVoiceDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${voiceId === v.id ? 'bg-yellow-500/20 text-yellow-500' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <span className="font-medium text-sm">{v.name} <span className="text-xs opacity-50 ml-1">({v.gender})</span></span>
                                                    {VOICE_SAMPLES[v.id] && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => toggleVoiceSample(e, v.id)} 
                                                            className={`p-1.5 rounded-full transition-colors ${playingVoiceId === v.id ? 'bg-yellow-500 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'}`}
                                                        >
                                                            {playingVoiceId === v.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Aspect Ratio Toggle */}
                                <div className="flex bg-black border border-white/10 rounded-xl overflow-hidden text-sm">
                                    <button 
                                        onClick={() => setAspectRatio('16:9')}
                                        className={`px-3 py-2 font-bold transition-colors ${aspectRatio === '16:9' ? 'bg-yellow-500/20 text-yellow-500' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        16:9
                                    </button>
                                    <div className="w-px bg-white/10"></div>
                                    <button 
                                        onClick={() => setAspectRatio('9:16')}
                                        className={`px-3 py-2 font-bold transition-colors ${aspectRatio === '9:16' ? 'bg-yellow-500/20 text-yellow-500' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        9:16
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-[200px]">
                                <button 
                                    onClick={handleProcess}
                                    disabled={isProcessing || !hasAnyText || (hasBodyText && !videoId)}
                                    className="w-full py-2.5 px-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processing...
                                        </>
                                    ) : 'Generate'}
                                </button>
                            </div>
                            
                            {processingStatus && (
                                <div className="w-full p-2 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium text-center">
                                    {processingStatus}
                                </div>
                            )}
                        </div>

                        {/* Scrollable Sections Container */}
                        <div className="flex-1 h-0 overflow-y-auto px-1 pb-10">
                            <div className="flex flex-col">
                                {sections.map((section, idx) => (
                                    <div key={section.id} className="relative flex flex-col items-center">
                                        
                                        {/* Top Plus Button */}
                                        <button 
                                            onClick={() => addHook(idx)}
                                            className="z-10 bg-zinc-800 hover:bg-zinc-700 border border-white/20 rounded-full p-1 my-2 transition-colors text-zinc-400 hover:text-white"
                                            title="Add Hook Above"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>

                                        {/* Section Box */}
                                        <div className={`w-full bg-zinc-900 border ${section.type === 'hook' ? 'border-purple-500/30' : 'border-white/10'} rounded-2xl p-4 relative group`}>
                                            {section.type === 'hook' && (
                                                <button 
                                                    onClick={() => removeHook(section.id)}
                                                    className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Remove Hook"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                            
                                            <label className={`text-sm font-bold uppercase tracking-wider mb-2 block ${section.type === 'hook' ? 'text-purple-400' : 'text-zinc-400'}`}>
                                                {section.type === 'hook' ? `Hook ${sections.filter((s, i) => s.type === 'hook' && i <= idx).length}` : 'Body Script'}
                                            </label>
                                            
                                            <textarea 
                                                value={section.text}
                                                onChange={(e) => updateSectionText(section.id, e.target.value)}
                                                placeholder={section.type === 'hook' ? "Provide a catchy opening..." : "Describe the steps in your video..."}
                                                className={`w-full ${section.type === 'hook' ? 'h-24' : 'h-48'} bg-black border border-white/5 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 resize-none`}
                                            />
                                        </div>

                                        {/* Bottom Plus Button (only for the very last item) */}
                                        {idx === sections.length - 1 && (
                                            <button 
                                                onClick={() => addHook(idx + 1)}
                                                className="z-10 bg-zinc-800 hover:bg-zinc-700 border border-white/20 rounded-full p-1 mt-2 mb-4 transition-colors text-zinc-400 hover:text-white"
                                                title="Add Hook Below"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-white">Select or Upload Video</h2>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-zinc-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Upload New Section */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Upload New</h3>
                                <input 
                                    type="file" 
                                    accept="video/mp4,video/webm,video/quicktime" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors"
                                >
                                    <div className="text-4xl mb-2">📤</div>
                                    <p className="text-white font-medium">Click to upload from device</p>
                                    <p className="text-xs text-zinc-500 mt-1">MP4, WEBM, MOV</p>
                                </div>
                            </div>

                            {/* Existing Uploads Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Existing Uploads</h3>
                                {isLoadingVideos ? (
                                    <div className="flex justify-center p-8">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : existingVideos.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {existingVideos.map(video => (
                                            <div 
                                                key={video.id} 
                                                onClick={() => selectExistingVideo(video)}
                                                className="group relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 hover:border-white/40 cursor-pointer transition-colors"
                                            >
                                                <video src={video.input_video_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                    <p className="text-xs text-white truncate">{video.title || 'Untitled'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-zinc-500 text-sm">
                                        No existing uploads found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
