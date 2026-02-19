
import React, { useState } from 'react';
import { CreatorPricingCards } from './CreatorPricingCards';

const YouTubeIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.88-2.91 6.52-1.78 1.63-4.15 2.5-6.55 2.29-2.31-.2-4.47-1.42-5.92-3.29-1.49-1.93-2.1-4.43-1.66-6.83.43-2.39 2.02-4.43 4.15-5.46 1.05-.5 2.19-.77 3.34-.78v4.01c-.57.02-1.14.15-1.65.39-.77.37-1.4 1-1.69 1.79-.29.79-.26 1.67.09 2.44.35.77 1 1.38 1.78 1.66.79.28 1.67.25 2.44-.1.76-.36 1.39-.99 1.66-1.78.27-.79.25-1.66-.09-2.44-.06-.13-.13-.26-.21-.38v-8.3c1.12.01 2.23.01 3.35.01z"/>
    </svg>
);

const FAQS = [
    { q: "How do credits work?", a: "Credits are the currency for creating content. Images, voiceovers, and video rendering consume credits based on quality and duration. A typical 30-second video uses about 40-60 credits." },
    { q: "Do credits expire?", a: "No. Your credits are yours forever. They roll over indefinitely until you use them." },
    { q: "Can I use the videos commercially?", a: "Yes. You have full commercial rights to all content you generate on the platform." },
    { q: "What happens if I run out of credits?", a: "You can purchase more credits at any time. We don't charge monthly subscriptions, so you only pay for what you use." },
    { q: "Is there a watermark?", a: "No. All paid credit tiers generate watermark-free videos." }
];

export const ContentLanding = ({ onLogin }: { onLogin: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const scrollToPricing = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('pricing');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="relative w-full min-h-screen bg-black text-white overflow-x-hidden flex flex-col font-sans">
            
            {/* Background Gradients */}
            {/* Base Blue Gradient - Lighter side (top-left) noticeably brighter */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-black z-0 pointer-events-none fixed"></div>
            
            {/* Decorative Blobs */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-sky-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* --- CANVAS HEADER --- */}
            {/* Removed max-w-7xl mx-auto, increased padding to edges */}
            <header className="absolute top-0 left-0 right-0 z-50 w-full px-6 pt-8 md:px-12 flex items-center justify-between">
                {/* Top Left: App Name */}
                <div className="flex items-center gap-2 cursor-pointer z-10" onClick={() => window.location.href = '/'}>
                    <span className="font-black text-lg tracking-tighter uppercase text-white">ProductCam Creator</span>
                </div>

                {/* Top Center: Nav Links (Desktop) */}
                <nav className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
                    <a href="/" className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Home</a>
                    <a href="#pricing" onClick={scrollToPricing} className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Pricing</a>
                </nav>

                {/* Top Right: CTA (Desktop) & Mobile Toggle */}
                <div className="flex items-center gap-4 z-10">
                    <button 
                        onClick={onLogin} 
                        className="hidden md:block text-sm font-bold uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
                    >
                        Get Started
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        {isMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-10 md:hidden animate-fade-in">
                    <a href="/" className="text-2xl font-black uppercase tracking-tighter text-white">Home</a>
                    <button onClick={scrollToPricing} className="text-2xl font-black uppercase tracking-tighter text-white">Pricing</button>
                    <button onClick={onLogin} className="text-2xl font-black uppercase tracking-tighter text-sky-400">Get Started</button>
                    
                    <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-6 p-2 text-gray-500 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* --- HERO --- */}
            <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6 pt-32 pb-12 w-full max-w-7xl mx-auto">
                
                <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
                    
                    {/* Headline */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-8 leading-tight md:leading-tight">
                        Your AI Content Team <br className="hidden md:block" /> On Autopilot
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg md:text-2xl text-gray-400 font-medium max-w-2xl leading-relaxed mb-12">
                        Create viral videos for YouTube, TikTok, and Instagram automatically. Grow your reach daily while you build so you have an audience before you need one.
                    </p>

                    {/* Primary CTA - Updated to slightly deeper blue */}
                    <button 
                        onClick={onLogin}
                        className="group relative px-10 py-5 bg-blue-600 text-white rounded-full font-black text-lg md:text-xl uppercase tracking-widest hover:scale-105 hover:bg-blue-500 transition-all duration-300 shadow-[0_0_50px_-10px_rgba(37,99,235,0.4)] mb-16"
                    >
                        <span className="relative z-10">Start Creating</span>
                        <div className="absolute inset-0 rounded-full bg-blue-600 blur-lg opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    </button>

                    {/* Footer Info Container (Platforms + Social Proof) */}
                    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
                        
                        {/* Supported Platforms - Colored Icons */}
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Supported Platforms</span>
                            <div className="flex items-center gap-6 text-gray-300">
                                <div className="flex items-center gap-2 group cursor-default">
                                    <YouTubeIcon className="w-5 h-5 md:w-6 md:h-6 text-[#FF0000] group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-sm md:text-base group-hover:text-white transition-colors">YouTube</span>
                                </div>
                                <div className="flex items-center gap-2 group cursor-default">
                                    <InstagramIcon className="w-5 h-5 md:w-6 md:h-6 text-[#E1306C] group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-sm md:text-base group-hover:text-white transition-colors">Instagram</span>
                                </div>
                                <div className="flex items-center gap-2 group cursor-default">
                                    <TikTokIcon className="w-5 h-5 md:w-6 md:h-6 text-[#00F2EA] group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-sm md:text-base group-hover:text-white transition-colors">TikTok</span>
                                </div>
                            </div>
                        </div>

                        {/* Social Proof */}
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Trusted by Creators</span>
                            <div className="flex items-center -space-x-3">
                                {[
                                    "https://i.pravatar.cc/100?img=33",
                                    "https://i.pravatar.cc/100?img=47",
                                    "https://i.pravatar.cc/100?img=12",
                                    "https://i.pravatar.cc/100?img=5"
                                ].map((src, i) => (
                                    <img 
                                        key={i} 
                                        src={src} 
                                        alt="Creator" 
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black object-cover shadow-lg" 
                                    />
                                ))}
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold text-white z-10">
                                    +2k
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* --- SECTION 2: DEMO VIDEO (Below Fold) --- */}
            <div className="relative z-10 w-full px-6 md:px-12 py-24 bg-transparent">
                <div className="w-full rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                    <video 
                        src="https://assets.productcam.site/outputs/881d7f2a-8379-488d-ad86-04acd51a8421.mp4" 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                        className="w-full h-auto block bg-black"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* --- SECTION 3: PRICING --- */}
            <div id="pricing" className="relative z-10 w-full bg-white text-gray-900 py-32 px-6 md:px-12 scroll-mt-20">
                <div className="flex flex-col items-center text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-slate-900">
                        Start Your Studio
                    </h2>
                    <p className="text-xl font-medium text-slate-500 max-w-2xl">
                        Simple credit packs. No subscriptions. Pay only when you create.
                    </p>
                </div>
                
                <CreatorPricingCards 
                    onAction={onLogin} 
                    actionLabel="Sign In to Get" 
                />
            </div>

            {/* --- SECTION 4: FAQ --- */}
            <div className="relative z-10 w-full bg-slate-50 text-gray-900 py-32 px-6 md:px-12 border-t border-slate-200">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-slate-900">
                            Common Questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((item, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all hover:shadow-lg">
                                <button 
                                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-bold text-lg text-slate-900">{item.q}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 transition-transform ${openFaqIndex === i ? 'rotate-180 bg-blue-100 text-blue-600' : 'text-slate-400'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-6 pt-0 text-slate-500 font-medium leading-relaxed">
                                        {item.a}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 w-full bg-white border-t border-slate-200 py-12 px-6 md:px-12 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    ProductCam Creator © 2025
                </p>
            </div>

        </div>
    );
};
