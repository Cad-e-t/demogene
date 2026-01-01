
import React, { useRef, useState, useEffect } from 'react';
import { VideoCropper } from './VideoCropper';
import { AdvancedEditorModal } from './AdvancedEditorModal';
import { LandingPage } from './LandingPage';
import { InteractiveDemo } from './InteractiveDemo';
import { CropData, TrimData, VoiceOption, BackgroundOption, TimeRange, VideoProject } from '../types';
import { VOICES, BACKGROUNDS } from '../constants';
import { VOICE_SAMPLES } from '../voiceSamples';
import { EXAMPLE_VIDEOS } from '../assets';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

interface HomeViewProps {
    file: File | null;
    videoUrl: string | null;
    session: any;
    profile: any;
    crop: CropData;
    setCrop: (c: CropData) => void;
    trim: TrimData;
    setTrim: (t: TrimData) => void;
    voice: VoiceOption;
    setVoice: (v: VoiceOption) => void;
    appName: string;
    setAppName: (s: string) => void;
    appDescription: string;
    setAppDescription: (s: string) => void;
    
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    onGenerate: (segments?: TimeRange[], backgroundId?: string) => void;
    onPurchase: () => void;
    
    showAuthModal: boolean;
    handleLogin: () => void;
    
    showSuccessNotification: boolean;
    setShowSuccessNotification: (b: boolean) => void;
    showFailureNotification: boolean;
    setShowFailureNotification: (b: boolean) => void;
    
    errorMessage: string | null;
    backgroundOptions: BackgroundOption[];
}

export const HomeView: React.FC<HomeViewProps> = ({
    file, videoUrl, session, profile,
    crop, setCrop, trim, setTrim,
    voice, setVoice, 
    appName, setAppName,
    appDescription, setAppDescription,
    onFileChange, onClearFile, onGenerate, onPurchase,
    showAuthModal, handleLogin,
    showSuccessNotification, setShowSuccessNotification,
    showFailureNotification, setShowFailureNotification,
    errorMessage,
    backgroundOptions
}) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const duration = trim.end - trim.start;
    
    // Config Panel Navigation
    const [activeSelection, setActiveSelection] = useState<'main' | 'voice' | 'background'>('main');
    
    const [background, setBackground] = useState<BackgroundOption>(backgroundOptions[0] || BACKGROUNDS[0]);
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    const [segments, setSegments] = useState<TimeRange[] | null>(null);
    
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoResultVideo, setDemoResultVideo] = useState<string | null>(null);
    const [selectedExample, setSelectedExample] = useState<any>(null);

    // Sync default background if options change
    useEffect(() => {
        if (backgroundOptions.length > 0 && background.id === 'none') {
            setBackground(backgroundOptions[0]);
        }
    }, [backgroundOptions]);

    const effectiveDuration = segments 
        ? segments.reduce((acc, s) => acc + (s.end - s.start), 0)
        : duration;

    const isDurationValid = effectiveDuration <= 300; // Updated to 5 minutes
    const isConfigComplete = background.id !== undefined && voice.id !== undefined && (voice.id === 'voiceless' || (appName.trim() && appDescription.trim()));
    const outOfCredits = profile && profile.credits < 1;

    // Mobile Editor State
    const [mobileTab, setMobileTab] = useState<'preview' | 'settings'>('preview');

    const handleClear = () => {
        setSegments(null);
        onClearFile();
    };

    const triggerGenerate = () => {
        onGenerate(segments || undefined, background.id);
    };

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

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Interactive Demo Finish Handler
    const handleDemoFinish = (videoUrl: string) => {
      setDemoResultVideo(videoUrl);
      setIsDemoMode(false);
    };

    if (isDemoMode) {
      return <InteractiveDemo onClose={() => setIsDemoMode(false)} onFinish={handleDemoFinish} />;
    }

    if (demoResultVideo) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in">
          <div className="max-w-4xl w-full text-center space-y-8">
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Your Demo is Ready!</h2>
            <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-green-500/20">
              <video src={demoResultVideo} controls autoPlay className="w-full h-full" />
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={() => setDemoResultVideo(null)} 
                className="px-8 py-4 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Back to Dashboard
              </button>
              <label className="px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition cursor-pointer">
                Create with your own recording
                <input type="file" className="hidden" accept="video/*" onChange={(e) => { setDemoResultVideo(null); onFileChange(e); }} />
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (!file) {
        if (!session) {
            return <LandingPage onFileChange={onFileChange} handleLogin={handleLogin} />;
        }

        return (
            <div className="relative w-full min-h-screen flex flex-col items-center bg-gray-50 p-6 md:p-12 overflow-x-hidden overflow-y-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-green-500/[0.03] rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="relative z-10 w-full max-w-6xl mx-auto space-y-20 py-10">
                    
                    {/* Main Header & Upload Section */}
                    <div className="flex flex-col items-center text-center space-y-12">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase">Create New Demo</h1>
                            <p className="text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
                                Upload a screen recording to turn it into a polished narrated demo. Best results with recordings under 3 minutes.
                            </p>
                        </div>

                        <div className="w-full flex flex-col md:flex-row items-stretch justify-center gap-6">
                            {/* Primary Upload Action */}
                            <label className="flex-1 max-w-lg group relative cursor-pointer transform hover:scale-[1.01] transition-all duration-300">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-green-400 to-emerald-600 rounded-[32px] blur-lg opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                <div className="relative flex flex-col items-center justify-center gap-6 px-10 py-16 bg-white border-2 border-gray-100 rounded-[32px] shadow-2xl hover:border-green-300 transition-colors">
                                    <div className="p-5 bg-green-50 rounded-3xl text-green-600 ring-8 ring-green-50/50 group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="block font-black text-3xl text-gray-900 tracking-tight uppercase">Select Recording</span>
                                        <span className="block text-sm font-bold text-gray-400 uppercase tracking-widest">MP4, MOV up to 300MB</span>
                                    </div>
                                </div>
                                <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                            </label>

                            {/* Secondary Actions Card */}
                            <div className="flex-1 max-w-lg flex flex-col gap-4">
                                <button 
                                    onClick={() => setIsDemoMode(true)}
                                    className="flex-1 group relative p-8 bg-gray-900 text-white rounded-[32px] border border-gray-800 shadow-xl overflow-hidden hover:border-green-500/50 transition-all text-left"
                                >
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter">Try a Demo</h3>
                                            <p className="text-gray-400 font-medium text-sm leading-relaxed">
                                                Not ready to upload? See how it works with our interactive guided demo.
                                            </p>
                                        </div>
                                        <span className="mt-4 inline-flex items-center gap-2 text-green-500 font-bold text-sm uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Start Simulator
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        </span>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                </button>

                                {profile && (
                                    <div className="p-6 bg-white border border-gray-200 rounded-[32px] flex items-center justify-between shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Credits</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${profile.credits > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
                                                <span className="text-xl font-black text-gray-900">{profile.credits} Demo{profile.credits !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        {profile.credits === 0 ? (
                                            <button onClick={() => window.location.hash = '#/pricing'} className="px-6 py-3 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition shadow-lg shadow-green-600/20 uppercase text-xs tracking-wider">Top Up</button>
                                        ) : (
                                            <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Plan</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trust/Gallery Section */}
                    <div className="space-y-10 pt-10">
                        <div className="flex flex-col items-center text-center space-y-2">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Example Generations</h2>
                            <p className="text-gray-500 font-medium">See the results our system delivers in seconds</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {EXAMPLE_VIDEOS.map((ex) => (
                                <div 
                                    key={ex.id} 
                                    onClick={() => setSelectedExample(ex)}
                                    className="group relative bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer"
                                >
                                    <div className="aspect-video relative bg-black overflow-hidden">
                                        <video 
                                            src={ex.url} 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                            muted 
                                            onMouseOver={e => e.currentTarget.play()} 
                                            onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center pointer-events-none">
                                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white ring-1 ring-white/20 group-hover:scale-125 group-hover:opacity-0 transition-all">
                                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg">{ex.title}</h4>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{ex.category}</p>
                                        </div>
                                        <div className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100 uppercase tracking-widest">
                                            Generated by ProductCam
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Example Modal Overlay */}
                {selectedExample && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10" onClick={() => setSelectedExample(null)}>
                        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => setSelectedExample(null)}
                                className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <video 
                                src={selectedExample.url} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedExample.title}</h3>
                                <p className="text-green-400 font-bold uppercase tracking-widest text-xs">{selectedExample.category}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans overflow-hidden">
             
             <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-20">
                 <button onClick={handleClear} className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                 </button>
                 <span className="text-xs font-bold text-gray-400 truncate max-w-[150px] uppercase tracking-wider">{file?.name}</span>
                 <div className="w-10"></div>
             </div>

             <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 flex items-center justify-center px-6 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                 <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200 w-full">
                     <button onClick={() => setMobileTab('preview')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${mobileTab === 'preview' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>Preview</button>
                     <button onClick={() => setMobileTab('settings')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${mobileTab === 'settings' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>Continue</button>
                 </div>
             </div>

             <div className={`flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0 ${mobileTab === 'settings' ? 'hidden md:flex' : 'flex'}`}>
                 <div className="hidden md:flex h-14 border-b border-gray-200 items-center justify-between px-6 bg-white flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={handleClear} className="text-gray-400 hover:text-gray-900 transition-colors p-1" title="Close Project"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <span className="text-sm font-bold text-gray-900 truncate max-w-md">{file?.name}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-500 flex items-center gap-2 font-bold">
                        {segments && <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded">Advanced Edits Applied</span>}
                        <span>{effectiveDuration.toFixed(1)}s Total</span>
                    </div>
                 </div>

                 <div className="flex-1 bg-gray-50/80 relative flex flex-col min-h-0 items-center justify-center p-8 border-r border-gray-200">
                      {videoUrl && (
                          <div className="relative w-full h-full flex flex-col items-center">
                              <div 
                                className="flex-1 w-full flex items-center justify-center min-h-0 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden relative"
                                style={{
                                    backgroundImage: background.url ? `url(${background.url})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                              >
                                  <VideoCropper 
                                     videoUrl={videoUrl}
                                     onCropChange={setCrop}
                                     onTrimChange={setTrim}
                                     onAdvancedEdit={() => setShowAdvancedEditor(true)}
                                     hideTimeline={true}
                                     segments={segments || undefined}
                                  />
                              </div>
                              <div className="w-full flex justify-center py-6 shrink-0">
                                  <button onClick={() => setShowAdvancedEditor(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Remove unwanted parts (optional)
                                  </button>
                              </div>
                          </div>
                      )}
                 </div>
             </div>

             <div className={`w-full md:w-80 md:border-l border-gray-200 bg-white flex flex-col z-10 flex-shrink-0 pb-20 md:pb-0 ${mobileTab === 'preview' ? 'hidden md:flex' : 'flex h-full'}`}>
                 <div className="h-14 border-b border-gray-200 flex items-center px-6 flex-shrink-0 bg-gray-50/50 justify-between">
                     <button 
                        onClick={() => setActiveSelection('main')}
                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${activeSelection === 'main' ? 'text-gray-500' : 'text-green-600 hover:text-green-700'}`}
                     >
                        {activeSelection !== 'main' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>}
                        {activeSelection === 'main' ? 'Configuration' : activeSelection === 'voice' ? 'Choose Voice' : 'Choose Background'}
                     </button>
                     {profile && (
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 whitespace-nowrap">
                            {profile.credits} Demo{profile.credits !== 1 ? 's' : ''} left
                        </span>
                     )}
                 </div>

                 <div className="flex-1 overflow-y-auto relative">
                     {activeSelection === 'main' && (
                        <div className="p-6 space-y-6">
                            {/* Dashboard Columnar Layout */}
                            <div className="grid grid-cols-1 gap-4">
                                <button 
                                    onClick={() => setActiveSelection('voice')}
                                    className="w-full flex flex-col items-start p-4 border rounded-xl hover:border-green-500 transition-all bg-white shadow-sm group"
                                >
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Voice</span>
                                    <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        {voice.name}
                                        <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </span>
                                </button>

                                <button 
                                    onClick={() => setActiveSelection('background')}
                                    className="w-full flex flex-col items-start p-4 border rounded-xl hover:border-green-500 transition-all bg-white shadow-sm group"
                                >
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Choose Background</span>
                                    <div className="w-full flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {background.thumbnail ? (
                                                <img src={background.thumbnail} className="w-6 h-6 rounded border border-gray-100 object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded border border-gray-100 bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-400">Ø</div>
                                            )}
                                            <span className="text-sm font-bold text-gray-900">{background.name}</span>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>

                                {voice.id !== 'voiceless' && (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">App Name</span>
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-gray-200 p-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none rounded-xl font-bold shadow-sm"
                                                placeholder="e.g. TrustMRR"
                                                value={appName}
                                                onChange={(e) => setAppName(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">App Description</span>
                                            <textarea 
                                                className="w-full bg-white border border-gray-200 p-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none rounded-xl font-medium shadow-sm min-h-[120px] resize-none"
                                                placeholder="What does your app do?"
                                                value={appDescription}
                                                onChange={(e) => setAppDescription(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                     )}

                     {activeSelection === 'voice' && (
                         <div className="p-4 space-y-2 animate-fade-in">
                             {VOICES.map(v => (
                                 <button
                                    key={v.id}
                                    onClick={() => { setVoice(v); setActiveSelection('main'); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm border rounded-xl transition-all ${voice.id === v.id ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                 >
                                     <span className="font-bold">{v.name}</span>
                                     {VOICE_SAMPLES[v.id] && (
                                         <div onClick={(e) => toggleVoiceSample(e, v.id)} className={`p-1.5 rounded-full ${playingVoiceId === v.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                         </div>
                                     )}
                                 </button>
                             ))}
                         </div>
                     )}

                     {activeSelection === 'background' && (
                         <div className="p-4 grid grid-cols-2 gap-3 animate-fade-in">
                             {backgroundOptions.map(bg => (
                                 <button
                                    key={bg.id}
                                    onClick={() => { setBackground(bg); setActiveSelection('main'); }}
                                    className={`flex flex-col gap-2 p-2 border rounded-xl transition-all ${background.id === bg.id ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                 >
                                     {bg.thumbnail ? (
                                         <img src={bg.thumbnail} className="w-full aspect-video object-cover rounded-lg shadow-inner" />
                                     ) : (
                                         <div className="w-full aspect-video rounded-lg shadow-inner bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 text-[10px] font-bold">
                                             NONE
                                         </div>
                                     )}
                                     <span className="text-[10px] font-bold text-gray-900 truncate px-1">{bg.name}</span>
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>

                 <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50 pb-safe">
                     {(!isDurationValid || errorMessage || outOfCredits) && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start animate-fade-in">
                             <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             <p className="text-[11px] font-bold text-red-700 leading-tight">
                                {outOfCredits 
                                    ? "You don't have enough credits to create demos. Please top up to continue the generation process." 
                                    : (errorMessage || "The video's duration exceeds the required amount.")}
                             </p>
                        </div>
                     )}
                     <button 
                        onClick={triggerGenerate}
                        disabled={!session || !isDurationValid || !isConfigComplete || outOfCredits}
                        className="w-full py-4 bg-green-600 text-white text-base font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg transform active:scale-[0.98]"
                    >
                        Generate Demo
                    </button>
                    {profile && (
                        <button 
                            onClick={() => window.location.hash = '#/pricing'} 
                            className="block w-full mt-4 text-center text-xs font-bold text-gray-500 hover:text-green-600"
                        >
                            Get credits
                        </button>
                    )}
                 </div>
             </div>

             {showAdvancedEditor && videoUrl && (
                 <AdvancedEditorModal 
                    videoUrl={videoUrl}
                    initialSegments={segments}
                    duration={trim.end === 0 ? 1 : trim.end}
                    onClose={() => setShowAdvancedEditor(false)}
                    onSave={(newSegments) => {
                        setSegments(newSegments);
                        setShowAdvancedEditor(false);
                    }}
                 />
             )}
        </div>
    );
};
