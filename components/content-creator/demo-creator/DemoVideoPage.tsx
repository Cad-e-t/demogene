import React, { useState, useRef, useEffect } from 'react';
import { API_URL, sanitizeErrorMsg } from '../api';
import { VOICES, VOICE_SAMPLES } from '../../../voiceConfig';
import { Play, Pause, ChevronDown } from 'lucide-react';

interface Props {
    session: any;
    onToggleSidebar: () => void;
    onProjectCreated?: (projectId: string) => void;
}

export const DemoVideoPage: React.FC<Props> = ({ session, onToggleSidebar, onProjectCreated }) => {
    const [promptText, setPromptText] = useState('');
    const [voiceId, setVoiceIdState] = useState(VOICES[0].id);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voiceDropdownRef = useRef<HTMLDivElement>(null);

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

    const handleProcess = async () => {
        if (!promptText.trim()) {
            alert("Please type your script or AI prompt first.");
            return;
        }
        
        setIsProcessing(true);
        setProcessingStatus('Starting process...');
        
        try {
            const res = await fetch(`${API_URL}/demo/process-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: null,
                    userId: session.user.id,
                    prompt: promptText.trim(),
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

            <div className="p-6 max-w-3xl mx-auto w-full flex flex-col gap-8 flex-1">
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
                                disabled={isProcessing || !promptText.trim()}
                                className="w-full py-2.5 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 flex items-center justify-center gap-2 whitespace-nowrap"
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

                    {/* Scrollable Prompt Container */}
                    <div className="flex-1 h-0 overflow-y-auto px-1 pb-10">
                        <div className="flex flex-col">
                            <div className="w-full bg-zinc-900 border border-purple-500/30 rounded-2xl p-4 relative">
                                <label className="text-sm font-bold uppercase tracking-wider mb-2 block text-purple-400">
                                    Voiceover Script & AI Prompt
                                </label>
                                
                                <textarea 
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder="Describe what the voiceover should say, or paste your script..."
                                    className="w-full h-64 bg-black border border-white/5 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
