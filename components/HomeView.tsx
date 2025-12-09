import React from 'react';
import { VideoCropper } from './VideoCropper';
import { CropData, TrimData, VoiceOption } from '../types';
import { VOICES } from '../constants';

// X (Twitter) Icon Component for Auth Modal
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

    const duration = trim.end - trim.start;
    const isDurationValid = duration <= 90;

    // --- LANDING PAGE VIEW (No File Selected) ---
    if (!file) {
        return (
            <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
                
                {/* Background Ambience */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />

                <div className="container mx-auto px-6 lg:px-12 relative z-10 grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
                    
                    {/* Left: Typography & Action */}
                    <div className="space-y-8 text-center lg:text-left">
                        {/* Removed Version Badge */}
                        
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                            Turn <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Screen Recordings</span> <br/>
                            Into Polished Walkthrough Demos.
                        </h1>
                        
                        <p className="text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Upload a raw footage and get a clean narrated walkthrough that shows how your product works. Easy to share with users, customers, and communities.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                            <label className="group relative cursor-pointer">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
                                <div className="relative flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl hover:bg-gray-100 transition shadow-xl transform active:scale-95">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span className="font-bold text-lg">Upload Video</span>
                                </div>
                                <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                            </label>
                            
                            {!session && (
                                <button onClick={handleLogin} className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-gray-300 hover:text-white border border-transparent hover:border-gray-700 hover:bg-gray-800 transition">
                                    <XIcon className="w-5 h-5" />
                                    <span>Sign in</span>
                                </button>
                            )}
                        </div>

                         {/* Notification / Payment Success Area */}
                         {showSuccessNotification && (
                            <div className="mt-8 bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-4 max-w-md mx-auto lg:mx-0 animate-fade-in">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">✓</div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Purchase Successful</h3>
                                    <p className="text-green-200/80 text-xs">10 credits added to account.</p>
                                </div>
                                <button onClick={() => setShowSuccessNotification(false)} className="ml-auto text-gray-400 hover:text-white">✕</button>
                            </div>
                        )}
                    </div>

                    {/* Right: Abstract UI Visualization */}
                    <div className="relative hidden lg:block">
                         {/* Abstract Window Frame */}
                         <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden aspect-video transform rotate-1 hover:rotate-0 transition-transform duration-700">
                             {/* Fake Browser Header */}
                             <div className="h-10 border-b border-gray-800 bg-gray-900/50 flex items-center px-4 gap-2">
                                 <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                 <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                 <div className="ml-4 h-5 w-64 bg-gray-800 rounded-full opacity-50"></div>
                             </div>
                             {/* Fake Content */}
                             <div className="p-8 grid grid-cols-12 gap-6 h-full bg-gradient-to-br from-gray-900 to-black">
                                 <div className="col-span-4 space-y-4">
                                     <div className="h-8 w-3/4 bg-gray-800 rounded animate-pulse"></div>
                                     <div className="h-4 w-full bg-gray-800/50 rounded"></div>
                                     <div className="h-4 w-5/6 bg-gray-800/50 rounded"></div>
                                     <div className="h-32 w-full bg-indigo-900/10 border border-indigo-500/20 rounded mt-8 relative overflow-hidden">
                                          <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                                     </div>
                                 </div>
                                 <div className="col-span-8 bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 relative">
                                     {/* Fake Video Player UI */}
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="w-16 h-16 bg-white/10 rounded-full backdrop-blur flex items-center justify-center border border-white/20">
                                            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
                                         </div>
                                     </div>
                                     {/* Zoom Effect Decoration */}
                                     <div className="absolute top-10 right-10 w-24 h-24 border-2 border-indigo-500 rounded-lg opacity-50 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                         <div className="absolute -bottom-6 -right-6 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">ZOOM x2.0</div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         {/* Decorative Elements behind */}
                         <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur-2xl -z-10"></div>
                    </div>
                </div>

                {/* Footer / Out of Credits Prompt in Landing */}
                {session && profile && profile.credits < 1 && (
                     <div className="w-full bg-gray-900 border-t border-gray-800 py-4 absolute bottom-0 z-20">
                         <div className="container mx-auto px-6 flex items-center justify-between">
                            <span className="text-sm text-gray-400">You are currently out of credits.</span>
                            <button onClick={onPurchase} className="text-sm font-bold text-indigo-400 hover:text-indigo-300">
                                Get 10 Demos for $4 →
                            </button>
                         </div>
                     </div>
                )}
            </div>
        );
    }

    // --- APP EDITOR VIEW (File Selected) ---
    return (
        <div className="container max-w-[1920px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">
            <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-6rem)]">
                
                {/* Left Column: Editor (Takes more space now) */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                    {/* Project Header */}
                    <div className="flex items-center justify-between bg-gray-900/40 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-white truncate text-sm">Active Project</h3>
                                <p className="text-xs text-gray-400 truncate max-w-[300px]">{file.name}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClearFile}
                            className="flex-shrink-0 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                        >
                            Change Video
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-1 overflow-hidden shadow-2xl relative flex flex-col justify-center">
                        {videoUrl && (
                             <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
                                <VideoCropper 
                                    videoUrl={videoUrl} 
                                    onCropChange={setCrop}
                                    onTrimChange={setTrim}
                                />
                             </div>
                        )}
                        
                        {/* Validation Warning */}
                        {!isDurationValid && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-30 pointer-events-none">
                                Video must be &le; 90s. Current: {duration.toFixed(1)}s
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
                </div>

                {/* Right Column: Settings */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full overflow-y-auto pb-4">
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 transition-opacity flex-1 flex flex-col ${showAuthModal ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-lg">Configuration</h3>
                                {profile && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${profile.credits > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                        {profile.credits} Credits
                                    </span>
                                )}
                        </div>
                        
                        <div className="space-y-6 flex-1">
                            {/* Voice Selector */}
                            <div>
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

                            {/* Short App Description */}
                            {voice.id !== 'voiceless' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Short App Description <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                        rows={4}
                                        placeholder="Your-App-Name is a platform that..."
                                        value={appDescription}
                                        onChange={(e) => setAppDescription(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Please include the name of your application so AI can use it in the script.</p>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
                                    {errorMessage}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-800 space-y-3 mt-auto">
                            <button 
                                onClick={onGenerate}
                                disabled={!session || !isDurationValid}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Demo Video
                            </button>
                            {profile && profile.credits < 1 && (
                                <div className="text-center">
                                    <p className="text-xs text-red-400 mb-2">Insufficient Credits</p>
                                    <button onClick={onPurchase} className="text-xs font-bold text-indigo-400 underline">Buy 10 Demos for $4</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};