
import React, { useRef, useState, useEffect } from 'react';
import { VideoCropper } from './VideoCropper';
import { AdvancedEditorModal } from './AdvancedEditorModal';
import { LandingPage } from './LandingPage';
import { CropData, TrimData, VoiceOption, TimeRange } from '../types';
import { VOICES } from '../constants';
import { VOICE_SAMPLES } from '../voiceSamples';

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
    onGenerate: (segments?: TimeRange[]) => void;
    onPurchase: () => void;
    
    showAuthModal: boolean;
    handleLogin: () => void;
    
    showSuccessNotification: boolean;
    setShowSuccessNotification: (b: boolean) => void;
    showFailureNotification: boolean;
    setShowFailureNotification: (b: boolean) => void;
    
    errorMessage: string | null;
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
    errorMessage
}) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const duration = trim.end - trim.start; // This is naive duration if no advanced edits
    
    // Advanced Editing State
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    const [segments, setSegments] = useState<TimeRange[] | null>(null);

    // Calc effective duration based on segments if present
    const effectiveDuration = segments 
        ? segments.reduce((acc, s) => acc + (s.end - s.start), 0)
        : duration;

    const isDurationValid = effectiveDuration <= 180;

    // Mobile Editor State
    const [mobileTab, setMobileTab] = useState<'preview' | 'settings'>('preview');

    const handleClear = () => {
        setSegments(null);
        onClearFile();
    };

    const triggerGenerate = () => {
        // Pass segments if they exist, otherwise backend will use trim
        onGenerate(segments || undefined);
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

    // --- CASE 1: NO FILE SELECTED ---
    if (!file) {
        // Sub-case: Not Logged In -> Show Full Landing Page
        if (!session) {
            return (
                <LandingPage 
                    onFileChange={onFileChange} 
                    handleLogin={handleLogin} 
                />
            );
        }

        // Sub-case: Logged In -> Show Dashboard Upload State
        return (
            <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 md:p-12 overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                {/* Content Container - Responsive Layout */}
                <div className={`relative z-10 w-full animate-fade-in ${profile && profile.credits < 1 ? 'max-w-6xl' : 'max-w-3xl'} mx-auto`}>
                    
                    <div className={`flex flex-col gap-12 md:gap-20 ${profile && profile.credits < 1 ? 'md:flex-row md:items-center md:justify-between' : 'items-center text-center'}`}>
                        
                        {/* Main Upload Content */}
                        <div className={`flex-1 space-y-10 ${profile && profile.credits < 1 ? 'text-center md:text-left' : 'text-center'}`}>
                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight">Create New Demo</h1>
                                <p className={`text-xl text-gray-600 leading-relaxed font-medium ${profile && profile.credits < 1 ? 'max-w-xl mx-auto md:mx-0' : 'max-w-xl mx-auto'}`}>
                                    Upload a new screen recording to start the generation process. 
                                    Make sure your recording is clear and under 3 minutes.
                                </p>
                            </div>

                            <div className={`flex ${profile && profile.credits < 1 ? 'justify-center md:justify-start' : 'justify-center'}`}>
                                <label className="group relative cursor-pointer inline-block transform hover:scale-[1.02] transition-transform duration-200">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                                    <div className="relative flex items-center justify-center gap-4 px-10 py-6 md:px-12 md:py-8 bg-white border border-gray-200 text-gray-900 rounded-2xl hover:border-green-300 transition shadow-xl">
                                        <div className="p-3 bg-green-50 rounded-full text-green-600">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-2xl">Select Recording</span>
                                    </div>
                                    <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                                </label>
                            </div>

                            {/* Credit Status for Users who HAVE credits */}
                            {profile && profile.credits >= 1 && (
                                <div className="pt-4">
                                    <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        {profile.credits} Demo Credits Remaining
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Side Panel: Pricing Card for Users with 0 credits */}
                        {profile && profile.credits < 1 && (
                             <div className="flex flex-col items-center md:items-start gap-6 animate-fade-in w-full max-w-sm mx-auto md:mx-0 shrink-0">
                                 <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-1.5 rounded-full border border-red-200">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    You are out of credits
                                 </div>
                                 
                                 <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm w-full text-center md:text-left">
                                    <button 
                                        onClick={onPurchase} 
                                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-xl hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mb-6"
                                    >
                                        Get a demo for $9
                                    </button>
                                    
                                    <div className="space-y-4 text-sm text-gray-600 font-medium">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-1 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">✓</span>
                                            <p><span className="text-green-600 font-bold">+2 bonus demos</span> on your first purchase</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="mt-1 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">✓</span>
                                            <p><span className="text-gray-900 font-bold">+1 bonus demo</span> on future purchases</p>
                                        </div>
                                        <p className="text-gray-400 italic text-xs pt-2">Test different angles and pick the best version.</p>
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-wider font-bold">
                                           Script, pacing, zooms, and editing are automatically applied to turn your raw screen recording into a finished product demo.
                                        </p>
                                    </div>
                                 </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Success Notification */}
                {showSuccessNotification && (
                    <div className="fixed bottom-8 right-8 bg-green-900 border border-green-700 rounded-xl p-4 flex items-center gap-4 shadow-xl z-50 animate-fade-in">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 shrink-0">✓</div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Payment Successful</h3>
                            <p className="text-green-200/80 text-xs">Credits have been added to your account.</p>
                        </div>
                        <button onClick={() => setShowSuccessNotification(false)} className="ml-auto text-gray-400 hover:text-white">✕</button>
                    </div>
                )}

                {/* Failure Notification */}
                {showFailureNotification && (
                    <div className="fixed bottom-8 right-8 bg-red-900 border border-red-700 rounded-xl p-4 flex items-center gap-4 shadow-xl z-50 animate-fade-in">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 shrink-0">✕</div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Payment Failed</h3>
                            <p className="text-red-200/80 text-xs">Please try again and ensure your transaction details are correct.</p>
                        </div>
                        <button onClick={() => setShowFailureNotification(false)} className="ml-auto text-gray-400 hover:text-white">✕</button>
                    </div>
                )}
            </div>
        );
    }

    // --- CASE 2: EDITOR VIEW (File Selected) ---
    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans overflow-hidden">
             
             {/* HEADER BAR (Mobile Only) */}
             <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-20">
                 <button 
                     onClick={handleClear}
                     className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                 </button>
                 <span className="text-xs font-bold text-gray-400 truncate max-w-[150px] uppercase tracking-wider">{file?.name}</span>
                 <div className="w-10"></div>
             </div>

             {/* BOTTOM TAB NAV (Mobile Only) */}
             <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 flex items-center justify-center px-6 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                 <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200 w-full">
                     <button 
                        onClick={() => setMobileTab('preview')}
                        className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${mobileTab === 'preview' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
                     >
                        Preview
                     </button>
                     <button 
                        onClick={() => setMobileTab('settings')}
                        className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${mobileTab === 'settings' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
                     >
                        Continue
                     </button>
                 </div>
             </div>

             {/* LEFT PANEL: Video Canvas Area */}
             <div className={`flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0 ${mobileTab === 'settings' ? 'hidden md:flex' : 'flex'}`}>
                 
                 {/* Desktop Toolbar */}
                 <div className="hidden md:flex h-14 border-b border-gray-200 items-center justify-between px-6 bg-white flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
                            title="Close Project"
                        >
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <span className="text-sm font-bold text-gray-900 truncate max-w-md">{file?.name}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-500 flex items-center gap-2 font-bold">
                        {segments && (
                            <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded">Advanced Edits Applied</span>
                        )}
                        <span>{effectiveDuration.toFixed(1)}s Total</span>
                    </div>
                 </div>

                 {/* Canvas Content */}
                 <div className="flex-1 bg-gray-50/80 relative flex flex-col min-h-0 items-center justify-center p-8 border-r border-gray-200">
                      {videoUrl && (
                          <div className="relative w-full h-full flex flex-col items-center">
                              {/* Video Player Wrapper */}
                              <div className="flex-1 w-full flex items-center justify-center min-h-0 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden">
                                  <VideoCropper 
                                     videoUrl={videoUrl}
                                     onCropChange={setCrop}
                                     onTrimChange={setTrim}
                                     onAdvancedEdit={() => setShowAdvancedEditor(true)}
                                     hideTimeline={true}
                                     segments={segments || undefined}
                                  />
                              </div>

                              {/* Action Bar (Below Video) */}
                              <div className="w-full flex justify-center py-6 shrink-0">
                                  <button 
                                      onClick={() => setShowAdvancedEditor(true)}
                                      className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                  >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                      Trim Video
                                  </button>
                              </div>
                          </div>
                      )}
                      
                      {/* Floating Warning */}
                      {!isDurationValid && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-6 py-3 rounded-full text-xs font-bold shadow-xl z-30 text-center max-w-[90%] md:max-w-md border border-red-200">
                                Video exceeds 3m limit. Please use the "Edit Video" tool to trim and clip unwanted parts.
                            </div>
                      )}
                 </div>

                 {/* Auth Modal Overlay */}
                 {showAuthModal && (
                    <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
                        <p className="text-gray-500 mb-6 text-sm font-medium">Sign in to process your video.</p>
                        <button 
                            onClick={handleLogin}
                            className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition"
                        >
                            <span>Sign in</span>
                        </button>
                    </div>
                 )}
             </div>

             {/* RIGHT PANEL: Settings Sidebar */}
             <div className={`w-full md:w-80 md:border-l border-gray-200 bg-white flex flex-col z-10 flex-shrink-0 pb-20 md:pb-0 ${mobileTab === 'preview' ? 'hidden md:flex' : 'flex h-full'}`}>
                 
                 <div className="h-14 border-b border-gray-200 flex items-center px-6 flex-shrink-0 bg-gray-50/50">
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configuration</h3>
                     <div className="ml-auto">
                         {profile && (
                            <span className={`text-[10px] font-mono border px-2 py-1 rounded font-bold ${profile.credits > 0 ? 'text-gray-500 border-gray-200 bg-white' : 'text-red-500 border-red-200 bg-red-50'}`}>
                                {profile.credits} CREDITS
                            </span>
                         )}
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                     {/* Voice Selector */}
                     <div className="space-y-3">
                         <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Voice</label>
                         <div className="space-y-1">
                             {VOICES.map(v => (
                                 <button
                                    key={v.id}
                                    onClick={() => setVoice(v)}
                                    className={`w-full flex items-center justify-between px-3 py-3 md:py-2.5 text-sm border rounded-lg transition-all duration-200 group relative ${
                                        voice.id === v.id
                                        ? 'bg-green-50 text-green-800 border-green-500 shadow-sm ring-1 ring-green-500'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                 >
                                     <span className="font-bold">{v.name}</span>
                                     {VOICE_SAMPLES[v.id] && (
                                         <button 
                                            onClick={(e) => toggleVoiceSample(e, v.id)}
                                            className={`p-1.5 rounded-full transition-colors ${playingVoiceId === v.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                                            title="Preview Sample"
                                         >
                                            {playingVoiceId === v.id ? (
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                            ) : (
                                                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            )}
                                         </button>
                                     )}
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* App Name and Description Input */}
                     {voice.id !== 'voiceless' && (
                        <>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex justify-between">
                                    App Name<span className="text-green-600">*</span>
                                </label>
                                <input 
                                    type="text"
                                    className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all rounded-md placeholder-gray-400 font-medium"
                                    placeholder="e.g. TrustMRR"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex justify-between">
                                    App Description<span className="text-green-600">*</span>
                                </label>
                                <textarea 
                                    className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all min-h-[140px] resize-none placeholder-gray-400 leading-relaxed rounded-md font-medium"
                                    placeholder="Supabase is a Postgres..."
                                    value={appDescription}
                                    onChange={(e) => setAppDescription(e.target.value)}
                                />
                            </div>
                        </>
                     )}

                     {errorMessage && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded font-medium">
                            {errorMessage}
                        </div>
                     )}
                 </div>

                 <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50 pb-safe">
                     <button 
                        onClick={triggerGenerate}
                        disabled={!session || !isDurationValid}
                        className="w-full py-4 bg-green-600 text-white text-base font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 transform active:scale-[0.98]"
                    >
                        Generate Demo
                    </button>
                    {profile && profile.credits < 1 && (
                        <button onClick={onPurchase} className="block w-full mt-4 text-center text-xs font-bold text-gray-500 hover:text-green-600 transition-colors">
                            Get a demo for $9 (+bonus)
                        </button>
                    )}
                 </div>
             </div>

             {/* Advanced Editor Modal */}
             {showAdvancedEditor && videoUrl && (
                 <AdvancedEditorModal 
                    videoUrl={videoUrl}
                    initialSegments={segments}
                    duration={trim.end === 0 ? 1 : trim.end} // Fallback
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
