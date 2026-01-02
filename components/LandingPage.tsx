
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
        <div className="relative w-full min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-green-500 selection:text-white font-sans text-gray-900 pt-20 md:pt-24">
            
            {/* --- STICKY NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 md:px-12 z-50">
                <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToTop}>
                     <div className="w-10 h-10 flex items-center justify-center bg-green-500/10 rounded-full text-xs font-black text-green-600 border border-green-500/20">
                         PC
                     </div>
                     <span className="font-black text-xl text-gray-900 tracking-tighter uppercase">ProductCam</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-10">
                    <button 
                        onClick={() => scrollToSection('how-it-works')} 
                        className="text-base font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest"
                    >
                        How it Works
                    </button>
                    <a 
                        href="#/blog" 
                        className="text-base font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest"
                    >
                        Blog
                    </a>
                    <button 
                        onClick={handleLogin} 
                        className="px-8 py-3.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 transition border border-green-500/10 uppercase tracking-tighter shadow-lg shadow-green-600/10"
                    >
                        Try It Now
                    </button>
                </div>

                {/* Mobile Menu Icon */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-3 text-gray-400 hover:text-black"
                >
                    {isMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-20 left-0 right-0 bg-white border-b border-gray-100 shadow-2xl flex flex-col p-6 gap-4 animate-fade-in md:hidden">
                        <button 
                            onClick={() => scrollToSection('how-it-works')}
                            className="w-full text-left px-4 py-4 rounded-lg text-lg font-black text-gray-500 hover:bg-gray-50 uppercase tracking-widest"
                        >
                            How it Works
                        </button>
                        <a 
                            href="#/blog"
                            className="w-full text-left px-4 py-4 rounded-lg text-lg font-black text-gray-500 hover:bg-gray-50 uppercase tracking-widest"
                        >
                            Blog
                        </a>
                        <button 
                            onClick={handleLogin}
                            className="w-full text-center px-4 py-5 rounded-xl text-lg font-black text-white bg-green-600 border border-green-500/10 uppercase tracking-tighter"
                        >
                            Try It Now
                        </button>
                    </div>
                )}
            </nav>

            {/* Enhanced Background Ambience */}
            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-green-500/[0.15] rounded-full blur-[160px] pointer-events-none mix-blend-multiply" />
            <div className="absolute top-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-400/[0.1] rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[800px] h-[1000px] bg-gradient-to-l from-green-500/[0.08] via-transparent to-transparent blur-[140px] pointer-events-none z-0"></div>
            
            {/* --- HERO SECTION --- */}
            <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pt-24 pb-20 text-center flex flex-col items-center">

                <h1 
                    style={{ 
                        fontFamily: "'Poppins', sans-serif", 
                        fontWeight: 600,
                        fontSize: 'clamp(42px, 8.5vw, 96px)'
                    }}
                    className="tracking-tighter text-gray-900 leading-[1] mb-10 max-w-6xl mx-auto"
                >
                    Screen Recordings to <br className="hidden md:block" /> 
                    Product Demos in Minutes
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-16 font-medium">
                    Turn a normal screen recording into a polished, narrated <br className="hidden md:block" />
                    product demo automatically. No editing required. Just upload <br className="hidden md:block" />
                    and get a demo that explains your product clearly.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full sm:w-auto">
                    <button 
                        onClick={handleLogin} 
                        className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur-xl opacity-25 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative flex items-center justify-center gap-4 px-14 py-6 bg-green-600 text-white rounded-2xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                            <span className="font-black text-2xl uppercase tracking-tighter">Try It Now</span>
                            <svg className="w-7 h-7 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                            </svg>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => scrollToSection('example')} 
                        className="px-14 py-6 rounded-2xl font-black text-gray-900 hover:text-black border-2 border-gray-900 hover:border-green-600 hover:bg-white hover:shadow-xl transition-all w-full sm:w-auto flex items-center justify-center gap-3 transform hover:scale-[1.02] duration-300 uppercase tracking-tighter text-2xl"
                    >
                         <span>See Example</span>
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7-7-7" />
                         </svg>
                    </button>
                </div>
            </div>

            {/* Floating Visual Elements Placeholder Space */}
            <div className="w-full h-12 md:h-24"></div>

            {/* --- SEE EXAMPLE SECTION --- */}
            <div id="example" className="w-full bg-gray-50/50 pt-32 pb-40 scroll-mt-24 border-t border-b border-gray-100 relative overflow-hidden">
                <div className="w-full px-6 md:px-12 lg:px-24 mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase">See Example</h2>
                    <div className="w-24 h-2 bg-green-500 mt-6 rounded-full"></div>
                </div>

                <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-16 lg:gap-32 items-center">
                        
                        {/* Before Video */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-8 group">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                    Original Recording
                                </span>
                                <span className="text-[10px] bg-white text-gray-400 px-3 py-1 rounded-full border border-gray-100 font-bold uppercase">Raw Input</span>
                            </div>
                            
                            <div className="relative aspect-video bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-xl group-hover:border-gray-300 transition-all duration-500 group-hover:shadow-2xl">
                                <video 
                                    src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/input.mp4" 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    controls
                                    muted
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                            <p className="text-xl text-gray-400 px-1 leading-relaxed font-medium">
                                A normal screen capture. Static, no focus, no audio, no context.
                            </p>
                        </div>

                        {/* After Video */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-8 relative group">
                            
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-bold text-green-600 tracking-widest uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                                    Polished Demo
                                </span>
                                <span className="text-[10px] bg-green-600 text-white px-3 py-1 rounded-full shadow-lg shadow-green-600/20 font-bold uppercase">Output</span>
                            </div>

                            {/* Glow Effect */}
                            <div className="absolute top-20 inset-0 bg-green-500/[0.08] blur-[120px] -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

                            <div className="relative aspect-video bg-white rounded-[32px] border-4 border-green-500/10 overflow-hidden shadow-2xl shadow-green-500/10 transition-all ring-1 ring-black/[0.02] group-hover:border-green-500/40 transform group-hover:-translate-y-2">
                                <video 
                                    src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/738a626d-03f9-479a-9988-5db34b6f425b.mp4" 
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                            <p className="text-xl text-gray-900 px-1 leading-relaxed font-semibold">
                                Automatically zoomed for clarity, smooth cursor motion,
                                professional voiceover, and pacing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- How it works (Staggered Card Layout) --- */}
            <div id="how-it-works" className="w-full bg-white py-40 scroll-mt-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex flex-col items-center text-center mb-32">
                        <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tighter uppercase">How it works</h2>
                        <p className="text-xl text-gray-500 font-medium max-w-2xl">Skip the complexity. We've automated the entire production pipeline.</p>
                    </div>
                    
                    <div className="relative flex flex-col gap-32">
                        
                        {/* Step 1 - Left */}
                        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative">
                            <div className="w-full md:w-1/2 order-2 md:order-1">
                                <div className="group relative bg-gray-50 rounded-[48px] p-12 md:p-16 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                                    <div className="absolute -top-10 -left-6 w-20 h-20 rounded-3xl bg-green-600 text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-green-600/40 rotate-[-12deg]">1</div>
                                    <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">Record your screen</h3>
                                    <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                        Just click through your product like you'd normally use it. No need to worry about pauses or mistakes we handle the cleaning.
                                    </p>
                                </div>
                            </div>
                            <div className="hidden md:block w-1/2 order-1 md:order-2 opacity-10">
                                <svg className="w-full h-auto text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/></svg>
                            </div>
                        </div>

                        {/* Step 2 - Right */}
                        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative">
                            <div className="hidden md:block w-1/2 opacity-10">
                                <svg className="w-full h-auto text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                            </div>
                            <div className="w-full md:w-1/2">
                                <div className="group relative bg-gray-900 rounded-[48px] p-12 md:p-16 border border-gray-800 shadow-2xl hover:scale-[1.02] transition-all duration-500">
                                    <div className="absolute -top-10 -right-6 w-20 h-20 rounded-3xl bg-white text-green-600 flex items-center justify-center font-black text-4xl shadow-2xl rotate-[12deg]">2</div>
                                    <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-8">We turn it into a demo</h3>
                                    <p className="text-xl text-gray-400 leading-relaxed font-medium mb-10">
                                        Your recording is analyzed and enhanced with:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            "Auto-generated script",
                                            "Natural voiceover",
                                            "Smart zooms & pauses",
                                            "Clean pacing"
                                        ].map((feat, i) => (
                                            <div key={i} className="flex items-center gap-3 text-gray-300 font-bold">
                                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></span>
                                                {feat}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 - Center */}
                        <div className="flex justify-center relative pt-12">
                            <div className="w-full max-w-2xl">
                                <div className="group relative bg-white rounded-[48px] p-12 md:p-16 border-2 border-green-500/10 shadow-2xl hover:shadow-green-500/10 transition-all duration-500 hover:scale-[1.05]">
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-5xl shadow-2xl shadow-green-600/30">3</div>
                                    <div className="text-center mt-6">
                                        <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">Download & Ship</h3>
                                        <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                            Within seconds, download a ready-to-use SaaS demo you can ship with immediately to your landing page or socials.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CTA Extension --- */}
            <section className="w-full bg-gray-50 py-32 border-t border-gray-100 flex flex-col items-center text-center px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/[0.05] rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter uppercase">Try It now.</h2>
                    <p className="text-xl md:text-2xl text-gray-500 mb-14 max-w-3xl font-medium">Create a launch-ready 🚀 product demo in seconds <br className="hidden sm:block" /> without touching a single editing timeline.</p>
                    <button onClick={handleLogin} className="group relative cursor-pointer transform hover:scale-[1.05] active:scale-95 transition-all duration-300">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur-2xl opacity-30 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative flex items-center justify-center gap-4 px-16 py-7 bg-green-600 text-white rounded-2xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                            <span className="font-black text-2xl uppercase tracking-tighter">Create My Demo</span>
                        </div>
                    </button>
                </div>
            </section>

            {/* --- What Can You Use This Tool For? (Grid Reveal) --- */}
            <section className="w-full bg-white py-40">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="mb-20">
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter uppercase">What Can You Use <br /> This Tool For?</h2>
                        <p className="text-xl text-gray-500 max-w-2xl font-medium leading-relaxed">Built for creators searching for high-impact communication without the overhead of manual production.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            "Create a SaaS product demo video for your landing page",
                            "Turn a Loom or screen recording into a narrated demo",
                            "Generate onboarding walkthroughs from existing recordings",
                            "Produce a Product Hunt demo video without editing",
                            "Share a feature explanation video with users or prospects"
                        ].map((useCase, i) => (
                            <div key={i} className="group relative flex flex-col justify-between p-10 bg-gray-50 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-green-500/20 hover:-translate-y-2 transition-all duration-300">
                                <div className="w-14 h-14 rounded-2xl bg-white text-green-600 flex items-center justify-center font-bold shrink-0 border border-gray-100 shadow-sm mb-8 group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-xl text-gray-900 font-black leading-tight uppercase tracking-tighter">{useCase}</p>
                            </div>
                        ))}
                        <div className="flex flex-col justify-center p-10 bg-green-600 rounded-[32px] shadow-2xl shadow-green-600/20">
                             <p className="text-2xl text-white font-black uppercase tracking-tighter italic leading-snug">
                                If you already have a recording, <br /> this replaces <span className="text-green-200">the rest</span> of your workflow.
                             </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION --- */}
            <section className="w-full bg-gray-50 py-40 border-t border-gray-100 flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-500/[0.03] rounded-full blur-[140px] pointer-events-none"></div>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-24 tracking-tighter text-center px-6 uppercase relative z-10">
                    See What Builders <br /> Are Saying About Us
                </h2>
                
                <div className="w-full flex overflow-x-auto gap-12 px-12 pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth relative z-10">
                    <div className="shrink-0 snap-center w-[90%] md:w-[500px] transform hover:scale-[1.02] transition-transform duration-500">
                        <div className="bg-white rounded-[40px] shadow-2xl shadow-black/[0.05] border border-gray-100 p-4">
                            <blockquote className="twitter-tweet" data-theme="light">
                                <p lang="en" dir="ltr">This tool is a game changer for a high school founder like me<br/><br/>I can&#39;t afford to hire a design team right now so I need speed<br/><br/>This means I can spend less time making demos and more time coding the next feature for my app</p>
                                &mdash; Ben Head (@BenHeadGPT) 
                                <a href="https://twitter.com/BenHeadGPT/status/2000280774667629046?ref_src=twsrc%5Etfw">December 14, 2025</a>
                            </blockquote>
                        </div>
                    </div>
                    
                    <div className="shrink-0 snap-center w-[90%] md:w-[500px] transform hover:scale-[1.02] transition-transform duration-500">
                        <div className="bg-white rounded-[40px] shadow-2xl shadow-black/[0.05] border border-gray-100 p-4">
                            <blockquote className="twitter-tweet" data-theme="light">
                                <p lang="en" dir="ltr">Product demos used to feel like pulling teeth... this looks like a real shortcut.</p>
                                &mdash; Tejas (@TWadpillewar) 
                                <a href="https://twitter.com/TWadpillewar/status/2000519427188527482?ref_src=twsrc%5Etfw">December 15, 2025</a>
                            </blockquote>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Why It Surpasses --- */}
            <section className="w-full bg-white py-40 border-t border-gray-100">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="bg-gray-950 rounded-[64px] p-12 md:p-24 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-500/[0.1] rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-2xl text-green-500 mb-12 font-black uppercase tracking-[0.2em]">Making product demos used to require multiple steps:</h2>

                            <div className="space-y-10">
                                <p className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase">
                                    ProductCam replaces all that. <br className="hidden md:block" />
                                    Instead of spending hours <br className="hidden md:block" />
                                    stitching everything together, <br className="hidden md:block" />
                                    you upload once and get <br className="hidden md:block" />
                                    a finished demo automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Stop Shipping / Start Shipping (Overlapping Card Design) --- */}
            <section className="w-full bg-gray-50 py-40 px-6 md:px-12 lg:px-24">
                <div className="grid md:grid-cols-2 gap-20 lg:gap-32 max-w-7xl mx-auto">
                    
                    {/* Stop */}
                    <div className="relative">
                        <div className="bg-white rounded-[48px] p-12 border-2 border-red-500/10 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 className="text-4xl font-black text-red-500 flex items-center gap-4 uppercase tracking-tighter mb-12">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Stop shipping:
                            </h3>
                            <div className="space-y-8">
                                {[
                                    "Silent screen recordings that confuse users",
                                    "Low-quality or rushed voiceovers",
                                    "Awkward pauses, “uhms,” and \"ahs\"",
                                    "Demos that show what you clicked, not why it matters"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-5 text-gray-400 font-bold text-xl leading-tight">
                                        <span className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_#ef4444] mt-1.5 shrink-0"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Start */}
                    <div className="relative mt-12 md:mt-24">
                        <div className="bg-gray-900 rounded-[48px] p-12 border-2 border-green-500/20 shadow-2xl relative overflow-hidden group transform md:-translate-y-12 hover:scale-[1.02] transition-all duration-500">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/[0.05] rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 className="text-4xl font-black text-green-500 flex items-center gap-4 uppercase tracking-tighter mb-12">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Start shipping:
                            </h3>
                            <div className="space-y-8">
                                {[
                                    "Clear, narrated product walkthroughs",
                                    "Demos that explain the value as users watch",
                                    "A single video that onboards, explains, and sells",
                                    "A demo that’s ready the moment you need it."
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-5 text-white font-black text-xl leading-tight">
                                        <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_12px_#22c55e] mt-1.5 shrink-0"></span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Final CTA --- */}
            <div className="w-full bg-white py-60 flex flex-col items-center justify-center border-t border-gray-100 px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-green-500/[0.05] rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
                <h2 className="text-5xl md:text-8xl font-black text-gray-900 mb-16 tracking-tighter text-center uppercase relative z-10 leading-none">
                    Ready to Create <br /> Your First Demo?
                </h2>
                
                <button 
                    onClick={handleLogin}
                    className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.1] active:scale-95 transition-all duration-300 relative z-10"
                >
                    <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-emerald-600 rounded-3xl blur-3xl opacity-40 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative flex items-center justify-center gap-6 px-16 py-8 bg-green-600 text-white rounded-3xl hover:bg-green-500 transition shadow-2xl border border-green-400/20">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-black text-3xl uppercase tracking-tighter">Try It Now</span>
                    </div>
                </button>
            </div>

            {/* Footer */}
            <div className="py-20 text-center border-t border-gray-100 w-full mt-auto bg-white">
                <p className="text-gray-400 text-sm font-black uppercase tracking-[0.3em]">ProductCam AI • Built for Builders © 2025</p>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes bounce-x {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(5px); }
                }
                .animate-bounce-x {
                    animation: bounce-x 1s infinite;
                }
            `}} />
        </div>
    );
};
