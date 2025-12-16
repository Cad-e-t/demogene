
import React, { useRef, useState } from 'react';
import { VideoCropper } from './VideoCropper';
import { AdvancedEditorModal } from './AdvancedEditorModal';
import { LandingPage } from './LandingPage';
import { CropData, TrimData, VoiceOption, TimeRange } from '../types';
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
    errorMessage
}) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            <div className="relative w-full min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6 md:ml-0 md:pl-0">
                {/* Dashboard Content */}
                <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden animate-fade-in">
                    
                    {/* Decorative Background inside card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                    <h1 className="text-3xl font-bold text-white mb-3">Create New Demo</h1>
                    <p className="text-gray-400 mb-10 max-w-md mx-auto">
                        Upload a new screen recording to start the AI generation process. 
                        Make sure your recording is clear and under 3 minutes.
                    </p>

                    <label className="group relative cursor-pointer inline-block">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
                        <div className="relative flex items-center justify-center gap-3 px-10 py-5 bg-gray-950 border border-gray-800 text-white rounded-xl hover:bg-gray-900 transition shadow-xl">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="font-bold text-lg">Select Recording</span>
                        </div>
                        <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                    </label>

                    {profile && profile.credits < 1 && (
                         <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col items-center gap-2">
                             <span className="text-sm text-red-400 bg-red-950/20 px-3 py-1 rounded-full border border-red-900/30">Out of credits</span>
                             <button onClick={onPurchase} className="text-sm text-gray-400 hover:text-white underline decoration-gray-600 hover:decoration-white underline-offset-4">
                                 Get 10 Demos for $4
                             </button>
                         </div>
                    )}
                </div>

                {/* Success Notification */}
                {showSuccessNotification && (
                    <div className="fixed bottom-8 right-8 bg-green-900/90 border border-green-500/30 rounded-xl p-4 flex items-center gap-4 shadow-xl z-50 animate-fade-in">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 shrink-0">✓</div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Payment Successful</h3>
                            <p className="text-green-200/80 text-xs">Credits have been added to your account.</p>
                        </div>
                        <button onClick={() => setShowSuccessNotification(false)} className="ml-auto text-gray-400 hover:text-white">✕</button>
                    </div>
                )}
            </div>
        );
    }

    // --- CASE 2: EDITOR VIEW (File Selected) ---
    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-gray-950 text-gray-300 font-sans overflow-hidden">
             
             {/* HEADER BAR (Mobile Only) with Tab Switcher */}
             <div className="md:hidden h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-20">
                 <button 
                     onClick={handleClear}
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
             <div className={`flex-1 flex flex-col min-w-0 relative ${mobileTab === 'settings' ? 'hidden md:flex' : 'flex'}`}>
                 
                 {/* Desktop Toolbar */}
                 <div className="hidden md:flex h-14 border-b border-gray-800 items-center justify-between px-6 bg-gray-950 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleClear}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                            title="Close Project"
                        >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <span className="text-sm font-medium text-white truncate max-w-md">{file?.name}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                        {segments && (
                            <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Advanced Edits Applied</span>
                        )}
                        <span>{effectiveDuration.toFixed(1)}s Total</span>
                    </div>
                 </div>

                 {/* Canvas Content */}
                 <div className="flex-1 bg-black/20 relative flex flex-col min-h-0 items-center justify-center p-8">
                      {videoUrl && (
                          <div className="relative w-full h-full flex flex-col items-center">
                              {/* Video Player Wrapper */}
                              <div className="flex-1 w-full flex items-center justify-center min-h-0">
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
                              <div className="w-full flex justify-center py-4 shrink-0">
                                  <button 
                                      onClick={() => setShowAdvancedEditor(true)}
                                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium text-sm transition-all border border-gray-700 hover:border-gray-600 shadow-lg"
                                  >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                      Edit Video
                                  </button>
                              </div>
                          </div>
                      )}
                      
                      {/* Floating Warning */}
                      {!isDurationValid && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur text-white px-6 py-3 rounded-full text-xs font-bold shadow-xl z-30 text-center max-w-[90%] md:max-w-md border border-red-400/50">
                                Video exceeds 3m limit. Please use the "Edit Video" tool to trim and clip unwanted parts.
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

                     {/* App Name and Description Input */}
                     {voice.id !== 'voiceless' && (
                        <>
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-between">
                                    App Name<span className="text-indigo-400">*</span>
                                </label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-800 p-3 text-sm text-gray-300 focus:border-gray-600 focus:outline-none transition-colors rounded-md placeholder-gray-700"
                                    placeholder="e.g. TrustMRR"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                />
                            </div>

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
                        </>
                     )}

                     {errorMessage && (
                        <div className="text-xs text-red-400 bg-red-950/30 border-l-2 border-red-500 pl-3 py-2 rounded-r">
                            {errorMessage}
                        </div>
                     )}
                 </div>

                 <div className="p-6 border-t border-gray-800 flex-shrink-0 bg-gray-950 pb-safe">
                     <button 
                        onClick={triggerGenerate}
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
