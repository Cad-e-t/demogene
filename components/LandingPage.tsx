
import React, { useState, useEffect, useRef } from 'react';
import { TESTIMONIALS, LANDING_EXAMPLES } from '../assets';

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

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => (
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
        a: "We offer simple credit-based pricing starting at $5 for 1 full demo. No monthly subscriptions or hidden fees."
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

export const LandingPage: React.FC<LandingPageProps> = ({ onFileChange, handleLogin }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeExampleTab, setActiveExampleTab] = useState<'saas' | 'mobile'>('saas');
    const [exampleAutoPlay, setExampleAutoPlay] = useState(true);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // SEO Optimization
    useEffect(() => {
        document.title = "Product Demo Video Maker for SaaS and Mobile Apps - ProductCam";
        
        const setMeta = (name: string, content: string, attr: string = 'name') => {
            let element = document.querySelector(`meta[${attr}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attr, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const description = "ProductCam is an AI-powered tool that turns your screen recordings into polished product demo videos automatically. Perfect for SaaS and mobile apps, with narrated walkthroughs in minutes.";

        const siteUrl = "https://productcam.site";
        const socialImage = "https://assets.productcam.site/photo/laptop-showing-product-demo.avif";

        setMeta('description', description);
        setMeta('canonical', siteUrl, 'rel'); 
        
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
        setMeta('og:image', socialImage, 'property');
        setMeta('og:url', siteUrl, 'property');
        setMeta('og:type', 'website', 'property');

        // Twitter
        setMeta('twitter:card', 'summary_large_image', 'name');
        setMeta('twitter:title', 'ProductCam - AI Product Demos', 'name');
        setMeta('twitter:description', description, 'name');
        setMeta('twitter:image', socialImage, 'name');

    }, []);

    // FAQ Schema JSON-LD Injection
    useEffect(() => {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      };
    
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(faqSchema);
      document.head.appendChild(script);
    
      return () => {
          if (document.head.contains(script)) {
              document.head.removeChild(script);
          }
      };
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
        <div className="relative w-full min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-sky-500 selection:text-white font-sans text-gray-900">
            
            {/* FLOATING NAVBAR (Pill Shaped) - Sticky - MOVED TO ROOT FOR STACKING CONTEXT FIX */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] md:w-auto md:min-w-[600px] max-w-5xl mx-auto transition-all">
                <div className={`backdrop-blur-md border rounded-full px-6 py-3 shadow-2xl flex items-center justify-between transition-all duration-300 ${isScrolled ? 'bg-white/90 border-gray-200' : 'bg-white/10 border-white/10'}`}>
                        {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={scrollToTop}>
                        <span className={`font-black text-lg tracking-tighter uppercase drop-shadow-md transition-colors duration-300 ${isScrolled ? 'text-gray-900' : 'text-white'}`}>ProductCam</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-5">
                        <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className={`text-xs font-bold uppercase tracking-widest transition-colors drop-shadow-sm ${isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white hover:text-white/80'}`}>How it Works</a>
                        <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }} className={`text-xs font-bold uppercase tracking-widest transition-colors drop-shadow-sm ${isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white hover:text-white/80'}`}>Pricing</a>
                        <a href="#/blog" className={`text-xs font-bold uppercase tracking-widest transition-colors drop-shadow-sm ${isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white hover:text-white/80'}`}>Blog</a>
                        <button onClick={handleLogin} className={`px-5 py-2 text-xs font-black rounded-full transition-all uppercase tracking-widest shadow-lg ${isScrolled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'}`}>
                            Get Started
                        </button>
                    </div>

                        {/* Mobile Menu Toggle */}
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`md:hidden p-1 transition-colors ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
                        {isMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                        </button>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl p-4 shadow-2xl flex flex-col gap-2 md:hidden">
                            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="text-gray-900 font-bold px-4 py-3 hover:bg-gray-50 rounded-xl">How it Works</a>
                            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }} className="text-gray-900 font-bold px-4 py-3 hover:bg-gray-50 rounded-xl">Pricing</a>
                            <a href="#/blog" className="text-gray-900 font-bold px-4 py-3 hover:bg-gray-50 rounded-xl">Blog</a>
                            <button onClick={handleLogin} className="w-full text-center bg-black text-white font-black px-4 py-3 rounded-xl uppercase tracking-widest mt-2">Get Started</button>
                    </div>
                )}
            </div>

            {/* --- HERO SECTION --- */}
            <div className="relative z-10 w-full bg-black text-white overflow-hidden flex flex-col items-center min-h-screen justify-center">
                
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                     <img 
                        src="https://assets.productcam.site/photo/laptop-showing-product-demo.avif" 
                        alt="Product Demo on Laptop" 
                        className="w-full h-full object-cover"
                     />
                     <div className="absolute inset-0 bg-black/50"></div>
                     <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
                </div>

                <div className="relative z-10 max-w-[1700px] mx-auto px-6 md:px-12 flex flex-col items-center w-full h-full justify-center pt-24 pb-12">
                    <div className="w-full flex flex-col items-center text-center">
                        <h1 
                            style={{ 
                                fontFamily: "'Inter', sans-serif", 
                                fontWeight: 300,
                                fontSize: 'clamp(40px, 7vw, 72px)',
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }}
                            className="mb-8 w-full max-w-none drop-shadow-2xl"
                        >
                          Launching without a demo video? <br />
                          Create one in 5 minutes
                        </h1>
                        
                        <p className="text-lg md:text-xl text-white max-w-5xl leading-relaxed mb-10 font-medium tracking-tight drop-shadow-lg">
                         We add professional voiceover, auto-zoom, and pacing automatically. No editing skills or software needed
                        </p>

                        <button 
                            onClick={handleLogin} 
                            className="group relative cursor-pointer w-full sm:w-auto transform hover:scale-[1.02] active:scale-95 transition-all duration-500 mb-12 shadow-2xl"
                        >
                            <div className="absolute -inset-2 bg-white rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition duration-500"></div>
                            <div className="relative flex items-center justify-center gap-5 px-10 py-5 bg-white text-sky-600 rounded-[2rem] hover:bg-white hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.4)] transition-all duration-300 shadow-2xl border border-white/40">
                                <span className="font-black text-xl uppercase tracking-tighter">Start For Free</span>
                                <svg className="w-6 h-6 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                </svg>
                            </div>
                        </button>

                        {/* --- TESTIMONIALS --- */}
                        <div className="w-full relative">
                            <div className="relative">
                                <div className="w-fit max-w-full mx-auto flex overflow-x-auto gap-6 px-4 md:px-0 pb-4 snap-x snap-mandatory no-scrollbar scroll-smooth">
                                    {TESTIMONIALS.map((t) => (
                                        <div key={t.id} className="shrink-0 snap-center w-[300px] md:w-[400px] transform hover:scale-[1.02] transition-all duration-500">
                                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex flex-col h-full hover:bg-white/10 transition-colors shadow-lg">
                                                <div className="flex-1 text-left">
                                                    <p className="text-base font-medium text-gray-200 leading-relaxed italic drop-shadow-sm">
                                                        "{t.message}"
                                                    </p>
                                                </div>
                                                
                                                <div className="mt-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-sm font-bold text-white uppercase tracking-tight drop-shadow-sm">{t.name}</span>
                                                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest drop-shadow-sm">{t.handle}</span>
                                                        </div>
                                                    </div>
                                                    <a 
                                                        href={t.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Mobile Scroll Hint Arrow */}
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 md:hidden pointer-events-none">
                                    <div className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl animate-pulse">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EXAMPLE SECTION --- */}
            <div id="example" className="w-full bg-gray-50/50 pt-20 pb-20 scroll-mt-24 border-t border-b border-gray-100 relative overflow-hidden">
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center">
                    
                    {/* Toggle Buttons */}
                    <div className="flex p-1.5 bg-white border border-gray-200 rounded-xl shadow-sm relative mb-10">
                        <button 
                            onClick={() => setActiveExampleTab('saas')}
                            className={`px-8 py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${activeExampleTab === 'saas' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            SaaS
                        </button>
                        <button 
                            onClick={() => setActiveExampleTab('mobile')}
                            className={`px-8 py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${activeExampleTab === 'mobile' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            Mobile App
                        </button>
                    </div>

                    {LANDING_EXAMPLES.length >= 2 && (
                        <div className="w-full flex flex-col items-center">
                            <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border border-gray-200 w-full group/video">
                                <video 
                                    key={activeExampleTab}
                                    src={activeExampleTab === 'saas' ? LANDING_EXAMPLES[0].outputUrl : LANDING_EXAMPLES[1].outputUrl} 
                                    className="w-full h-full object-contain bg-black"
                                    controls
                                    playsInline
                                    muted={isMuted}
                                    preload="metadata"
                                    autoPlay={exampleAutoPlay}
                                />
                                
                                {/* Sound Prompt Overlay - hidden if unmuted */}
                                {isMuted && (
                                    <button 
                                        onClick={() => setIsMuted(false)}
                                        className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-20 animate-pulse hover:bg-black/80 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-4 0h-2.5l-5 5v5.5h5l5 5v-15.5zm2 5.5v5c1.4-.46 2.4-1.63 2.4-3.08.01-1.13-.65-2.13-1.66-2.58l-.74.66z"/></svg>
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Turn on sound to hear the difference</span>
                                        </div>
                                    </button>
                                )}
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
                    
                    {/* Updated Layout: Vertical on mobile/tablet, Grid on Desktop (lg) */}
                    <div className="relative flex flex-col lg:grid lg:grid-cols-3 gap-32 lg:gap-8">
                        
                        {/* Step 1 - Left */}
                        <div className="flex flex-col md:flex-row lg:flex-col items-center gap-12 lg:gap-0 relative col-span-1">
                            <div className="w-full md:w-1/2 lg:w-full order-2 md:order-1 lg:order-1 h-full">
                                <div className="group relative bg-gray-50 rounded-[48px] p-12 md:p-16 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] h-full">
                                    <div className="absolute -top-10 -left-6 w-20 h-20 rounded-3xl bg-green-600 text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-green-600/40 rotate-[-12deg]">1</div>
                                    <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">Record your screen</h3>
                                    <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                        Just click through your app like you'd normally use it.
                                    </p>
                                </div>
                            </div>
                            {/* Decorative SVG hidden on LG grid layout */}
                            <div className="hidden md:block lg:hidden w-1/2 order-1 md:order-2 opacity-10">
                                <svg className="w-full h-auto text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/></svg>
                            </div>
                        </div>

                        {/* Step 2 - Right */}
                        <div className="flex flex-col md:flex-row lg:flex-col items-center gap-12 lg:gap-0 relative col-span-1">
                            {/* Decorative SVG hidden on LG grid layout */}
                            <div className="hidden md:block lg:hidden w-1/2 opacity-10">
                                <svg className="w-full h-auto text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                            </div>
                            <div className="w-full md:w-1/2 lg:w-full h-full">
                                <div className="group relative bg-gray-900 rounded-[48px] p-12 md:p-16 border border-gray-800 shadow-2xl hover:scale-[1.02] transition-all duration-500 h-full">
                                    <div className="absolute -top-10 -right-6 w-20 h-20 rounded-3xl bg-white text-green-600 flex items-center justify-center font-black text-4xl shadow-2xl rotate-[12deg]">2</div>
                                    <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-8">We turn it into a demo</h3>
            
                                    <p className="text-xl text-white leading-relaxed font-medium">
                                         Script, voiceover, smart zooms, and clean pacing are added automatically
                                    </p>
                                      
                                </div>
                            </div>
                        </div>

                        {/* Step 3 - Center */}
                        <div className="flex justify-center lg:block relative pt-12 lg:pt-0 col-span-1">
                            <div className="w-full max-w-2xl lg:max-w-none lg:w-full h-full">
                                <div className="group relative bg-white rounded-[48px] p-12 md:p-16 border-2 border-green-500/10 shadow-2xl hover:shadow-green-500/10 transition-all duration-500 hover:scale-[1.05] h-full">
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-5xl shadow-2xl shadow-green-600/30">3</div>
                                    <div className="text-center mt-6">
                                        <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">Download & Ship</h3>
                                        <p className="text-xl text-gray-500 leading-relaxed font-medium">
                                            Download a demo you can ship immediately to your landing page or socials
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
                            "App Tutorials",
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

            {/* --- Final CTA / Pricing --- */}
            <div id="pricing" className="w-full bg-white py-32 flex flex-col items-center justify-center border-t border-gray-100 px-6 relative overflow-hidden scroll-mt-24">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-green-500/[0.05] rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
                
                <h2 className="text-4xl md:text-7xl font-black text-gray-900 mb-16 tracking-tighter text-center uppercase relative z-10 leading-none">
                    Ready to Create <br /> Your First Demo?
                </h2>
                
                <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                
                    {/* BASIC PLAN */}
                    <div className="bg-white border-2 border-gray-200 rounded-[40px] p-8 shadow-sm flex flex-col items-center text-center relative group hover:border-gray-300 transition-colors">
                        
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mt-4 mb-2">Basic</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">For solo founders</p>
                        
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-5xl font-black text-gray-900">$5</span>
                            <span className="text-base text-gray-400 font-bold uppercase tracking-widest">/Pack</span>
                        </div>

                        <div className="w-full space-y-4 mb-10 text-left">
                            {[
                                { text: "1 Full Demo", bold: "Starter pack" },
                                { text: "Watermark-free export", bold: "Clean" },
                                { text: "AI-Narrated voiceovers", bold: "Standard" },
                                { text: "Smart zooms & pacing", bold: "Auto" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        <span className="text-gray-900 font-bold">{item.bold}</span> - {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleLogin}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all transform active:scale-[0.98] uppercase tracking-tighter mt-auto"
                        >
                            Sign in to get
                        </button>
                    </div>

                    {/* PREMIUM PLAN - FEATURED */}
                    <div className="bg-white border-[3px] border-green-600 rounded-[40px] p-8 shadow-2xl shadow-green-500/10 flex flex-col items-center text-center relative overflow-hidden group scale-105 z-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
                        
                        <div className="absolute top-6 left-1/2 -translate-x-1/2">
                            <span className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-600/20">
                                Most Popular
                            </span>
                        </div>
                        
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mt-8 mb-2">Premium</h2>
                        <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-6">For launches & growth</p>
                        
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-6xl font-black text-gray-900">$19</span>
                            <span className="text-xl text-gray-400 font-bold uppercase tracking-widest">/Pack</span>
                        </div>

                        <div className="w-full space-y-4 mb-10 text-left">
                            {[
                                { text: "5 Demo Credits", bold: "Growth pack" },
                                { text: "Everything in Basic", bold: "Inclusive" },
                                { text: "Full walkthrough demos", bold: "Complete" },
                                { text: "Create app tutorials", bold: "Tutorials" },
                                { text: "Test different versions", bold: "Variety" },
                                { text: "Best value per demo", bold: "Economical" },
                                { text: "Priority Processing", bold: "Fast" },
                                { text: "Credits never expire", bold: "Forever" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium">
                                        <span className="text-gray-900 font-bold">{item.bold}</span> - {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleLogin}
                            className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 transform active:scale-[0.98] uppercase tracking-tighter mt-auto"
                        >
                            Sign in to get
                        </button>
                    </div>

                    {/* PRO PLAN */}
                    <div className="bg-white border-2 border-gray-200 rounded-[40px] p-8 shadow-sm flex flex-col items-center text-center relative group hover:border-gray-300 transition-colors">
                        
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mt-4 mb-2">Pro</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">For teams & heavy usage</p>
                        
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-5xl font-black text-gray-900">$49</span>
                            <span className="text-base text-gray-400 font-bold uppercase tracking-widest">/Pack</span>
                        </div>

                        <div className="w-full space-y-4 mb-10 text-left">
                            {[
                                { text: "15 Demo Credits", bold: "Power pack" },
                                { text: "Everything in Premium", bold: "Inclusive" },
                                { text: "Early feature access", bold: "Beta" },
                                { text: "Direct Founder Support", bold: "VIP" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        <span className="text-gray-900 font-bold">{item.bold}</span> - {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleLogin}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all transform active:scale-[0.98] uppercase tracking-tighter mt-auto"
                        >
                            Sign in to get
                        </button>
                    </div>

                </div>

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
                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-10 tracking-tighter uppercase"> I built ProductCam because selling my app was harder than building it</h3>
                            <div className="space-y-6">
                                <p className="text-xl text-gray-500 font-medium leading-relaxed">
                                    ProductCam shows the value of your app quickly so users understand your product and want to try it. Use this for landing pages, onboarding, launches, social posts. {'Showing > Telling'}
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
                                     <span className="font-black text-2xl uppercase tracking-tighter">Start For Free</span>
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
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
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
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Socials</h4>
                        <ul className="flex flex-col gap-4">
                            <li>
                                <a href="https://www.producthunt.com/products/productcam" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">Product Hunt</a>
                            </li>
                            <li>
                                <a href="https://trustmrr.com/startup/productcam" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">Trust MRR</a>
                            </li>
                            <li>
                                <a href="https://x.com/productcam" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-400 hover:text-green-600 transition-colors uppercase tracking-tight">X</a>
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
