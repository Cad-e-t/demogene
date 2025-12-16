
import React from 'react';

interface LandingPageProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLogin: () => void;
    showAuthModal?: boolean; // Optional if you want to reuse the auth modal logic
}

export const LandingPage: React.FC<LandingPageProps> = ({ onFileChange, handleLogin }) => {
    return (
        <div className="relative w-full min-h-screen flex flex-col items-center bg-gray-950 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            
            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* --- HERO SECTION --- */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-32 pb-20 text-center flex flex-col items-center">

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight mb-10">
                    Turn Screen Recordings Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">Polished Product Demos.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-16">
                    Skip editors. Upload a screen recording of your app and get a narrated demo with script, voiceover, zooms, and pacing automatically. Perfect for launches, onboarding, and sharing.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
                    <label className="group relative cursor-pointer w-full sm:w-auto">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
                        <div className="relative flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-xl hover:bg-gray-50 transition shadow-xl transform active:scale-[0.98] duration-200">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="font-bold text-xl">Upload Video</span>
                        </div>
                        <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                    </label>
                    
                    <button 
                        onClick={handleLogin} 
                        className="px-10 py-5 rounded-xl font-semibold text-gray-300 hover:text-white border border-gray-800 hover:bg-gray-800 transition w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                         <span className="text-lg">Sign in</span>
                    </button>
                </div>
            </div>

            {/* Spacer */}
            <div className="w-full h-24 md:h-32"></div>

            {/* --- COMPARISON SECTION --- */}
            <div className="w-full max-w-7xl mx-auto px-6 pb-32 relative z-10">
                
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
                    
                    {/* Before Video */}
                    <div className="flex flex-col gap-6 group">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-gray-500 tracking-widest uppercase">Original Recording</span>
                            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">Raw Input</span>
                        </div>
                        
                        <div className="relative aspect-video bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-sm group-hover:border-gray-700 transition-colors">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/input.mp4" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                controls
                                muted
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-base text-gray-500 px-1 leading-relaxed">
                            A standard raw screen capture. Static, no focus, no audio, no context.
                        </p>
                    </div>

                    {/* After Video */}
                    <div className="flex flex-col gap-6 relative group">
                        
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5 10 5 10-5-5-2.5-5 2.5z"/></svg>
                                Polished Demo
                            </span>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">Output</span>
                        </div>

                        {/* Glow Effect */}
                        <div className="absolute top-10 inset-0 bg-indigo-500/10 blur-3xl -z-10 rounded-full opacity-50 group-hover:opacity-75 transition-opacity"></div>

                        <div className="relative aspect-video bg-gray-900 rounded-2xl border border-indigo-500/30 overflow-hidden shadow-[0_0_40px_-10px_rgba(79,70,229,0.2)] group-hover:shadow-[0_0_60px_-10px_rgba(79,70,229,0.3)] transition-all ring-1 ring-indigo-500/20 group-hover:ring-indigo-500/50">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/demo.mp4" 
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-base text-gray-400 px-1 leading-relaxed">
                            Zoomed for clarity, smooth cursor motion, professional voiceover, and pacing.
                        </p>
                    </div>

                </div>

            </div>

            {/* Footer / Trust / Additional Info could go here */}
            <div className="py-12 text-center border-t border-gray-800 w-full mt-auto">
                <p className="text-gray-600 text-sm">ProductCam AI © 2025</p>
            </div>
        </div>
    );
};
