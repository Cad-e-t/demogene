



import React, { useState, useEffect } from 'react';
import { TESTIMONIALS, LANDING_GALLERY_VIDEOS } from '../assets';

interface LandingPageProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLogin: () => void;
    showAuthModal?: boolean; 
}

const INPUT_DEMO_URL = "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/inputs/8b6f6fb1-3df0-425e-82ef-3d150d06491a.mp4";

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
    const [demoMode, setDemoMode] = useState<'input' | 'output'>('output');

    // SEO Optimization
    useEffect(() => {
        document.title = "AI Product Demo Video Maker for SaaS and Mobile Apps";
        
        const setMeta = (name: string, content: string, attr: string = 'name') => {
            let element = document.querySelector(`meta[${attr}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attr, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const description = "Create polished product demo videos in minutes with ProductCam. Record your screen and let our AI turn it into a professional walkthrough automatically. No editing required.";

        const ogImage = "https://assets.productcam.site/productcam-walkthrough.mp4"; // Using a video thumbnail would be ideal, falling back to a representative asset if static image is preferred. Using gallery video for now or specific OG image.
        const siteUrl = "https://productcam.site";

        setMeta('description', description);
        setMeta('canonical', siteUrl, 'rel'); // Handling canonical link via helper is tricky if attr is rel, adjusting logic below or just manually adding if needed. Actually canonical is usually a link tag.
        
        // Canonical Tag
        let link = document.querySelector("link[rel='canonical']");
        if (!link) {
            link = document.createElement("link");
            link.setAttribute("rel", "canonical");
            document.head.appendChild(link);
        }
        link.setAttribute("href", siteUrl);

        // Open Graph
        setMeta('og:title', 'ProductCam - Automated AI Product Demo Generator', 'property');
        setMeta('og:description', description, 'property');
        setMeta('og:image', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', 'property');
        setMeta('og:url', siteUrl, 'property');
        setMeta('og:type', 'website', 'property');

        // Twitter
        setMeta('twitter:card', 'summary_large_image', 'name');
        setMeta('twitter:title', 'ProductCam - AI Product Demos', 'name');
        setMeta('twitter:description', description, 'name');
        setMeta('twitter:image', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', 'name');

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
            a: "Use it whenever you need to explain your product's value: landing pages, onboarding sequences, feature announcements, social media updates, app store preview, investor decks, or Product Hunt launches."
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
            a: "ProductCam is specifically designed for web applications, software dashboards, SaaS tools, mobile apps, and digital workflows that can be demonstrated via a screen capture."
        },
        {
            q: "How much does it cost?",
            a: "We offer simple credit-based pricing. A single demo costs $3, or you can purchase a pack of 10 demos for $12. No monthly subscriptions or hidden fees."
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
        <div className="relative w-full min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-sky-500 selection:text-white font-sans text-gray-900 pt-20 md:pt-24">
            
            {/* --- STICKY NAVBAR (CENTERED & STYLISH) --- */}
            <nav className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 flex items-center z-50 px-6 md:px-12">
                <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between relative">
                    {/* Left: Branding */}
                    <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={scrollToTop}>
                        <span className="font-black text-xl text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </div>

                    {/* Center: Inspiring Text (Hidden on small screens) */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
                        <span className="text-sm font-semibold text-gray-400 italic tracking-wide uppercase">
                            Show Don't Tell
                        </span>
                    </div>

                    {/* Right: CTA Button */}
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={handleLogin} 
                            className="hidden md:block md:relative md:px-7 md:py-2.5 md:bg-green-600 md:text-white md:text-xs md:font-black md:rounded-full md:hover:bg-green-500 md:transition-all md:duration-300 md:border md:border-green-500/10 md:uppercase md:tracking-widest md:shadow-[0_10px_20px_-5px_rgba(34,197,94,0.4)] md:hover:shadow-[0_15px_30px_-5px_rgba(34,197,94,0.6)] md:hover:-translate-y-0.5"
                        >
                            Sign up free
                        </button>
                        
                        {/* Mobile Menu Icon */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-gray-400 hover:text-black transition-colors md:hidden"
                        >
                            {isMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-20 left-0 right-0 bg-white border-b border-gray-100 shadow-2xl flex flex-col p-6 gap-4 animate-fade-in md:hidden">
                        <a 
                            href="#how-it-works"
                            onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}
                            className="w-full text-left px-4 py-4 rounded-lg text-lg font-black text-gray-500 hover:bg-gray-50 uppercase tracking-widest"
                        >
                            How it Works
                        </a>
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

            {/* --- HERO SECTION (WIDE & ACCESSIBLE NAV) --- */}
            <div className="relative z-10 w-full bg-black text-white overflow-hidden">
                <div className="max-w-[1700px] mx-auto px-6 md:px-12 pt-20 pb-32 md:pb-56 flex flex-col items-center">
                    
                    {/* Hero-Embedded Navigation Row (Left Aligned) */}
                    <div className="w-full hidden md:flex justify-start items-center gap-12 mb-24 opacity-80">
                        <a 
                            href="#how-it-works"
                            onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} 
                            className="text-xs font-black text-white/70 hover:text-white transition-colors uppercase tracking-[0.2em]"
                        >
                            How it Works
                        </a>
                        <a 
                            href="#/blog" 
                            className="text-xs font-black text-white/70 hover:text-white transition-colors uppercase tracking-[0.2em]"
                        >
                            Blog
                        </a>
                    </div>

                    <div className="w-full flex flex-col md:flex-row items-center gap-16 lg:gap-24">
                        {/* Hero Text Column (Indented relative to Nav Row) */}
                        <div className="w-full md:w-1/2 flex flex-col items-start text-left md:pl-16 lg:pl-24">
                            <h1 
                                style={{ 
                                    fontFamily: "'Poppins', sans-serif", 
                                    fontWeight: 700,
                                    fontSize: 'clamp(36px, 9vw, 72px)',
                                    lineHeight: 1.05,
                                    letterSpacing: '-0.04em'
                                }}
                                className="mb-10 drop-shadow-sm"
                            >
                                Product walkthroughs in minutes with AI
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-white/90 max-w-lg leading-relaxed mb-14 font-medium tracking-tight opacity-90">
                               Create professional videos and guides for any product in minutes, with just a simple screen recording.
                            </p>
                            
                            <button 
                                onClick={handleLogin} 
                                className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] active:scale-95 transition-all duration-500"
                            >
                                <div className="absolute -inset-2 bg-white rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition duration-500"></div>
                                <div className="relative flex items-center justify-center gap-5 px-14 py-6 bg-white text-sky-600 rounded-[2rem] hover:bg-white hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.4)] transition-all duration-300 shadow-2xl border border-white/40">
                                    <span className="font-black text-2xl uppercase tracking-tighter">Continue</span>
                                    <svg className="w-7 h-7 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                    </svg>
                                </div>
                            </button>
                        </div>

                        {/* Hero Video/Image Column */}
                        <div className="w-full md:w-1/2 relative px-4 md:px-0">
                            <div className="relative aspect-video group transition-transform duration-700 hover:rotate-1">
                                <img 
                                 src="https://assets.productcam.site/photo/laptop-showing-product-demo.avif" 
                                 alt="Product Demo on Screen" 
                                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-sky-900/10 via-transparent to-transparent pointer-events-none"></div>
                            </div>
                            {/* Decorative background glow behind video */}
                            <div className="absolute -inset-20 bg-white/20 blur-[120px] rounded-full -z-10 opacity-60"></div>
                            
                        </div>
                    </div>
                </div>
            </div>

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
                                    <div className="flex items-center gap-4">
                                        <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">{t.name}</span>
                                            <span className="text-sm font-bold text-green-600 uppercase tracking-widest">{t.handle}, {t.role}</span>
                                        </div>
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

            {/* --- SEE EXAMPLE SECTION (FOCUSED SINGLE ITEM) --- */}
            <div id="example" className="w-full bg-gray-50/50 pt-32 pb-40 scroll-mt-24 border-t border-b border-gray-100 relative overflow-hidden">
                <div className="w-full px-6 md:px-12 lg:px-24 mb-16 flex flex-col items-center text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase">See Example</h2>
                    <div className="w-24 h-2 bg-green-500 mt-6 rounded-full"></div>
                </div>

                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center">
                     {LANDING_GALLERY_VIDEOS.length > 0 && (
                        <div className="w-full group cursor-pointer flex flex-col items-center">
                            <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border border-gray-200 group-hover:shadow-green-500/10 transition-all duration-500 w-full">
                                <video 
                                    key={demoMode}
                                    src={demoMode === 'input' ? INPUT_DEMO_URL : LANDING_GALLERY_VIDEOS[0].url} 
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                    muted={demoMode === 'input'}
                                    preload="metadata"
                                />
                            </div>
                            
                            <div className="mt-10 flex p-1.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <button 
                                    onClick={() => setDemoMode('input')}
                                    className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${demoMode === 'input' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    Raw Input
                                </button>
                                <button 
                                    onClick={() => setDemoMode('output')}
                                    className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${demoMode === 'output' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    Polished Output
                                </button>
                            </div>
                        </div>
                     )}
                </div>
            </div>

            {/* --- How it works (Staggered Card Layout) --- */}
            <div id="how-it-works" className="w-full bg-white py-40 scroll-mt-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex flex-col items-center text-center mb-32">
                        <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tighter uppercase">How it works</h2>
                    </div>
                    
                    <div className="relative flex flex-col gap-32">
                        
                        {/* Step 1 - Left */}
                        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative">
                            <div className="w-full md:w-1/2 order-2 md:order-1">
                                <div className="group relative bg-gray-50 rounded-[48px] p-12 md:p-16 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                                    <div className="absolute -top-10 -left-6 w-20 h-20 rounded-3xl bg-green-600 text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-green-600/40 rotate-[-12deg]">1</div>
                                    <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">Record your screen</h3>
                                    <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                        Just click through your product like you'd normally use it.
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
                                            Download a demo you can ship immediately to your landing page or socials.
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
                            "Landing page videos",
                            "Onboarding walkthroughs",
                            "Product Hunt videos",
                            "Feature announcements",
                            "App Store preview"
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
                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-10 tracking-tighter uppercase"> I built ProductCam because selling my SaaS was harder than building it</h3>
                            <div className="space-y-6">
                                <p className="text-xl text-gray-500 font-medium leading-relaxed">
                                    ProductCam creates narrated demos that show the value of your app quickly so users understand your product and want to try it. Use this for landing pages, onboarding, launches, social posts, & investor decks. {'Showing > Telling'}
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

            {/* --- NEW FINAL CTA SECTION --- */}
            <div className="w-full px-6 md:px-12 py-20 bg-white">
                <div className="relative w-full max-w-[1700px] mx-auto h-[600px] rounded-[48px] overflow-hidden flex items-center shadow-2xl">
                     {/* Background Image */}
                     <div className="absolute inset-0 z-0">
                         <img 
                            src="https://assets.productcam.site/photo/laptop-image.jpg" 
                            alt="Classic saas Laptop image" 
                            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[2s]"
                         />
                         <div className="absolute inset-0 bg-black/60"></div>
                     </div>

                     {/* Content using Hero Layout Structure */}
                     <div className="relative z-10 w-full px-6 md:px-12">
                         <div className="w-full md:w-1/2 flex flex-col items-start text-left md:pl-16 lg:pl-24">
                             <h2 
                                style={{ 
                                    fontFamily: "'Poppins', sans-serif", 
                                    fontWeight: 700,
                                    letterSpacing: '-0.04em'
                                }}
                                className="text-4xl md:text-6xl text-white mb-8 drop-shadow-sm leading-tight"
                             >
                                Start Making Beautiful Product Videos
                             </h2>
                             
                             <p className="text-xl md:text-2xl text-white/90 max-w-lg leading-relaxed mb-12 font-medium tracking-tight opacity-90">
                                Record your screen. ProductCam turns it into a polished walkthrough automatically.
                             </p>
                             
                             <button 
                                 onClick={handleLogin} 
                                 className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] active:scale-95 transition-all duration-500"
                             >
                                 <div className="absolute -inset-2 bg-white rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition duration-500"></div>
                                 <div className="relative flex items-center justify-center gap-5 px-14 py-6 bg-white text-sky-600 rounded-[2rem] hover:bg-white hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.4)] transition-all duration-300 shadow-2xl border border-white/40">
                                     <span className="font-black text-2xl uppercase tracking-tighter">Begin Now</span>
                                     <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                     </svg>
                                 </div>
                             </button>
                         </div>
                     </div>
                </div>
            </div>

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
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}} />
        </div>
    );
};
