
import React, { useRef, useState } from 'react';
import { VideoCropper } from './VideoCropper';
import { AdvancedEditorModal } from './AdvancedEditorModal';
import { LandingPage } from './LandingPage';
import { CropData, TrimData, VoiceOption, TimeRange } from '../types';
import { VOICES } from '../constants';

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
    onNavigateToBlog: () => void;
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
    onNavigateToBlog
}) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const duration = trim.end - trim.start;
    
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    const [segments, setSegments] = useState<TimeRange[] | null>(null);

    const effectiveDuration = segments 
        ? segments.reduce((acc, s) => acc + (s.end - s.start), 0)
        : duration;

    const isDurationValid = effectiveDuration <= 180;
    const [mobileTab, setMobileTab] = useState<'preview' | 'settings'>('preview');

    const handleClear = () => {
        setSegments(null);
        onClearFile();
    };

    const triggerGenerate = () => {
        onGenerate(segments || undefined);
    };

    if (!file) {
        if (!session) {
            return (
                <LandingPage 
                    onFileChange={onFileChange} 
                    handleLogin={handleLogin} 
                    onNavigateToBlog={onNavigateToBlog}
                />
            );
        }

        return (
            <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 md:ml-0 md:pl-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-3xl mx-auto text-center animate-fade-in flex flex-col gap-10">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">Create New Demo</h1>
                        <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto font-medium">
                            Upload a new screen recording to start the AI generation process. 
                            Make sure your recording is clear and under 3 minutes.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <label className="group relative cursor-pointer inline-block transform hover:scale-[1.02] transition-transform duration-200">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                            <div className="relative flex items-center justify-center gap-4 px-12 py-8 bg-white border border-gray-200 text-gray-900 rounded-2xl hover:border-green-300 transition shadow-xl">
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

                    {profile && profile.credits < 1 && (
                         <div className="flex flex-col items-center gap-3 animate-fade-in">
                             <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-1.5 rounded-full border border-red-200">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                Out of credits
                             </div>
                             <button onClick={onPurchase} className="text-sm text-gray-500 hover:text-green-600 underline decoration-gray-300 hover:decoration-green-500 underline-offset-4 transition-colors">
                                 Get 10 Demos for $4
                             </button>
                         </div>
                    )}
                    
                    <button 
                        onClick={onNavigateToBlog}
                        className="mt-8 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        Read our guides on effective demos
                    </button>
                </div>

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

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans overflow-hidden">
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

             <div className={`flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0 ${mobileTab === 'settings' ? 'hidden md:flex' : 'flex'}`}>
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

                 <div className="flex-1 bg-gray-50/80 relative flex flex-col min-h-0 items-center justify-center p-8 border-r border-gray-200">
                      {videoUrl && (
                          <div className="relative w-full h-full flex flex-col items-center">
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

                              <div className="w-full flex justify-center py-6 shrink-0">
                                  <button 
                                      onClick={() => setShowAdvancedEditor(true)}
                                      className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                  >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                      Edit Video
                                  </button>
                              </div>
                          </div>
                      )}
                      
                      {!isDurationValid && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-6 py-3 rounded-full text-xs font-bold shadow-xl z-30 text-center max-w-[90%] md:max-w-md border border-red-200">
                                Video exceeds 3m limit. Please use the "Edit Video" tool to trim and clip unwanted parts.
                            </div>
                      )}
                 </div>

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
                     <div className="space-y-3">
                         <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Voice</label>
                         <div className="space-y-1">
                             {VOICES.map(v => (
                                 <button
                                    key={v.id}
                                    onClick={() => setVoice(v)}
                                    className={`w-full flex items-center justify-between px-3 py-3 md:py-2.5 text-sm border rounded-lg transition-all duration-200 ${
                                        voice.id === v.id
                                        ? 'bg-green-50 text-green-800 border-green-500 shadow-sm ring-1 ring-green-500'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                 >
                                     <span className="font-bold">{v.name}</span>
                                     <span className="opacity-70 text-[10px] uppercase font-semibold">{v.gender}</span>
                                 </button>
                             ))}
                         </div>
                     </div>

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
                            Purchase Credits
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
