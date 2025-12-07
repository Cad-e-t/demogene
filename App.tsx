
import React, { useState, useEffect } from 'react';
import { VideoCropper } from './components/VideoCropper';
import { ProcessingStatus, CropData, TrimData, AnalysisResult, VoiceOption } from './types';
import { VOICES } from './constants';
import { processVideoRequest } from './api';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// X (Twitter) Icon Component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

interface VideoProject {
    id: string;
    title: string;
    final_video_url: string;
    created_at: string;
    status: string;
    voice_id: string;
    analysis_result: AnalysisResult;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'videos'>('home');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<ProcessingStatus['step']>('idle');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 1, height: 1 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [voice, setVoice] = useState<VoiceOption>(VOICES[0]);
  
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // Gallery State
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoProject | null>(null);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If user logs in while modal is open, close it
      if (session) setShowAuthModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
        await supabase.auth.signInWithOAuth({
            provider: 'twitter',
        });
    } catch (error) {
        console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setCurrentView('home');
      setVideos([]);
  };

  const fetchVideos = async () => {
    if (!session?.user) return;
    
    try {
        // Fetch directly from Supabase using RLS
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setVideos(data || []);
    } catch(e) {
        console.error("Failed to fetch videos", e);
    }
  };

  useEffect(() => {
    if (currentView === 'videos' && session) {
        fetchVideos();
    }
  }, [currentView, session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      
      if (!session) {
        // If not logged in, show video but immediately trigger modal
        setShowAuthModal(true);
        // Do not set step to 'uploading' yet, wait for login
      } else {
        setStep('uploading'); 
      }
    }
  };

  // Re-check upload step if session changes
  useEffect(() => {
      if (session && file && step === 'idle') {
          setStep('uploading');
      }
  }, [session, file, step]);

  const handleGenerate = async () => {
    if (!file || !session) return;
    setStep('analyzing');

    try {
        const { videoUrl: url, analysis } = await processVideoRequest(
            file, 
            crop,
            trim,
            voice.id,
            session.user.id, // Pass User ID
            (s) => setStep(s)
        );

        setResult(analysis);
        setFinalVideoUrl(url);

    } catch (e) {
      console.error(e);
      setStep('error');
    }
  };

  // Components for Layout
  const SidebarIcon = ({ 
    active, 
    onClick, 
    label, 
    path 
  }: { active: boolean, onClick: () => void, label: string, path: React.ReactNode }) => (
    <button 
        onClick={onClick}
        className={`group relative w-full h-16 flex items-center justify-center transition-colors ${active ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
    >
        {path}
        <div className="absolute left-full top-0 h-full bg-gray-900 border-l border-r border-gray-800 flex items-center overflow-hidden w-0 group-hover:w-32 transition-all duration-300 z-50">
             <span className="pl-4 whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {label}
             </span>
        </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Narrow Sidebar - ONLY VISIBLE IF LOGGED IN */}
      {session && (
        <aside className="fixed top-0 left-0 bottom-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center z-50">
             {/* Logo */}
             <div className="h-16 w-full flex items-center justify-center border-b border-gray-800 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
             </div>

             {/* Navigation Icons */}
             <div className="w-full flex flex-col gap-2">
                <SidebarIcon 
                    active={currentView === 'home'} 
                    onClick={() => setCurrentView('home')} 
                    label="Home"
                    path={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    }
                />
                <SidebarIcon 
                    active={currentView === 'videos'} 
                    onClick={() => setCurrentView('videos')} 
                    label="Videos"
                    path={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    }
                />
             </div>
             
             <div className="mt-auto mb-4">
                 <button onClick={handleLogout} className="text-gray-500 hover:text-white" title="Logout">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                     </svg>
                 </button>
             </div>
        </aside>
      )}

      {/* Top Right Auth Button (Only if NOT logged in) */}
      {!session && (
          <div className="absolute top-6 right-8 z-50">
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition shadow-lg"
              >
                  <XIcon className="w-4 h-4" />
                  <span>Sign in</span>
              </button>
          </div>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${session ? 'ml-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
        {/* VIEW: HOME */}
        {currentView === 'home' && (
            <>
                {step === 'idle' && !file ? (
                <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-fade-in relative">
                    <div className="space-y-4 max-w-2xl">
                    <h2 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                        Turn Screen Recordings into <span className="text-indigo-400">Polished Demos</span>
                    </h2>
                    <p className="text-xl text-gray-400">
                        AI-powered cropping, zooming, scripting, and voiceovers. 
                        Upload raw footage, get a launch-ready video.
                    </p>
                    </div>

                    <label className="group relative cursor-pointer z-10">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center gap-3 px-8 py-4 bg-gray-900 ring-1 ring-gray-800 rounded-xl leading-none hover:bg-gray-800 transition">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-semibold text-lg">Upload Video</span>
                    </div>
                    <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                </div>
                ) : (
                <div className="grid lg:grid-cols-3 gap-8 relative">
                    
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1 overflow-hidden">
                        {(step === 'uploading' || (file && !session)) ? (
                        <div className="relative">
                            <VideoCropper 
                                videoUrl={videoUrl!} 
                                onCropChange={setCrop}
                                onTrimChange={setTrim}
                            />
                            
                            {/* AUTH MODAL OVERLAY */}
                            {showAuthModal && (
                                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                    <h3 className="text-2xl font-bold text-white mb-2">Login Required</h3>
                                    <p className="text-gray-400 mb-6 max-w-sm">Please sign in to process your video with our AI pipeline.</p>
                                    <button 
                                        onClick={handleLogin}
                                        className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition shadow-xl transform hover:scale-105"
                                    >
                                        <XIcon className="w-5 h-5" />
                                        <span>Sign in with X</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        ) : (
                            // During processing/result
                            <div className="aspect-video bg-black flex items-center justify-center rounded-xl relative overflow-hidden">
                                {finalVideoUrl ? (
                                    <video src={finalVideoUrl} controls className="w-full h-full" />
                                ) : (
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        {step !== 'error' && <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
                                        <p className="text-indigo-300 font-medium">
                                            {step === 'analyzing' && 'Analyzing visual content...'}
                                            {step === 'generating_audio' && 'Generating AI Voiceover...'}
                                            {step === 'rendering' && 'Rendering final video...'}
                                            {step === 'error' && 'Processing Failed'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Script Preview */}
                    {result && result.script && result.script.script_lines.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Generated Script
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {result.script.script_lines.map((line, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 rounded-lg hover:bg-gray-800 transition">
                                        <span className={`text-xs font-bold uppercase tracking-wider py-1 px-2 rounded h-fit ${
                                            line.type === 'hook' ? 'bg-purple-500/20 text-purple-300' :
                                            line.type === 'cta' ? 'bg-green-500/20 text-green-300' :
                                            'bg-blue-500/20 text-blue-300'
                                        }`}>
                                            {line.type}
                                        </span>
                                        <p className="text-gray-300 leading-relaxed">{line.narration}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Right Column: Settings & Actions */}
                    <div className="space-y-6">
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8 transition-opacity ${showAuthModal ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <h3 className="font-semibold text-lg mb-6">Configuration</h3>
                        
                        {/* Voice Selector */}
                        <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Narrator Voice</label>
                        <div className="grid grid-cols-1 gap-2">
                            {VOICES.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setVoice(v)}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                voice.id === v.id 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                }`}
                            >
                                <span className="font-medium">{v.name}</span>
                                <span className="text-xs opacity-60">{v.gender}</span>
                            </button>
                            ))}
                        </div>
                        </div>

                        {/* Processing Status Steps */}
                        {step !== 'uploading' && step !== 'error' && step !== 'idle' && (
                            <div className="mb-8 space-y-3">
                                <div className={`flex items-center gap-3 ${step === 'analyzing' ? 'text-indigo-400' : 'text-green-500'}`}>
                                    {step === 'analyzing' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : "✓"}
                                    <span className="text-sm font-medium">Analyzing Video (Gemini)</span>
                                </div>
                                <div className={`flex items-center gap-3 ${step === 'generating_audio' ? 'text-indigo-400' : (['rendering', 'complete'].includes(step) ? 'text-green-500' : 'text-gray-600')}`}>
                                    {step === 'generating_audio' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (['rendering', 'complete'].includes(step) ? "✓" : "-")}
                                    <span className="text-sm font-medium">Generating Voiceover</span>
                                </div>
                                <div className={`flex items-center gap-3 ${step === 'rendering' ? 'text-indigo-400' : (step === 'complete' ? 'text-green-500' : 'text-gray-600')}`}>
                                    {step === 'rendering' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (step === 'complete' ? "✓" : "-")}
                                    <span className="text-sm font-medium">Visual Processing (FFmpeg)</span>
                                </div>
                            </div>
                        )}
                        
                        {step === 'error' && (
                            <div className="mb-8 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200">
                                Error processing video. Please try again.
                            </div>
                        )}

                        {/* Primary Action */}
                        {step === 'uploading' && (
                            <button 
                                onClick={handleGenerate}
                                disabled={!session}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Demo Video
                            </button>
                        )}
                        
                        {step === 'complete' && (
                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition"
                            >
                                Start New Project
                            </button>
                        )}
                        
                        {step === 'error' && (
                            <button 
                                onClick={() => setStep('uploading')}
                                className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition"
                            >
                                Try Again
                            </button>
                        )}

                    </div>
                    </div>
                </div>
                )}
            </>
        )}

        {/* VIEW: VIDEOS (GALLERY) */}
        {currentView === 'videos' && (
            <div className="space-y-8 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-white">Your Videos</h2>
                    <button onClick={fetchVideos} className="text-sm text-gray-400 hover:text-white">Refresh</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((vid) => (
                        <div 
                            key={vid.id} 
                            onClick={() => setSelectedVideo(vid)}
                            className="group bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                        >
                            {/* Thumbnail area (Video Preview) */}
                            <div className="aspect-video bg-black relative">
                                <video 
                                    src={vid.final_video_url} 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    muted 
                                    onMouseOver={e => e.currentTarget.play()}
                                    onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-medium text-white">
                                    {vid.voice_id === 'voiceless' ? 'No Voice' : 'Narrated'}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-lg text-white mb-1 truncate">{vid.title}</h3>
                                <p className="text-xs text-gray-500">
                                    {new Date(vid.created_at).toLocaleDateString()} at {new Date(vid.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}
                    {videos.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            No videos created yet. Go to Home to create one!
                        </div>
                    )}
                </div>
            </div>
        )}
        </div>
      </main>

      {/* MODAL FOR VIDEO DETAILS */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedVideo(null)}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex-1 bg-black flex items-center justify-center">
                    <video src={selectedVideo.final_video_url} controls className="w-full max-h-[60vh] md:max-h-full" />
                </div>
                <div className="w-full md:w-96 p-6 border-l border-gray-800 overflow-y-auto bg-gray-900">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-xl leading-tight">{selectedVideo.title}</h3>
                        <button onClick={() => setSelectedVideo(null)} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Analysis</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded border border-indigo-800">
                                    {selectedVideo.voice_id}
                                </span>
                                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                                    {selectedVideo.analysis_result.segments.length} Segments
                                </span>
                            </div>
                        </div>

                        {selectedVideo.analysis_result.script && selectedVideo.analysis_result.script.script_lines.length > 0 ? (
                             <div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Script</span>
                                <div className="mt-2 space-y-3">
                                    {selectedVideo.analysis_result.script.script_lines.map((line, i) => (
                                        <p key={i} className="text-sm text-gray-300">
                                            <span className="opacity-50 mr-2">[{line.type}]</span>
                                            {line.narration}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-800/30 rounded border border-gray-800 text-sm text-gray-400 italic text-center">
                                Voiceless demo. No script generated.
                            </div>
                        )}
                        
                        <a 
                            href={selectedVideo.final_video_url} 
                            download 
                            className="block w-full py-3 bg-white text-black font-bold text-center rounded-lg hover:bg-gray-200 transition"
                        >
                            Download Video
                        </a>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
