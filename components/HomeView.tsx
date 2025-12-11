import React, { useRef, useState } from 'react';
import { VideoCropper } from './VideoCropper';
import { CropData, TrimData, VoiceOption } from '../types';
import { VOICES } from '../constants';

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
    appDescription: string;
    setAppDescription: (s: string) => void;
    
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    onGenerate: () => void;
    onPurchase: () => void;
    
    showAuthModal: boolean;
    handleLogin: () => void;
    
    showSuccessNotification: boolean;
    setShowSuccessNotification: (b: boolean) => void;
    
    errorMessage: string | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
    file, videoUrl, session, profile,
    crop, setCrop, trim, setTrim,
    voice, setVoice, appDescription, setAppDescription,
    onFileChange, onClearFile, onGenerate, onPurchase,
    showAuthModal, handleLogin,
    showSuccessNotification, setShowSuccessNotification,
    errorMessage
}) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const duration = trim.end - trim.start;
    const isDurationValid = duration <= 90;

    // Mobile Editor State
    const [mobileTab, setMobileTab] = useState<'preview' | 'settings'>('preview');

    // --- LANDING PAGE VIEW (No File Selected) ---
    if (!file) {
        return (
            <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-950 pb-20 md:pb-0">
                
                {/* Background Ambience */}
                <div className="absolute top-0 left-1/4 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-indigo-600/10 rounded-full blur-[80px] lg:blur-[128px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[300px] lg:w-[600px] h-[300px] lg:h-[600px] bg-purple-600/5 rounded-full blur-[80px] lg:blur-[128px] pointer-events-none" />

                <div className="container mx-auto px-6 lg:px-12 relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[80vh]">
                    
                    {/* Left: Typography & Action */}
                    <div className="space-y-6 lg:space-y-8 text-center lg:text-left mt-10 lg:mt-0">
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                            Generate <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Product Demos</span> <br className="hidden md:block"/>
                            From Your Screen Recordings.
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Upload a screen recording - get a narrated demo that shows how your product works. Great for launches and social sharing.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                            <label className="group relative cursor-pointer w-full sm:w-auto">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
                                <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-xl hover:bg-gray-100 transition shadow-xl transform active:scale-95">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span className="font-bold text-lg">Upload Video</span>
                                </div>
                                <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                            </label>
                            
                            {!session && (
                                <button onClick={handleLogin} className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-gray-300 hover:text-white border border-transparent hover:border-gray-700 hover:bg-gray-800 transition w-full sm:w-auto">
                                    <XIcon className="w-5 h-5" />
                                    <span>Sign in</span>
                                </button>
                            )}
                        </div>

                         {/* Notification */}
                         {showSuccessNotification && (
                            <div className="mt-8 bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-4 max-w-md mx-auto lg:mx-0 animate-fade-in text-left">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 shrink-0">✓</div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Purchase Successful</h3>
                                    <p className="text-green-200/80 text-xs">Credits added to account.</p>
                                </div>
                                <button onClick={() => setShowSuccessNotification(false)} className="ml-auto text-gray-400 hover:text-white">✕</button>
                            </div>
                        )}
                    </div>

                    {/* Right: Abstract UI Visualization */}
                    <div className="relative hidden lg:block">
                         <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden aspect-video transform rotate-1 hover:rotate-0 transition-transform duration-700">
                             <div className="h-10 border-b border-gray-800 bg-gray-900/50 flex items-center px-4 gap-2">
                                 <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                             </div>
                             <div className="p-8 grid grid-cols-12 gap-6 h-full bg-gradient-to-br from-gray-900 to-black">
                                 <div className="col-span-4 space-y-4">
                                     <div className="h-8 w-3/4 bg-gray-800 rounded animate-pulse"></div>
                                     <div className="h-4 w-full bg-gray-800/50 rounded"></div>
                                     <div className="h-4 w-5/6 bg-gray-800/50 rounded"></div>
                                 </div>
                                 <div className="col-span-8 bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 relative">
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="w-16 h-16 bg-white/10 rounded-full backdrop-blur flex items-center justify-center border border-white/20">
                                            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Footer Credits Prompt */}
                {session && profile && profile.credits < 1 && (
                     <div className="w-full bg-gray-900 border-t border-gray-800 py-4 absolute bottom-0 z-20">
                         <div className="container mx-auto px-6 flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-400">You are out of credits.</span>
                            <button onClick={onPurchase} className="text-xs sm:text-sm font-bold text-indigo-400 hover:text-indigo-300">
                                Get 10 Demos for $4 →
                            </button>
                         </div>
                     </div>
                )}
            </div>
        );
    }

    // --- APP EDITOR VIEW (File Selected) ---
    // Layout: 
    // Desktop: Row (Video Left, Settings Right)
    // Mobile: Column (Header -> Tab Content)
    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-gray-950 text-gray-300 font-sans overflow-hidden">
             
             {/* HEADER BAR (Mobile Only) with Tab Switcher */}
             <div className="md:hidden h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-20">
                 <button 
                     onClick={onClearFile}
                     className="text-gray-400 hover:text-white"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 
                 {/* Mobile Segmented Control */}
                 <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-800">
                     <button 
                        onClick={() => setMobileTab('preview')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${mobileTab === 'preview' ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}
                     >
                        Preview
                     </button>
                     <button 
                        onClick={() => setMobileTab('settings')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${mobileTab === 'settings' ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}
                     >
                        Settings
                     </button>
                 </div>

                 <div className="w-5"></div> {/* Spacer for center alignment */}
             </div>

             {/* LEFT PANEL: Video Canvas Area */}
             {/* Hidden on mobile if tab is 'settings' */}
             <div className={`flex-1 flex flex-col min-w-0 relative ${mobileTab === 'settings' ? 'hidden md:flex' : 'flex'}`}>
                 
                 {/* Desktop Toolbar */}
                 <div className="hidden md:flex h-14 border-b border-gray-800 items-center justify-between px-6 bg-gray-950 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClearFile}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                            title="Close Project"
                        >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <span className="text-sm font-medium text-white truncate max-w-md">{file?.name}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                        {duration.toFixed(1)}s Selected
                    </div>
                 </div>

                 {/* Canvas Content */}
                 <div className="flex-1 bg-black/20 relative flex flex-col min-h-0">
                      {videoUrl && (
                          <VideoCropper 
                             videoUrl={videoUrl}
                             onCropChange={setCrop}
                             onTrimChange={setTrim}
                          />
                      )}
                      
                      {/* Floating Warning */}
                      {!isDurationValid && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg z-30 whitespace-nowrap">
                                Max limit 90s. Current: {duration.toFixed(1)}s
                            </div>
                      )}
                 </div>

                 {/* Auth Modal Overlay */}
                 {showAuthModal && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
                        <p className="text-gray-400 mb-6 text-sm">Sign in to process your video.</p>
                        <button 
                            onClick={handleLogin}
                            className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition"
                        >
                            <XIcon className="w-4 h-4" />
                            <span>Sign in</span>
                        </button>
                    </div>
                 )}
             </div>

             {/* RIGHT PANEL: Settings Sidebar */}
             {/* Hidden on mobile if tab is 'preview' */}
             <div className={`w-full md:w-80 md:border-l border-gray-800 bg-gray-950 flex flex-col z-10 flex-shrink-0 ${mobileTab === 'preview' ? 'hidden md:flex' : 'flex h-full'}`}>
                 
                 <div className="h-14 border-b border-gray-800 flex items-center px-6 flex-shrink-0">
                     <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configuration</h3>
                     <div className="ml-auto">
                         {profile && (
                            <span className={`text-[10px] font-mono border border-gray-800 px-2 py-1 rounded ${profile.credits > 0 ? 'text-gray-400' : 'text-red-400 border-red-900/30 bg-red-900/10'}`}>
                                {profile.credits} CREDITS
                            </span>
                         )}
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                     {/* Voice Selector */}
                     <div className="space-y-3">
                         <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice</label>
                         <div className="space-y-1">
                             {VOICES.map(v => (
                                 <button
                                    key={v.id}
                                    onClick={() => setVoice(v)}
                                    className={`w-full flex items-center justify-between px-3 py-3 md:py-2 text-sm border rounded-lg md:rounded-none transition-all duration-200 ${
                                        voice.id === v.id
                                        ? 'bg-white text-black border-white'
                                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-300'
                                    }`}
                                 >
                                     <span className="font-medium">{v.name}</span>
                                     <span className="opacity-60 text-[10px] uppercase">{v.gender}</span>
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* Description Input */}
                     {voice.id !== 'voiceless' && (
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-between">
                                App Description<span className="text-indigo-400">*</span>
                            </label>
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-800 p-3 text-sm text-gray-300 focus:border-gray-600 focus:outline-none transition-colors min-h-[120px] resize-none placeholder-gray-700 leading-relaxed rounded-md"
                                placeholder="Supabase is a Postgres..."
                                value={appDescription}
                                onChange={(e) => setAppDescription(e.target.value)}
                            />
                        </div>
                     )}

                     {errorMessage && (
                        <div className="text-xs text-red-400 bg-red-950/30 border-l-2 border-red-500 pl-3 py-2 rounded-r">
                            {errorMessage}
                        </div>
                     )}
                 </div>

                 <div className="p-6 border-t border-gray-800 flex-shrink-0 bg-gray-950 pb-safe">
                     <button 
                        onClick={onGenerate}
                        disabled={!session || !isDurationValid}
                        className="w-full py-3.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-white/5"
                    >
                        Generate Demo
                    </button>
                    {profile && profile.credits < 1 && (
                        <button onClick={onPurchase} className="block w-full mt-4 text-center text-xs text-gray-500 hover:text-indigo-400 transition-colors">
                            Purchase Credits
                        </button>
                    )}
                 </div>
             </div>
        </div>
    );
};