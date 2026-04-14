import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { API_URL } from '../api';
import { VOICES, VOICE_SAMPLES } from '../../../voiceConfig';
import { Play, Pause, ChevronDown } from 'lucide-react';

interface Props {
    session: any;
    onToggleSidebar: () => void;
    onProjectCreated?: (projectId: string) => void;
}

export const DemoVideoPage: React.FC<Props> = ({ session, onToggleSidebar, onProjectCreated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    
    const [hookText, setHookText] = useState('');
    const [bodyText, setBodyText] = useState('');
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
        if (!videoId || !bodyText) return;
        
        setIsProcessing(true);
        setProcessingStatus('Starting process...');
        
        try {
            // Combine Hook and Body for the script
            const fullScript = hookText ? `${hookText}\n\n${bodyText}` : bodyText;
            
            const res = await fetch(`${API_URL}/demo/process-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    userId: session.user.id,
                    hookText,
                    bodyText,
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
            alert(`Processing failed: ${err.message}`);
            setProcessingStatus(null);
        } finally {
            setIsProcessing(false);
        }
    };

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

            <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-8">
                {!uploadedVideoUrl ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/20 rounded-3xl bg-zinc-900/50">
                        <div className="text-6xl mb-4">🎥</div>
                        <h3 className="text-xl font-bold text-white mb-2">Select or Upload Video</h3>
                        <p className="text-zinc-400 text-center max-w-md mb-8">
                            Choose an existing screen recording or upload a new one to generate your demo video.
                        </p>
                        
                        <button 
                            onClick={openUploadModal}
                            disabled={isUploading}
                            className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                        >
                            {isUploading ? `Uploading... ${uploadProgress}%` : 'Select Video'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Video Preview */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-white">Your Recording</h3>
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 aspect-video">
                                <video 
                                    src={uploadedVideoUrl} 
                                    controls 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    setUploadedVideoUrl(null);
                                    setVideoId(null);
                                    setFile(null);
                                }}
                                className="text-sm text-red-500 hover:text-red-400 font-bold self-start"
                            >
                                Remove Video
                            </button>
                        </div>

                        {/* Script Input */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Hook (Optional)</label>
                                <textarea 
                                    value={hookText}
                                    onChange={(e) => setHookText(e.target.value)}
                                    placeholder="e.g., Are you tired of manual data entry? See how our app automates it in seconds."
                                    className="w-full h-24 bg-zinc-900 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 resize-none"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Body Script</label>
                                <textarea 
                                    value={bodyText}
                                    onChange={(e) => setBodyText(e.target.value)}
                                    placeholder="Describe the steps in your video. The AI will segment the video to match these steps..."
                                    className="w-full h-48 bg-zinc-900 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 resize-none"
                                />
                            </div>

                            <div className="flex flex-col gap-2" ref={voiceDropdownRef}>
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Voice</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-500/50 flex items-center justify-between transition-colors"
                                    >
                                        <span>{VOICES.find(v => v.id === voiceId)?.name || 'Select Voice'}</span>
                                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isVoiceDropdownOpen && (
                                        <div className="absolute z-20 bottom-full left-0 right-0 mb-2 bg-zinc-800 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                            {VOICES.map(v => (
                                                <div
                                                    key={v.id}
                                                    onClick={() => {
                                                        setVoiceIdState(v.id);
                                                        setIsVoiceDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${voiceId === v.id ? 'bg-yellow-500/20 text-yellow-500' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <span className="font-medium">{v.name} <span className="text-xs opacity-50 ml-1">({v.gender})</span></span>
                                                    {VOICE_SAMPLES[v.id] && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => toggleVoiceSample(e, v.id)} 
                                                            className={`p-2 rounded-full transition-colors ${playingVoiceId === v.id ? 'bg-yellow-500 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'}`}
                                                        >
                                                            {playingVoiceId === v.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Aspect Ratio</label>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setAspectRatio('16:9')}
                                        className={`flex-1 py-3 rounded-xl border transition-all font-bold ${aspectRatio === '16:9' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'}`}
                                    >
                                        16:9 Landscape
                                    </button>
                                    <button 
                                        onClick={() => setAspectRatio('9:16')}
                                        className={`flex-1 py-3 rounded-xl border transition-all font-bold ${aspectRatio === '9:16' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'}`}
                                    >
                                        9:16 Portrait
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={handleProcess}
                                disabled={isProcessing || !bodyText.trim()}
                                className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Processing...
                                    </>
                                ) : 'Generate Demo Video'}
                            </button>
                            
                            {processingStatus && (
                                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium text-center">
                                    {processingStatus}
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
