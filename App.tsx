
import React, { useState, useEffect, useRef } from 'react';
import { VideoCropper } from './components/VideoCropper';
import { ProcessingStatus, CropData, TrimData, AnalysisResult, VoiceOption } from './types';
import { VOICES } from './constants';
import { processVideoRequest, createCheckoutSession } from './api';
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

interface UserProfile {
    id: string;
    credits: number;
}

const PRODUCT_10_DEMOS = "pdt_rY1vFirO50yP5g1VyjfT6" // "pdt_2LwDVRweVv9iX22U5RDSW"; // Use real ID in prod

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [currentView, setCurrentView] = useState<'home' | 'videos'>('home');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<ProcessingStatus['step']>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 1, height: 1 });
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [voice, setVoice] = useState<VoiceOption>(VOICES[0]);
  
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // Gallery State
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoProject | null>(null);
  
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // --- Auth & Profile ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          setShowAuthModal(false);
          fetchProfile(session.user.id);
      } else {
          setProfile(null);
      }
    });

    // Check URL for Payment Success
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_status') === 'success') {
        // Clear param to avoid refresh loop issues or stale state visual
        window.history.replaceState({}, document.title, window.location.pathname);
        if (session) fetchProfile(session.user.id);
        alert("Payment Successful! Credits added.");
    }

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
          setProfile(data);
      } else if (error && error.code === 'PGRST116') {
           // No profile? Should handle by trigger, but just in case
           setProfile({ id: userId, credits: 0 });
      }
  };

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
      setProfile(null);
  };

  const fetchVideos = async () => {
    if (!session?.user) return;
    try {
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

  // --- File Handling ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      
      if (!session) {
        setShowAuthModal(true);
      } else {
        setStep('uploading'); 
      }
    }
  };

  useEffect(() => {
      if (session && file && step === 'idle') {
          setStep('uploading');
      }
  }, [session, file, step]);

  // --- Generation Logic ---

  const handleGenerate = async () => {
    if (!file || !session) return;

    // Client-side Validation
    const duration = trim.end - trim.start;
    if (duration > 90) {
        setErrorMessage("Video selection must be 90 seconds or less. Please trim.");
        setStep('error');
        return;
    }

    // Credits check before call (UX only, server double checks)
    if (profile && profile.credits < 1) {
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    setStep('analyzing');
    setErrorMessage(null);

    try {
        const { videoUrl: url, analysis } = await processVideoRequest(
            file, 
            crop,
            trim,
            voice.id,
            session.user.id, 
            (s) => setStep(s)
        );

        setResult(analysis);
        setFinalVideoUrl(url);
        // Refresh credits after success
        fetchProfile(session.user.id);

    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "An unexpected error occurred.");
      setStep('error');
    }
  };

  // --- Payment ---
  const handlePurchase = async () => {
      try {
          const { checkout_url } = await createCheckoutSession(PRODUCT_10_DEMOS);
          window.location.href = checkout_url;
      } catch (e) {
          console.error(e);
          alert("Failed to initiate checkout");
      }
  };

  // --- Components ---
  const SidebarIcon = ({ active, onClick, label, path }: any) => (
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
      
      {/* Sidebar */}
      {session && (
        <aside className="fixed top-0 left-0 bottom-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center z-50">
             <div className="h-16 w-full flex items-center justify-center border-b border-gray-800 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
             </div>
             <div className="w-full flex flex-col gap-2">
                <SidebarIcon 
                    active={currentView === 'home'} 
                    onClick={() => setCurrentView('home')} 
                    label="Home"
                    path={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                />
                <SidebarIcon 
                    active={currentView === 'videos'} 
                    onClick={() => setCurrentView('videos')} 
                    label="Videos"
                    path={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                />
             </div>
             <div className="mt-auto mb-4">
                 <button onClick={handleLogout} className="text-gray-500 hover:text-white" title="Logout">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 </button>
             </div>
        </aside>
      )}

      {/* Auth Button */}
      {!session && (
          <div className="absolute top-6 right-8 z-50">
              <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition shadow-lg">
                  <XIcon className="w-4 h-4" /><span>Sign in</span>
              </button>
          </div>
      )}

      {/* Main */}
      <main className={`transition-all duration-300 ${session ? 'ml-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
        
        {/* VIEW: HOME */}
        {currentView === 'home' && (
            <>
                {step === 'idle' && !file ? (
                <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 animate-fade-in">
                    
                    {/* Hero */}
                    <div className="space-y-4 max-w-2xl text-center">
                        <h2 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                            Turn Screen Recordings into <span className="text-indigo-400">Polished Demos</span>
                        </h2>
                        <p className="text-xl text-gray-400">
                            AI-powered cropping, zooming, scripting, and voiceovers. 
                            Upload raw footage, get a launch-ready video.
                        </p>
                        
                        <div className="pt-4">
                            <label className="group relative cursor-pointer z-10 inline-block">
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
                    </div>

                    {/* Payment / Credits Section (Below Hero) */}
                    <div ref={paymentSectionRef} className="w-full max-w-4xl mx-auto">
                        {session && profile ? (
                            profile.credits > 0 ? (
                                <div className="bg-gray-900 border border-green-900/50 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-green-900/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 font-bold text-xl">
                                            {profile.credits}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Credits Available</h3>
                                            <p className="text-gray-400 text-sm">You're ready to create.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handlePurchase}
                                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                                    >
                                        Add More (+10)
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-8 text-center relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-3 opacity-10">
                                         <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39h-2.07c-.12-.9-.9-1.54-2.34-1.54-1.3 0-1.87.61-1.87 1.37 0 .84.62 1.55 2.69 2.05 2.49.59 4.17 1.66 4.17 3.67 0 1.74-1.41 2.85-3.14 3.2z"/></svg>
                                     </div>
                                     <h3 className="text-2xl font-bold text-white mb-2">Out of Credits</h3>
                                     <p className="text-indigo-200 mb-6 max-w-lg mx-auto">
                                         Purchase a pack to start generating professional demos. <br/>
                                         <span className="font-semibold text-white">Less than the price of a coffee.</span>
                                     </p>
                                     <div className="inline-block bg-gray-900/80 backdrop-blur border border-indigo-500/50 rounded-xl p-6 hover:border-indigo-400 transition cursor-pointer transform hover:scale-105" onClick={handlePurchase}>
                                         <div className="text-3xl font-bold text-white mb-1">$3.00</div>
                                         <div className="text-indigo-300 font-medium">for 10 Demos</div>
                                         <button className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold">Purchase Now</button>
                                     </div>
                                </div>
                            )
                        ) : null}
                    </div>

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
                            
                            {/* Validation Warning */}
                            {trim.end - trim.start > 90 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-30">
                                    Video must be &le; 90s. Current: {(trim.end - trim.start).toFixed(1)}s
                                </div>
                            )}

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

                    {/* Right Column: Settings */}
                    <div className="space-y-6">
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8 transition-opacity ${showAuthModal ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-semibold text-lg">Configuration</h3>
                             {profile && (
                                 <span className={`text-xs font-bold px-2 py-1 rounded ${profile.credits > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                     {profile.credits} Credits
                                 </span>
                             )}
                        </div>
                        
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

                        {/* Status */}
                        {step !== 'uploading' && step !== 'error' && step !== 'idle' && (
                            <div className="mb-8 space-y-3">
                                <div className={`flex items-center gap-3 ${step === 'analyzing' ? 'text-indigo-400' : 'text-green-500'}`}>
                                    {step === 'analyzing' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : "✓"}
                                    <span className="text-sm font-medium">Analyzing Video</span>
                                </div>
                                {/* ... other steps same as before ... */}
                                <div className={`flex items-center gap-3 ${step === 'generating_audio' ? 'text-indigo-400' : (['rendering', 'complete'].includes(step) ? 'text-green-500' : 'text-gray-600')}`}>
                                    {step === 'generating_audio' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (['rendering', 'complete'].includes(step) ? "✓" : "-")}
                                    <span className="text-sm font-medium">Voiceover</span>
                                </div>
                                <div className={`flex items-center gap-3 ${step === 'rendering' ? 'text-indigo-400' : (step === 'complete' ? 'text-green-500' : 'text-gray-600')}`}>
                                    {step === 'rendering' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (step === 'complete' ? "✓" : "-")}
                                    <span className="text-sm font-medium">Processing</span>
                                </div>
                            </div>
                        )}
                        
                        {step === 'error' && (
                            <div className="mb-8 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
                                {errorMessage || "Error processing video. Please try again."}
                            </div>
                        )}

                        {step === 'uploading' && (
                            <div className="space-y-3">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={!session || (trim.end - trim.start > 90)}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Generate Demo Video
                                </button>
                                {profile && profile.credits < 1 && (
                                    <p className="text-xs text-center text-red-400">0 Credits. Payment required.</p>
                                )}
                            </div>
                        )}

                        {step === 'complete' && (
                             <button onClick={() => window.location.reload()} className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition">Start New Project</button>
                        )}
                         {step === 'error' && (
                            <button onClick={() => { setStep('uploading'); setErrorMessage(null); }} className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition">Try Again</button>
                        )}
                    </div>

                    {/* Payment Section (Also here in editing view if 0 credits) */}
                    <div ref={paymentSectionRef}>
                        {profile && profile.credits < 1 && (
                            <div className="mt-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6 text-center">
                                 <h4 className="font-bold text-white mb-2">Need Credits?</h4>
                                 <p className="text-sm text-gray-400 mb-4">$3 for 10 Demos</p>
                                 <button onClick={handlePurchase} className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">Purchase Pack</button>
                            </div>
                        )}
                    </div>

                    </div>
                </div>
                )}
            </>
        )}

        {/* VIEW: VIDEOS */}
        {currentView === 'videos' && (
            <div className="space-y-8 animate-fade-in">
                {/* Same as before... */}
                 <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-white">Your Videos</h2>
                    <button onClick={fetchVideos} className="text-sm text-gray-400 hover:text-white">Refresh</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((vid) => (
                        <div key={vid.id} onClick={() => setSelectedVideo(vid)} className="group bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                            <div className="aspect-video bg-black relative">
                                <video src={vid.final_video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted onMouseOver={e => e.currentTarget.play()} onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}/>
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-medium text-white">{vid.voice_id === 'voiceless' ? 'No Voice' : 'Narrated'}</div>
                            </div>
                            <div className="p-4"><h3 className="font-semibold text-lg text-white mb-1 truncate">{vid.title}</h3><p className="text-xs text-gray-500">{new Date(vid.created_at).toLocaleDateString()}</p></div>
                        </div>
                    ))}
                    {videos.length === 0 && <div className="col-span-full py-20 text-center text-gray-500">No videos created yet.</div>}
                </div>
            </div>
        )}
        </div>
      </main>

      {/* MODAL */}
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
                    {/* ... details ... */}
                     <a href={selectedVideo.final_video_url} download className="block w-full py-3 bg-white text-black font-bold text-center rounded-lg hover:bg-gray-200 transition">Download Video</a>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
