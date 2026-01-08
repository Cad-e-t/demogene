
import React, { useState, useEffect } from 'react';
import { TESTIMONIALS } from '../assets';

interface LandingPageProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLogin: () => void;
    showAuthModal?: boolean; 
}

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

const FAQItem = ({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) => (
    <div className="border-b border-gray-100 last:border-0">
        <button 
            onClick={onClick}
            className="w-full py-6 flex items-center justify-between text-left group"
        >
            <span className={`text-xl font-black uppercase tracking-tighter transition-colors ${isOpen ? 'text-green-600' : 'text-gray-900 group-hover:text-green-600'}`}>
                {question}
            </span>
            <div className={`shrink-0 ml-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isOpen ? 'bg-green-600 border-green-600 text-white rotate-45' : 'border-gray-200 text-gray-400 group-hover:border-green-600 group-hover:text-green-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] pb-8' : 'max-h-0'}`}>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                {answer}
            </p>
        </div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onFileChange, handleLogin }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

    const faqs = [
        {
            q: "What is ProductCam?",
            a: "ProductCam is an AI-powered production tool that transforms normal screen recordings into polished, narrated product demos. It handles segmentation, scripting, voiceover, and professional visual effects like smart zooms automatically."
        },
        {
            q: "What problem does ProductCam solve?",
            a: "It eliminates the friction of manual video production. Traditionally, creating a high-quality demo takes hours of complex editing or expensive freelancers. ProductCam automates this entire pipeline into a process that takes just a few minutes."
        },
        {
            q: "Why do I need Product Demos for my SaaS?",
            a: "Demos are the most effective way to show, not just tell, the value of your software. They increase conversion rates on landing pages, improve user onboarding, and help close deals faster by providing instant clarity."
        },
        {
            q: "When should I use ProductCam?",
            a: "Use it whenever you need to explain your product's value: landing pages, onboarding sequences, feature announcements, social media updates, investor decks, or Product Hunt launches."
        },
        {
            q: "When is ProductCam not a good fit?",
            a: "ProductCam is optimized for high-speed software walkthroughs. If you need cinematic brand commercials with real actors, 3D character animation, or complex lifestyle photography, traditional manual editing is still the best route."
        },
        {
            q: "How long does it take to create a demo?",
            a: "From the moment you upload your recording, it usually takes less than 5 minutes for our AI to analyze, script, and render your final demo."
        },
        {
            q: "Do I need to write a script or record my voice?",
            a: "No. Our AI 'watches' your screen recording to understand the actions you're taking, writes a matching narrative script, and uses professional-grade AI voices to narrate the walkthrough."
        },
        {
            q: "Can I reuse the demo content?",
            a: "Absolutely. Once you download your demo, you own the MP4 file. You can use it across your website, YouTube channel, X (Twitter) profile, and within your app's documentation."
        },
        {
            q: "Will this work for my type of product?",
            a: "ProductCam is specifically designed for web applications, software dashboards, SaaS tools, and digital workflows that can be demonstrated via a screen capture."
        },
        {
            q: "How much does it cost?",
            a: "We offer simple credit-based pricing. A single demo costs $2, or you can purchase a pack of 10 demos for $12. No monthly subscriptions or hidden fees."
        },
        {
            q: "Can I update a demo when my product changes?",
            a: "Yes. Since the process is automated and cost-effective, you can simply record the new workflow and generate a fresh demo in minutes whenever your UI or features change."
        },
        {
            q: "Is there a watermark?",
            a: "No. Your generated demos are completely clean and professional, with no watermarks, ready for use on your official brand channels."
        }
    ];

    return (
        <div className="relative w-full min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-green-500 selection:text-white font-sans text-gray-900 pt-20 md:pt-24">
            
            {/* --- STICKY NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 md:px-12 z-50">
                <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToTop}>
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
                        fontWeight: 700,
                        fontSize: 'clamp(30px, 8.5vw, 70px)'
                    }}
                    className="tracking-tighter text-gray-900 leading-[1] mb-10 max-w-6xl mx-auto"
                >
                    Product walkthroughs in seconds with AI
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-16 font-medium">
                    Turn normal screen recordings into polished, narrated <br className="hidden md:block" />
                    demos you can use to sell, launch, and onboard users
                   
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
                                    src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/inputs/5a400c32-c234-41a6-8227-2ac9b8e6b377.mp4" 
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
                                    src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/c0fb92eb-0b17-4853-a576-98b7f899248b.mp4" 
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


            {/* --- What Can You Use This Tool For? (Grid Reveal) --- */}
            <section className="w-full bg-white py-40">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="mb-20">
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter uppercase">ProductCam Is Built For You</h2>
                        <p className="text-xl text-gray-500 max-w-2xl font-medium leading-relaxed">Instant product videos for your every use case</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            "Landing page video to boost conversions.",
                            "Onboarding walkthroughs to educate new users.",
                            "Product Hunt videos whenever you need it.",
                            "Feature announcements to highlight new capabilities."
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
                                Record - submit <br /> we handle the rest.
                             </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION --- */}
            <section className="w-full bg-gray-50 py-40 border-t border-gray-100 flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-500/[0.03] rounded-full blur-[140px] pointer-events-none"></div>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-24 tracking-tighter text-center px-6 uppercase relative z-10">
                    Loved By Builders
                </h2>
                
                <div className="w-full flex overflow-x-auto gap-8 px-6 md:px-12 pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth relative z-10">
                    {TESTIMONIALS.map((t) => (
                        <div key={t.id} className="shrink-0 snap-center w-[85%] md:w-[450px] transform hover:scale-[1.02] transition-all duration-500">
                            <div className="bg-white rounded-[40px] shadow-2xl shadow-black/[0.05] border border-gray-100 p-8 md:p-10 flex flex-col h-full min-h-[320px]">
                                <div className="flex-1">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed tracking-tight italic">
                                        "{t.message}"
                                    </p>
                                </div>
                                
                                <div className="mt-10 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">{t.name}</span>
                                        <span className="text-sm font-bold text-green-600 uppercase tracking-widest">{t.handle}, {t.role}</span>
                                    </div>
                                    <a 
                                        href={t.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group/x flex items-center gap-3 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-black/10"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">View on X</span>
                                        <XIcon className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
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

            {/* --- WHY I BUILT PRODUCTCAM --- */}
            <section className="w-full bg-gray-50 py-40 border-t border-b border-gray-100 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row gap-16 items-start">
                        <div className="w-full md:w-1/3 flex flex-col items-start space-y-6">
                            <div className="flex items-center gap-6">
                                <img 
                                    src="https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/profile.jpg"
                                    alt="Henry Labs" 
                                    className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-4 border-white rotate-[-6deg] bg-gray-200"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://ui-avatars.com/api/?name=Henry+Labs&background=22c55e&color=fff&size=200";
                                    }}
                                />
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Henry Labs</h3>
                                    <a 
                                        href="https://x.com/Henrylabss" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-600 font-bold hover:underline"
                                    >
                                        @Henrylabss
                                    </a>
                                </div>
                            </div>
                            <div className="pt-4">
                                <a 
                                    href="https://x.com/Henrylabss" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black uppercase tracking-widest text-gray-900 hover:shadow-xl hover:border-green-500 transition-all"
                                >
                                    <XIcon className="w-4 h-4" />
                                    View on X
                                </a>
                            </div>
                        </div>
                        <div className="w-full md:w-2/3">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-10 tracking-tighter uppercase">Why I built ProductCam</h2>
                            <div className="space-y-6">
                                <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                                    I built ProductCam because explaining my SaaS was harder than building it.
                                </p>
                                <p className="text-xl text-gray-500 font-medium leading-relaxed">
                                    ProductCam creates narrated demos that show the value of your app quickly, so users understand your product and want to try it. Use this for landing pages, onboarding, launches, social posts, or investor decks.  If clarity is slowing your growth, ProductCam fixes that.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQS SECTION --- */}
            <section className="w-full bg-white py-40">
                <div className="max-w-4xl mx-auto px-6 md:px-12">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase mb-6">Frequently Asked</h2>
                        <div className="w-20 h-2 bg-green-500 mx-auto rounded-full"></div>
                    </div>

                    <div className="flex flex-col">
                        {faqs.map((faq, idx) => (
                            <FAQItem 
                                key={idx}
                                question={faq.q}
                                answer={faq.a}
                                isOpen={openFaqIndex === idx}
                                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CRAWLABLE FOOTER NAVIGATION --- */}
            <footer className="w-full border-t border-gray-100 bg-white py-20 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                             <span className="font-black text-lg text-gray-900 tracking-tighter uppercase">ProductCam</span>
                        </div>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            The standard for automated software demos. Turn raw captures into launch-ready assets in seconds.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Product</h4>
                        <ul className="flex flex-col gap-4">
                            <li>
                                <a href="https://productcam.site/#/features" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">Features</a>
                            </li>
                            <li>
                                <a href="https://productcam.site/#/pricing-details" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">Pricing Plans</a>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Company</h4>
                        <ul className="flex flex-col gap-4">
                            <li>
                                <a href="https://productcam.site/#/about" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">About ProductCam</a>
                            </li>
                            <li>
                                <a href="https://productcam.site/#/blog" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">Resources & Blog</a>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Trust</h4>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                             <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Global Operations</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ProductCam AI • Built for Builders © 2025</p>
                    </div>
                </div>
                
                <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-center">
                    <a href="https://productcam.site" className="text-[10px] font-black text-gray-300 hover:text-gray-900 transition-colors uppercase tracking-[0.4em]">Home Page</a>
                </div>
            </footer>
            
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
