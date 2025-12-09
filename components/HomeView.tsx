
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

    if (!file) {
        return (
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
                            <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                        </label>
                    </div>
                </div>

                {/* Credits / Notification Section */}
                <div className="w-full max-w-4xl mx-auto">
                    {showSuccessNotification ? (
                            <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-green-500/5 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Payment Successful</h3>
                                        <p className="text-green-200/80 text-sm">10 credits have been added to your balance.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowSuccessNotification(false)}
                                    className="p-2 text-gray-400 hover:text-white transition rounded-full hover:bg-gray-800"
                                    aria-label="Close notification"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                    ) : (
                        session && profile ? (
                            profile.credits > 0 ? null : (
                                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-8 text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39h-2.07c-.12-.9-.9-1.54-2.34-1.54-1.3 0-1.87.61-1.87 1.37 0 .84.62 1.55 2.69 2.05 2.49.59 4.17 1.66 4.17 3.67 0 1.74-1.41 2.85-3.14 3.2z"/></svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Out of Credits</h3>
                                        <p className="text-indigo-200 mb-6 max-w-lg mx-auto">
                                            Purchase a pack to start generating professional demos. <br/>
                                            <span className="font-semibold text-white">Less than the price of a coffee.</span>
                                        </p>
                                        <div className="inline-block bg-gray-900/80 backdrop-blur border border-indigo-500/50 rounded-xl p-6 hover:border-indigo-400 transition cursor-pointer transform hover:scale-105" onClick={onPurchase}>
                                            <div className="text-3xl font-bold text-white mb-1">$3.00</div>
                                            <div className="text-indigo-300 font-medium">for 10 Demos</div>
                                            <button className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold">Purchase Now</button>
                                        </div>
                                </div>
                            )
                        ) : null
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-3 gap-8 relative animate-fade-in">
            {/* Left Column: Editor */}
            <div className="lg:col-span-2 space-y-6">
                {/* Project Header */}
                <div className="flex items-center justify-between bg-gray-900/40 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white truncate text-sm">Active Project</h3>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{file.name}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClearFile}
                        className="flex-shrink-0 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Change Video
                    </button>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1 overflow-hidden shadow-2xl relative">
                    {videoUrl && (
                         <VideoCropper 
                            videoUrl={videoUrl} 
                            onCropChange={setCrop}
                            onTrimChange={setTrim}
                        />
                    )}
                    
                    {/* Validation Warning */}
                    {!isDurationValid && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-30">
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
                    <div className="mb-6">
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
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Short App Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                rows={3}
                                placeholder="Your-App-Name is a platform that..."
                                value={appDescription}
                                onChange={(e) => setAppDescription(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Please include the name of your application so AI can use it in the script.</p>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-8 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button 
                            onClick={onGenerate}
                            disabled={!session || !isDurationValid}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Demo Video
                        </button>
                        {profile && profile.credits < 1 && (
                            <p className="text-xs text-center text-red-400">0 Credits. Payment required.</p>
                        )}
                    </div>
                </div>

                {/* Payment Section - Replicated here if out of credits for convenience */}
                {profile && profile.credits < 1 && (
                    <div className="mt-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6 text-center">
                            <h4 className="font-bold text-white mb-2">Need Credits?</h4>
                            <p className="text-sm text-gray-400 mb-4">$3 for 10 Demos</p>
                            <button onClick={onPurchase} className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">Purchase Pack</button>
                    </div>
                )}
            </div>
        </div>
    );
};
