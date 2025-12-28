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
        <div className="relative w-full min-h-screen flex flex-col items-center bg-white overflow-x-hidden selection:bg-green-500 selection:text-white font-sans text-gray-900 pt-14">
            
            {/* --- STICKY NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToTop}>
                     <div className="w-7 h-7 flex items-center justify-center bg-green-50 rounded-full text-[10px] font-bold text-green-700 border border-green-100">
                         PC
                     </div>
                     <span className="font-bold text-sm text-gray-900">ProductCam</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    <button 
                        onClick={() => scrollToSection('how-it-works')} 
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        How it Works
                    </button>
                    <button 
                        onClick={() => scrollToSection('example')} 
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        See Example
                    </button>
                    <a 
                        href="#/blog" 
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Blog
                    </a>
                    <button 
                        onClick={scrollToTop} 
                        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition border border-gray-800"
                    >
                        Create Demo
                    </button>
                </div>

                {/* Mobile Menu Icon */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 text-gray-600 hover:text-black"
                >
                    {isMenuOpen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-xl flex flex-col p-4 gap-2 animate-fade-in md:hidden">
                        <button 
                            onClick={() => scrollToSection('how-it-works')}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            How it Works
                        </button>
                        <button 
                            onClick={() => scrollToSection('example')}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            See Example
                        </button>
                        <a 
                            href="#/blog"
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Blog
                        </a>
                        <button 
                            onClick={scrollToTop}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-gray-900 bg-gray-50 border border-gray-100"
                        >
                            Create Demo
                        </button>
                    </div>
                )}
            </nav>

            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            {/* --- HERO SECTION --- */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 pb-20 text-center flex flex-col items-center">

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-tight mb-10">
                    Turn Screen Recordings Into Product Demos.
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-16 font-medium">
                    Skip editors. Upload a screen recording of your app and get a narrated demo with script, voiceover, zooms, and pacing. Perfect for launches, onboarding, and sharing.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
                    <label className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] transition-transform duration-200">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                        <div className="relative flex items-center justify-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-xl hover:bg-black transition shadow-xl">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="font-bold text-xl">Upload Video</span>
                        </div>
                        <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                    </label>
                    
                    <button 
                        onClick={handleLogin} 
                        className="px-10 py-5 rounded-xl font-bold text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition w-full sm:w-auto flex items-center justify-center gap-2 transform hover:scale-[1.02] duration-200"
                    >
                         <span className="text-lg">Sign in</span>
                    </button>
                </div>
            </div>

            {/* Spacer */}
            <div className="w-full h-24 md:h-32"></div>

            {/* Divider & Header */}
            <div id="example" className="w-full max-w-7xl mx-auto px-6 mb-16 animate-fade-in scroll-mt-24">
                <div className="w-full h-px bg-gray-200 mb-16"></div>
                <h2 className="text-4xl font-bold text-center text-gray-900 tracking-tight">See Example</h2>
            </div>

            {/* --- COMPARISON SECTION --- */}
            <div className="w-full max-w-7xl mx-auto px-6 pb-32 relative z-10">
                
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
                    
                    {/* Before Video */}
                    <div className="flex flex-col gap-6 group">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-gray-500 tracking-widest uppercase">Original Recording</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">Raw Input</span>
                        </div>
                        
                        <div className="relative aspect-video bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-sm group-hover:border-gray-300 transition-colors">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/input.mp4" 
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                controls
                                muted
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-lg text-gray-600 px-1 leading-relaxed font-medium">
                            A standard raw screen capture. Static, no focus, no audio, no context.
                        </p>
                    </div>

                    {/* After Video */}
                    <div className="flex flex-col gap-6 relative group">
                        
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-green-600 tracking-widest uppercase flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5-10-5-10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5 10 5 10-5-5-2.5-5 2.5z"/></svg>
                                Polished Demo
                            </span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 shadow-sm font-bold">Output</span>
                        </div>

                        {/* Glow Effect */}
                        <div className="absolute top-10 inset-0 bg-green-500/10 blur-3xl -z-10 rounded-full opacity-0 group-hover:opacity-75 transition-opacity duration-500"></div>

                        <div className="relative aspect-video bg-gray-900 rounded-2xl border-2 border-green-500/20 overflow-hidden shadow-xl shadow-green-900/5 transition-all ring-1 ring-black/5 group-hover:border-green-500/50">
                            <video 
                                src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/738a626d-03f9-479a-9988-5db34b6f425b.mp4" 
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                                preload="metadata"
                            />
                        </div>
                        <p className="text-lg text-gray-800 px-1 leading-relaxed font-medium">
                            Zoomed for clarity, smooth cursor motion, professional voiceover, and pacing.
                        </p>
                    </div>

                </div>

            </div>

            {/* --- How it works --- */}
            <div id="how-it-works" className="w-full bg-gray-50 border-t border-gray-200 py-32 scroll-mt-14">
                <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-20 tracking-tight">How it works</h2>
                    
                    <div className="space-y-20 w-full max-w-2xl relative">
                        {/* Connecting Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 -translate-x-1/2 hidden md:block z-0"></div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-50 md:px-4">
                            <div className="w-16 h-16 rounded-full bg-white text-green-600 flex items-center justify-center font-bold text-2xl border border-gray-200 shadow-lg">1</div>
                            <h3 className="text-2xl font-bold text-gray-900">Record your screen</h3>
                            <p className="text-xl text-gray-600 leading-relaxed max-w-md font-medium">
                                Just click through your product like you'd normally use it.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-50 md:px-4">
                            <div className="w-16 h-16 rounded-full bg-white text-green-600 flex items-center justify-center font-bold text-2xl border border-gray-200 shadow-lg">2</div>
                            <h3 className="text-2xl font-bold text-gray-900">We turn it into a demo</h3>
                            <p className="text-xl text-gray-600 leading-relaxed font-medium">
                                Your recording is broken into clear steps with:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left bg-white p-8 rounded-2xl border border-gray-200 w-full md:w-auto shadow-sm">
                                <div className="flex items-center gap-3 text-gray-700 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Auto-generated script</div>
                                <div className="flex items-center gap-3 text-gray-700 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Natural voiceover</div>
                                <div className="flex items-center gap-3 text-gray-700 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Smart zooms & pauses</div>
                                <div className="flex items-center gap-3 text-gray-700 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Clean pacing</div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-6 relative z-10 bg-gray-50 md:px-4">
                            <div className="w-16 h-16 rounded-full bg-white text-green-600 flex items-center justify-center font-bold text-2xl border border-gray-200 shadow-lg">3</div>
                            <h3 className="text-2xl font-bold text-gray-900">Download</h3>
                            <p className="text-xl text-gray-600 leading-relaxed max-w-md font-medium">
                                Download a ready-to-use SaaS demo you can ship with immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Extension: Try It Now --- */}
            <section className="w-full bg-white py-24 border-t border-gray-100 flex flex-col items-center text-center px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">Try It now.</h2>
                <p className="text-xl text-gray-600 mb-12 max-w-2xl font-medium">Create a launch-ready 🚀 product demo in seconds without editing.</p>
                <button onClick={scrollToTop} className="group relative cursor-pointer transform hover:scale-[1.02] transition-transform duration-200">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                    <div className="relative flex items-center justify-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-xl hover:bg-black transition shadow-xl">
                        <span className="font-bold text-xl">Create My Demo</span>
                    </div>
                </button>
            </section>

            {/* --- Extension: What Can You Use This Tool For? --- */}
            <section className="w-full bg-gray-50 py-32 border-t border-gray-200">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-4xl font-bold text-gray-900 mb-8 tracking-tight text-center md:text-left">What Can You Use This Tool For?</h2>
                    <p className="text-xl text-gray-600 mb-12 font-medium text-center md:text-left">This tool is built for people searching for better ways to explain software without editing video manually.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            "Create a SaaS product demo video for your landing page",
                            "Turn a Loom or screen recording into a narrated demo",
                            "Generate onboarding walkthroughs from existing recordings",
                            "Produce a Product Hunt demo video without editing",
                            "Share a feature explanation video with users or prospects"
                        ].map((useCase, i) => (
                            <div key={i} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold shrink-0 border border-green-100">✓</div>
                                <p className="text-lg text-gray-700 font-medium leading-tight">{useCase}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-12 text-center md:text-left text-lg text-gray-500 font-medium italic">If you already have a screen recording, this replaces the rest of the workflow.</p>
                </div>
            </section>

            {/* --- Extension: Why It Surpasses --- */}
            <section className="w-full bg-white py-32 border-t border-gray-200">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[32px] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h2 className="text-xl text-green-400 mb-12 font-bold uppercase tracking-wider">Making product demos used to require multiple steps:</h2>

                            <div className="space-y-6 text-xl text-gray-300 leading-relaxed font-medium">
                                <p className="text-white font-bold">ProductCam replaces all that. Instead of spending hours stitching everything together, you upload once and get a finished demo automatically.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Extension: Stop Shipping / Start Shipping --- */}
            <section className="w-full bg-gray-50 py-32 border-t border-gray-200">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                        {/* Stop */}
                        <div className="space-y-8">
                            <h3 className="text-3xl font-bold text-red-600 flex items-center gap-3">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Stop shipping:
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "Silent screen recordings that confuse users",
                                    "Low-quality or rushed voiceovers",
                                    "Awkward pauses, “uhms,” and \"ahs\"",
                                    "Demos that show what you clicked, not why it matters"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 text-gray-500 font-medium">
                                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Start */}
                        <div className="space-y-8">
                            <h3 className="text-3xl font-bold text-green-600 flex items-center gap-3">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Start shipping:
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "Clear, narrated product walkthroughs",
                                    "Demos that explain the value as users watch",
                                    "A single video that onboards, explains, and sells",
                                    "A demo that’s ready the moment you need it."
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 text-gray-900 font-bold">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Extension: Final CTA --- */}
            <div className="w-full bg-white py-32 flex flex-col items-center justify-center border-t border-gray-200 px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-12 tracking-tight text-center">
                    Ready to Create Your First Demo?
                </h2>
                
                <button 
                    onClick={scrollToTop}
                    className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] transition-transform duration-200"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                    <div className="relative flex items-center justify-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-xl hover:bg-black transition shadow-xl">
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-bold text-xl">Create My Demo</span>
                    </div>
                </button>
            </div>

            {/* --- TESTIMONIALS SECTION --- */}
            <section className="w-full bg-gray-50 py-32 border-t border-gray-200 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-20 tracking-tight text-center px-6">
                    See What Builders Are Saying About Us
                </h2>
                
                <div className="w-full flex overflow-x-auto gap-8 px-6 pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth">
                    <div className="shrink-0 snap-center w-[90%] md:w-[450px] bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
                        <blockquote className="twitter-tweet">
                            <p lang="en" dir="ltr">This tool is a game changer for a high school founder like me<br/><br/>I can&#39;t afford to hire a design team right now so I need speed<br/><br/>This means I can spend less time making demos and more time coding the next feature for my app</p>
                            &mdash; Ben Head (@BenHeadGPT) 
                            <a href="https://twitter.com/BenHeadGPT/status/2000280774667629046?ref_src=twsrc%5Etfw">December 14, 2025</a>
                        </blockquote>
                    </div>
                    
                    <div className="shrink-0 snap-center w-[90%] md:w-[450px] bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
                        <blockquote className="twitter-tweet">
                            <p lang="en" dir="ltr">Product demos used to feel like pulling teeth... this looks like a real shortcut.</p>
                            &mdash; Tejas (@TWadpillewar) 
                            <a href="https://twitter.com/TWadpillewar/status/2000519427188527482?ref_src=twsrc%5Etfw">December 15, 2025</a>
                        </blockquote>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="py-12 text-center border-t border-gray-200 w-full mt-auto bg-white">
                <p className="text-gray-500 text-sm font-medium">ProductCam AI © 2025</p>
            </div>
        </div>
    );
};