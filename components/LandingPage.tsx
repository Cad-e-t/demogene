
import React, { useState, useEffect } from 'react';

interface LandingPageProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLogin: () => void;
    showAuthModal?: boolean; 
}

export const LandingPage: React.FC<LandingPageProps> = ({ onFileChange, handleLogin }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Trigger Twitter widget reload on mount/update
    useEffect(() => {
        // @ts-ignore
        if (window.twttr && window.twttr.widgets) {
            // @ts-ignore
            window.twttr.widgets.load();
        }
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="relative w-full min-h-screen flex flex-col items-center bg-gray-950 overflow-x-hidden selection:bg-green-500 selection:text-white font-sans text-white pt-20 md:pt-24">
            
            {/* --- STICKY NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 md:px-12 z-50">
                <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToTop}>
                     <div className="w-10 h-10 flex items-center justify-center bg-green-500/10 rounded-full text-xs font-black text-green-500 border border-green-500/20">
                         PC
                     </div>
                     <span className="font-black text-xl text-white tracking-tighter uppercase">ProductCam</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-10">
                    <button 
                        onClick={() => scrollToSection('how-it-works')} 
                        className="text-base font-black text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        How it Works
                    </button>
                    <a 
                        href="#/blog" 
                        className="text-base font-black text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        Blog
                    </a>
                    <button 
                        onClick={handleLogin} 
                        className="px-8 py-3.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 transition border border-green-500/20 uppercase tracking-tighter shadow-lg shadow-green-600/20"
                    >
                        Try It Now
                    </button>
                </div>

                {/* Mobile Menu Icon */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-3 text-gray-400 hover:text-white"
                >
                    {isMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-20 left-0 right-0 bg-gray-950 border-b border-gray-800 shadow-2xl flex flex-col p-6 gap-4 animate-fade-in md:hidden">
                        <button 
                            onClick={() => scrollToSection('how-it-works')}
                            className="w-full text-left px-4 py-4 rounded-lg text-lg font-black text-gray-400 hover:bg-gray-800 uppercase tracking-widest"
                        >
                            How it Works
                        </button>
                        <a 
                            href="#/blog"
                            className="w-full text-left px-4 py-4 rounded-lg text-lg font-black text-gray-400 hover:bg-gray-800 uppercase tracking-widest"
                        >
                            Blog
                        </a>
                        <button 
                            onClick={handleLogin}
                            className="w-full text-center px-4 py-5 rounded-xl text-lg font-black text-white bg-green-600 border border-green-500/20 uppercase tracking-tighter"
                        >
                            Try It Now
                        </button>
                    </div>
                )}
            </nav>

            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* --- HERO SECTION --- */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 pb-20 text-center flex flex-col items-center">

                <h1 
                    style={{ 
                        fontFamily: "'Poppins', sans-serif", 
                        fontWeight: 600,
                        fontSize: 'clamp(32px, 8vw, 72px)'
                    }}
                    className="tracking-tight text-white leading-tight mb-10"
                >
                    Turn Screen Recordings Into Product Demos.
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-16 font-medium">
                    Skip editors. Upload a screen recording of your app and get a narrated demo with script, voiceover, zooms, and pacing. Perfect for launches, onboarding, and sharing.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
                    <button 
                        onClick={handleLogin} 
                        className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] transition-transform duration-200"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                        <div className="relative flex items-center justify-center gap-3 px-12 py-5 bg-green-600 text-white rounded-2xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                            <span className="font-black text-xl uppercase tracking-tighter">Try It Now</span>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                            </svg>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => scrollToSection('example')} 
                        className="px-12 py-5 rounded-2xl font-black text-gray-300 hover:text-white border-2 border-gray-800 hover:border-green-500/50 hover:bg-gray-900 transition w-full sm:w-auto flex items-center justify-center gap-2 transform hover:scale-[1.02] duration-200 uppercase tracking-tighter text-xl"
                    >
                         <span>See Example</span>
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7-7-7" />
                         </svg>
                    </button>
                </div>
            </div>

            {/* Spacer */}
            <div className="w-full h-24 md:h-32"></div>

            {/* Divider & Header */}
            <div id="example" className="w-full max-w-7xl mx-auto px-6 mb-16 animate-fade-in scroll-mt-24">
                <div className="w-full h-px bg-gray-800 mb-16"></div>
                <h2 className="text-4xl font-black text-center text-white tracking-tighter uppercase">See Example</h2>
            </div>

            {/* --- COMPARISON SECTION --- */}
            <div className="w-full max-w-7xl mx-auto px-6 pb-32 relative z-10">
                
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
                    
                    {/* Before Video */}
                    <div className="flex flex-col gap-6 group">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-gray-500 tracking-widest uppercase">Original Recording</span>
                            <span className="text-[10px] bg-gray-900 text-gray-400 px-2 py-0.5 rounded border border-gray-800 font-bold">Raw Input</span>
                        </div>
                        
                        <div className="relative aspect-video bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-sm group-hover:border-gray-700 transition-colors">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/input.mp4" 
                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                controls
                                muted
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-lg text-gray-400 px-1 leading-relaxed font-medium">
                            A standard raw screen capture. Static, no focus, no audio, no context.
                        </p>
                    </div>

                    {/* After Video */}
                    <div className="flex flex-col gap-6 relative group">
                        
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-green-500 tracking-widest uppercase flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5-10-5-10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5 10 5 10-5-5-2.5-5 2.5z"/></svg>
                                Polished Demo
                            </span>
                            <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 shadow-sm font-bold">Output</span>
                        </div>

                        {/* Glow Effect */}
                        <div className="absolute top-10 inset-0 bg-green-500/10 blur-3xl -z-10 rounded-full opacity-0 group-hover:opacity-75 transition-opacity duration-500"></div>

                        <div className="relative aspect-video bg-gray-900 rounded-2xl border-2 border-green-500/20 overflow-hidden shadow-xl shadow-green-500/5 transition-all ring-1 ring-black/5 group-hover:border-green-500/50">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/738a626d-03f9-479a-9988-5db34b6f425b.mp4" 
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-lg text-white px-1 leading-relaxed font-medium">
                            Zoomed for clarity, smooth cursor motion, professional voiceover, and pacing.
                        </p>
                    </div>

                </div>

            </div>

            {/* --- How it works --- */}
            <div id="how-it-works" className="w-full bg-gray-900/50 border-t border-gray-800 py-32 scroll-mt-24">
                <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-20 tracking-tighter uppercase">How it works</h2>
                    
                    <div className="space-y-20 w-full max-w-2xl relative">
                        {/* Connecting Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800 -translate-x-1/2 hidden md:block z-0"></div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-950/80 md:px-4">
                            <div className="w-20 h-20 rounded-full bg-gray-900 text-green-500 flex items-center justify-center font-black text-3xl border-2 border-gray-800 shadow-xl shadow-black/50">1</div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Record your screen</h3>
                            <p className="text-xl text-gray-400 leading-relaxed max-w-md font-medium">
                                Just click through your product like you'd normally use it.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-950/80 md:px-4">
                            <div className="w-20 h-20 rounded-full bg-gray-900 text-green-500 flex items-center justify-center font-black text-3xl border-2 border-gray-800 shadow-xl shadow-black/50">2</div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">We turn it into a demo</h3>
                            <p className="text-xl text-gray-400 leading-relaxed font-medium">
                                Your recording is broken into clear steps with:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left bg-gray-900 p-8 rounded-3xl border border-gray-800 w-full md:w-auto shadow-2xl">
                                <div className="flex items-center gap-3 text-gray-300 font-bold"><span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span> Auto-generated script</div>
                                <div className="flex items-center gap-3 text-gray-300 font-bold"><span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span> Natural voiceover</div>
                                <div className="flex items-center gap-3 text-gray-300 font-bold"><span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span> Smart zooms & pauses</div>
                                <div className="flex items-center gap-3 text-gray-300 font-bold"><span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span> Clean pacing</div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-950/80 md:px-4">
                            <div className="w-20 h-20 rounded-full bg-gray-900 text-green-500 flex items-center justify-center font-black text-3xl border-2 border-gray-800 shadow-xl shadow-black/50">3</div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Download</h3>
                            <p className="text-xl text-gray-400 leading-relaxed max-w-md font-medium">
                                Download a ready-to-use SaaS demo you can ship with immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Extension: Try It Now --- */}
            <section className="w-full bg-gray-950 py-24 border-t border-gray-800 flex flex-col items-center text-center px-6">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tighter uppercase">Try It now.</h2>
                <p className="text-xl text-gray-400 mb-12 max-w-2xl font-medium">Create a launch-ready 🚀 product demo in seconds without editing.</p>
                <button onClick={handleLogin} className="group relative cursor-pointer transform hover:scale-[1.02] transition-transform duration-200">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                    <div className="relative flex items-center justify-center gap-3 px-12 py-5 bg-green-600 text-white rounded-2xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                        <span className="font-black text-2xl uppercase tracking-tighter">Create My Demo</span>
                    </div>
                </button>
            </section>

            {/* --- Extension: What Can You Use This Tool For? --- */}
            <section className="w-full bg-gray-900/50 py-32 border-t border-gray-800">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-4xl font-black text-white mb-8 tracking-tighter text-center md:text-left uppercase">What Can You Use This Tool For?</h2>
                    <p className="text-xl text-gray-400 mb-12 font-medium text-center md:text-left">This tool is built for people searching for better ways to explain software without editing video manually.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            "Create a SaaS product demo video for your landing page",
                            "Turn a Loom or screen recording into a narrated demo",
                            "Generate onboarding walkthroughs from existing recordings",
                            "Produce a Product Hunt demo video without editing",
                            "Share a feature explanation video with users or prospects"
                        ].map((useCase, i) => (
                            <div key={i} className="flex items-start gap-4 p-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold shrink-0 border border-green-500/20">✓</div>
                                <p className="text-lg text-gray-300 font-medium leading-tight">{useCase}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-12 text-center md:text-left text-lg text-gray-500 font-medium italic">If you already have a screen recording, this replaces the rest of the workflow.</p>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION --- */}
            <section className="w-full bg-gray-950 py-32 border-t border-gray-800 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-20 tracking-tighter text-center px-6 uppercase">
                    See What Builders Are Saying About Us
                </h2>
                
                <div className="w-full flex overflow-x-auto gap-8 px-6 pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth">
                    <div className="shrink-0 snap-center w-[90%] md:w-[450px] bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 p-2">
                        <blockquote className="twitter-tweet" data-theme="dark">
                            <p lang="en" dir="ltr">This tool is a game changer for a high school founder like me<br/><br/>I can&#39;t afford to hire a design team right now so I need speed<br/><br/>This means I can spend less time making demos and more time coding the next feature for my app</p>
                            &mdash; Ben Head (@BenHeadGPT) 
                            <a href="https://twitter.com/BenHeadGPT/status/2000280774667629046?ref_src=twsrc%5Etfw">December 14, 2025</a>
                        </blockquote>
                    </div>
                    
                    <div className="shrink-0 snap-center w-[90%] md:w-[450px] bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 p-2">
                        <blockquote className="twitter-tweet" data-theme="dark">
                            <p lang="en" dir="ltr">Product demos used to feel like pulling teeth... this looks like a real shortcut.</p>
                            &mdash; Tejas (@TWadpillewar) 
                            <a href="https://twitter.com/TWadpillewar/status/2000519427188527482?ref_src=twsrc%5Etfw">December 15, 2025</a>
                        </blockquote>
                    </div>
                </div>
            </section>

            {/* --- Extension: Why It Surpasses --- */}
            <section className="w-full bg-gray-950 py-32 border-t border-gray-800">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[48px] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl border border-gray-800">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h2 className="text-xl text-green-500 mb-12 font-black uppercase tracking-widest">Making product demos used to require multiple steps:</h2>

                            <div className="space-y-6 text-xl text-gray-300 leading-relaxed font-medium">
                                <p className="text-white font-black text-2xl">ProductCam replaces all that. Instead of spending hours stitching everything together, you upload once and get a finished demo automatically.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Extension: Stop Shipping / Start Shipping --- */}
            <section className="w-full bg-gray-950 py-32 border-t border-gray-800">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                        {/* Stop */}
                        <div className="space-y-8">
                            <h3 className="text-3xl font-black text-red-500 flex items-center gap-3 uppercase tracking-tighter">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Stop shipping:
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "Silent screen recordings that confuse users",
                                    "Low-quality or rushed voiceovers",
                                    "Awkward pauses, “uhms,” and \"ahs\"",
                                    "Demos that show what you clicked, not why it matters"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 text-gray-500 font-bold">
                                        <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Start */}
                        <div className="space-y-8">
                            <h3 className="text-3xl font-black text-green-500 flex items-center gap-3 uppercase tracking-tighter">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Start shipping:
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "Clear, narrated product walkthroughs",
                                    "Demos that explain the value as users watch",
                                    "A single video that onboards, explains, and sells",
                                    "A demo that’s ready the moment you need it."
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 text-white font-black">
                                        <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Extension: Final CTA --- */}
            <div className="w-full bg-gray-950 py-32 flex flex-col items-center justify-center border-t border-gray-800 px-6">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-12 tracking-tighter text-center uppercase">
                    Ready to Create Your First Demo?
                </h2>
                
                <button 
                    onClick={handleLogin}
                    className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] transition-transform duration-200"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                    <div className="relative flex items-center justify-center gap-3 px-12 py-5 bg-green-600 text-white rounded-2xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-black text-2xl uppercase tracking-tighter">Try It Now</span>
                    </div>
                </button>
            </div>

            {/* Footer */}
            <div className="py-12 text-center border-t border-gray-800 w-full mt-auto bg-gray-950">
                <p className="text-gray-500 text-sm font-black uppercase tracking-widest">ProductCam AI © 2025</p>
            </div>
        </div>
    );
};
