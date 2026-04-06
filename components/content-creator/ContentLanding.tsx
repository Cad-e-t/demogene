
import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { CreatorPricingCards } from './CreatorPricingCards';
import { channels,LANDING_PREVIEWS, STYLE_PREVIEWS, DEMO_CLIPS } from './creator-assets';

const ChannelCard: React.FC<{ channel: typeof channels[0] }> = ({ channel }) => {
    const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);

    useEffect(() => {
        if (!channel.thumbnails || channel.thumbnails.length === 0) return;
        
        const interval = setInterval(() => {
            setCurrentThumbnailIndex((prev) => (prev + 1) % channel.thumbnails!.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [channel.thumbnails]);

    return (
        <a 
            href={channel.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none w-[360px] md:w-[420px] h-[500px] bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:border-white/30 hover:bg-zinc-800/80 transition-all duration-300 group snap-center hover:-translate-y-2 shadow-xl flex flex-col"
        >
            {/* Thumbnail Area */}
            <div className="w-full h-56 rounded-2xl overflow-hidden mb-6 relative bg-black border border-white/5 shrink-0">
                {channel.thumbnails?.map((thumb, idx) => (
                    <img 
                        key={idx}
                        src={thumb}
                        alt={`${channel.name} thumbnail ${idx + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                            idx === currentThumbnailIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                ))}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                
                {/* YouTube Icon Badge */}
                <div className="absolute bottom-3 right-3 bg-red-600 text-white p-1.5 rounded-lg shadow-lg">
                    <YouTubeIcon className="w-4 h-4" />
                </div>
            </div>

            {/* Channel Info */}
            <div className="flex items-center gap-4 mb-auto">
                <div className="relative shrink-0">
                    <div className="p-0.5 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600">
                        <img 
                            src={channel.profilePic} 
                            alt={channel.name} 
                            className="w-14 h-14 rounded-full object-cover border-2 border-black"
                        />
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black uppercase tracking-tight truncate group-hover:text-yellow-400 transition-colors">
                        {channel.name}
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono truncate">{channel.handle}</p>
                </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-6">
                <div className="px-4 py-1.5 bg-black/50 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-300 border border-white/5">
                    {channel.subs}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-400 group-hover:translate-x-1 transition-transform">
                    View Channel →
                </span>
            </div>
        </a>
    );
};

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
    { q: "Do credits expire?", a: "We currently offer a pay-as-you go service, so your credits are yours forever. They roll over indefinitely until you use them." },
    { q: "Can I use the videos commercially?", a: "Yes. You have full commercial rights to all content you generate on the platform." },
    { q: "What happens if I run out of credits?", a: "You can purchase more credits at any time. We don't charge monthly subscriptions, so you only pay for what you use." },
    { q: "Is there a watermark?", a: "No. All paid credit tiers generate watermark-free videos." },
    { q: "Do we offer free trials?", a: "Since it costs us real computing power to generate each unique video, we don't offer a free trial at the moment. However, our entry-level pack is designed to be super affordable so you can test the waters without a big commitment!" },
    { q: "Are my payments secure?", a: "Absolutely. We use Dodo Payments, a highly secure platform trusted by Stripe, to handle all transactions. Your sensitive payment info never even touches our servers." },
    { q: "Can I get a refund?", a: "We want you to be happy! If you have unused credits and it's been less than 30 days since your purchase, just reach out and we'll happily process a refund for you." }
];

export const ContentLanding = ({ onLogin, onNavigate }: { onLogin: () => void, onNavigate?: (path: string) => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [galleryStyles, setGalleryStyles] = useState(['Anime','Realistic', 'Stickman']);

    const handleVideoClick = (index: number) => {
        if (index === 1) return; // Already center
        const newStyles = [...galleryStyles];
        const temp = newStyles[1];
        newStyles[1] = newStyles[index];
        newStyles[index] = temp;
        setGalleryStyles(newStyles);
    };

    const scrollToPricing = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('pricing');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="relative w-full min-h-screen bg-black text-white overflow-x-hidden flex flex-col font-sans">
            
            {/* Background Gradients */}
            {/* Balanced Radial Gradient - Center focused - Dark/Black theme */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_#1a1a1a_0%,_#000000_70%)] z-0 pointer-events-none fixed opacity-60"></div>
            
            {/* Vignette Overlay - Darkens edges evenly */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#000000_100%)] z-0 pointer-events-none fixed"></div>
            
            {/* Decorative Blobs - Subtle white/gray glow instead of blue */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[800px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-zinc-800/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* --- CANVAS HEADER --- */}
            {/* Removed max-w-7xl mx-auto, increased padding to edges */}
            <header className="absolute top-0 left-0 right-0 z-50 w-full px-6 pt-8 md:px-12 flex items-center justify-between">
                {/* Top Left: App Name */}
                <div className="flex items-center gap-2 cursor-pointer z-10" onClick={() => window.location.href = '/'}>
                    <span className="font-black text-lg tracking-tighter uppercase  text-white ">Crappik</span>
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
                        className="hidden md:block text-sm font-bold uppercase tracking-widest text-white hover:text-yellow-600 transition-colors"
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
                    <button onClick={onLogin} className="text-2xl font-black uppercase tracking-tighter text-yellow-400">Get Started</button>
                    
                    <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-6 p-2 text-gray-500 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* --- HERO --- */}
            <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6 pt-32 pb-24 w-full max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
                    
                    {/* Left Column: Content */}
                    <div className="text-left flex flex-col items-start max-w-2xl">
                        {/* Headline */}
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
                            Create <span className="text-yellow-500">High-Quality</span> Faceless Videos With AI
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed mb-10">
                            Our AI makes viral shorts and long-form videos for you. Get views and grow your audience, stress-free.
                        </p>

                        {/* Primary CTA */}
                        <button 
                            onClick={onLogin}
                            className="group relative px-10 py-5 bg-yellow-500 text-black rounded-full font-black text-lg md:text-xl uppercase tracking-widest hover:scale-105 hover:bg-yellow-500 transition-all duration-300 shadow-[0_0_50px_-10px_rgba(234,179,8,0.4)]"
                        >
                            <span className="relative z-10">Start Creating</span>
                            <div className="absolute inset-0 rounded-full bg-yellow-500 blur-lg opacity-60 group-hover:opacity-90 transition-opacity"></div>
                        </button>
                    </div>

                    {/* Right Column: Fan Video Gallery */}
                    <div className="relative h-[320px] md:h-[450px] flex items-center justify-center mt-12 md:mt-0">
                        <div className="relative w-full max-w-[160px] md:max-w-[260px] aspect-[9/16]">
                            {galleryStyles.map((style, index) => {
                                const diff = index - 1;
                                const isActive = index === 1;
                                // Tilt the stack toward the right side (base +10deg)
                                // Overlap only at lower portions (origin-bottom)
                                const rotation = diff * 20 + 10;
                                // Horizontal margins between cards to reduce overlap
                                const translateX = diff * 65 + 15; 
                                
                                return (
                                    <motion.div 
                                        key={style}
                                        onClick={() => handleVideoClick(index)}
                                        layout
                                        initial={false}
                                        animate={{
                                            rotate: rotation,
                                            x: `${translateX}%`,
                                            scale: isActive ? 1.05 : 0.95,
                                            zIndex: isActive ? 30 : 20 - Math.abs(diff),
                                        }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                        className="absolute inset-0 cursor-pointer origin-bottom"
                                    >
                                        <div className={`w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border-2 transition-colors duration-300 ${isActive ? 'border-white/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'border-white/10 shadow-2xl'} bg-zinc-900`}>
                                            <video 
                                                src={STYLE_PREVIEWS[style]} 
                                                autoPlay muted loop playsInline 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TRUSTED BY CREATORS --- */}
            <div className="relative z-10 w-full py-12 border-t border-white/5 bg-black/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-8">Trusted by Top Creators</span>
                    <div className="flex items-center -space-x-4">
                        {[
                            "https://i.pravatar.cc/100?img=21",
                            "https://yt3.googleusercontent.com/vbH_TYbNk_6jLDRT41tq3rXsBmfGS8Xs0sXjtnbgMZikVxbWNVI0jzMhp-3ktTOg00fwR28B340=s160-c-k-c0x00ffffff-no-rj",
                            "https://yt3.googleusercontent.com/0TIrr66R6Sx10n3WHl5t3ZBnJRbcznFFCewdPtAeLYd7niXnixHkXLWZH7WfvD-R7iHY1v6SPlY=s160-c-k-c0x00ffffff-no-rj",
                            "https://i.pravatar.cc/100?img=5"
                        ].map((src, i) => (
                            <img 
                                key={i} 
                                src={src} 
                                alt="Creator" 
                                className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-black object-cover shadow-lg" 
                            />
                        ))}
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-black bg-gray-800 flex items-center justify-center text-sm font-bold text-white z-10">
                            +2k
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TEXT TO VIDEO INSTANTLY --- */}
            <div className="relative z-10 w-full py-24 px-6 md:px-12 bg-black">
                <div className="max-w-7xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16 text-white text-center">
                        Full Videos From Simple Text
                    </h2>
                    
                    <div className="flex flex-wrap justify-center gap-6 md:gap-8 w-full">
                        {Object.entries(LANDING_PREVIEWS).map(([name, src]) => (
                            <div key={name} className="relative w-full max-w-[160px] md:max-w-[260px] aspect-[9/16] shrink-0">
                                <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-900 relative">
                                    <video 
                                        src={src} 
                                        muted loop playsInline 
                                        className="w-full h-full object-cover block"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                                        <span className="text-sm md:text-base font-bold text-white uppercase tracking-widest">{name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- MAKING CONTENT IS EASY --- */}
            <div className="relative z-10 w-full py-24 px-6 md:px-12 bg-black border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-20 text-white text-center">
                        Making Content Is Easy 🪄
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden w-full">
                        {/* Step 1 */}
                        <div className="bg-black flex flex-col items-center text-center relative overflow-hidden md:h-[90vh] min-h-[600px]">
                            <div className="pt-16 px-8 z-20 relative">
                                <span className="text-yellow-500 font-black text-xl mb-2 block tracking-widest uppercase">1 — Script</span>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Paste a Script</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">Our AI uses advanced thinking to plot scenes and generate visuals automatically</p>
                            </div>
                            <div className="flex-1 w-full flex items-center justify-center relative p-8">
                                <div className="absolute inset-0 pointer-events-none z-10 bg-black" style={{ maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)' }}></div>
                                <img src={DEMO_CLIPS["1"]} alt="Paste a Script" className="w-full max-w-md h-auto object-contain rounded-2xl relative z-0 transition-transform duration-500 hover:-translate-y-4 hover:scale-105" />
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-black flex flex-col items-center text-center relative overflow-hidden md:h-[90vh] min-h-[600px]">
                            <div className="pt-16 px-8 z-20 relative">
                                <span className="text-yellow-500 font-black text-xl mb-2 block tracking-widest uppercase">2 — Voiceover</span>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Powerful Voiceover</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">Choose from dozens of ultra-realistic AI voices to narrate your story perfectly</p>
                            </div>
                            <div className="flex-1 w-full flex items-center justify-center relative p-8">
                                <div className="absolute inset-0 pointer-events-none z-10 bg-black" style={{ maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)' }}></div>
                                <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col gap-3 relative z-0 shadow-2xl">
                                    {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) => (
                                        <div key={voice} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-yellow-500/50 transition-colors shadow-inner">
                                                    <svg className="w-4 h-4 text-white group-hover:text-yellow-500 transition-colors ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </div>
                                                <span className="font-bold text-white tracking-wide">{voice}</span>
                                            </div>
                                            <div className="flex gap-1 items-center h-6">
                                                <div className="w-1 h-3 bg-yellow-500/40 rounded-full group-hover:animate-pulse"></div>
                                                <div className="w-1 h-5 bg-yellow-500/60 rounded-full group-hover:animate-pulse delay-75"></div>
                                                <div className="w-1 h-4 bg-yellow-500/50 rounded-full group-hover:animate-pulse delay-150"></div>
                                                <div className="w-1 h-2 bg-yellow-500/40 rounded-full group-hover:animate-pulse delay-200"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-black flex flex-col items-center text-center relative overflow-hidden md:h-[90vh] min-h-[600px]">
                            <div className="pt-16 px-8 z-20 relative">
                                <span className="text-yellow-500 font-black text-xl mb-2 block tracking-widest uppercase">3 — Customize</span>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Customize as Needed</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">Images, voiceover, subtitles — fully customizable to match your desired aesthetic</p>
                            </div>
                            <div className="flex-1 w-full flex items-center justify-center relative p-8">
                                <div className="absolute inset-0 pointer-events-none z-10 bg-black" style={{ maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)' }}></div>
                                <img src={DEMO_CLIPS["3"]} alt="Customize as Needed" className="w-full max-w-md h-auto object-contain rounded-2xl relative z-0 transition-transform duration-500 hover:-translate-y-4 hover:scale-105" />
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-black flex flex-col items-center text-center relative overflow-hidden md:h-[90vh] min-h-[600px]">
                            <div className="pt-16 px-8 z-20 relative">
                                <span className="text-yellow-500 font-black text-xl mb-2 block tracking-widest uppercase">4 — Export</span>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Export & Download</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">Get your final video in high resolution, ready to go viral on any platform</p>
                            </div>
                            <div className="flex-1 w-full flex items-center justify-center relative p-8">
                                <div className="absolute inset-0 pointer-events-none z-10 bg-black" style={{ maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 80%)' }}></div>
                                <img src={DEMO_CLIPS["4"]} alt="Export & Download" className="w-full max-w-md h-auto object-contain rounded-2xl relative z-0 transition-transform duration-500 hover:-translate-y-4 hover:scale-105" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CREATE CONTENT FOR EVERY PLATFORM --- */}
            <div className="relative z-10 w-full py-24 px-6 md:px-12 bg-black border-t border-white/5 min-h-screen flex items-center justify-center">
                <div className="max-w-5xl mx-auto flex flex-col items-center w-full">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-white text-center">
                        Create Content for Every Platform
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        {/* YouTube */}
                        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square hover:bg-zinc-900/80 transition-colors">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 text-red-500 shrink-0">
                                <YouTubeIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">YouTube</h3>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                Educational content, storytelling, anime motivational clips, stickman shorts, documentaries
                            </p>
                        </div>
                        {/* TikTok */}
                        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square hover:bg-zinc-900/80 transition-colors">
                            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 text-teal-400 shrink-0">
                                <TikTokIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">TikTok</h3>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                Horror stories, motivational clips, science facts, funny jokes
                            </p>
                        </div>
                        {/* Instagram */}
                        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square hover:bg-zinc-900/80 transition-colors">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 text-pink-500 shrink-0">
                                <InstagramIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">Instagram</h3>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                Educational content, storytelling, anime motivation, relatable shorts
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CHOOSE ANY STYLE YOU LIKE --- */}
            <div className="relative z-10 w-full py-24 px-6 md:px-12 bg-black border-t border-white/5 min-h-screen flex items-center justify-center overflow-hidden">
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-7xl mx-auto flex flex-col items-center w-full"
                >
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-white text-center">
                        CHOOSE ANY STYLE YOU LIKE
                    </h2>
                    
                    <div className="flex flex-nowrap overflow-x-auto justify-start md:justify-center gap-4 md:gap-6 w-full px-4 pb-8 snap-x [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                        {Object.entries(STYLE_PREVIEWS).map(([name, src]) => (
                            <div key={name} className="relative w-[120px] md:w-[200px] aspect-[9/16] shrink-0 snap-center">
                                <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-900 relative">
                                    <video 
                                        src={src} 
                                        muted playsInline 
                                        className="w-full h-full object-cover block pointer-events-none"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none text-center">
                                        <span className="text-sm md:text-base font-bold text-white uppercase tracking-widest">{name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Smooth Transition Gradient */}
            <div className="relative z-10 w-full h-40 -mb-1 bg-gradient-to-b from-transparent to-black pointer-events-none"></div>

           

            {/* --- SECTION 3: PRICING --- */}
            <div id="pricing" className="relative z-10 w-full bg-black text-white py-32 px-6 md:px-12 scroll-mt-20 border-t border-white/5">
                <div className="flex flex-col items-center text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-white">
                        SIMPLE AND TRANSPARENT
                    </h2>
                    <p className="text-xl font-medium text-gray-400 max-w-2xl">
                        Start as low as $19 - pay as you go
                    </p>
                </div>
                
                <CreatorPricingCards 
                    onAction={onLogin} 
                    actionLabel="Start Creating" 
                />
            </div>

            {/* --- SECTION 4: FAQ --- */}
            <div className="relative z-10 w-full bg-black text-white py-32 px-6 md:px-12 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">
                            Common Questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((item, i) => (
                            <div key={i} className="bg-zinc-900/50 rounded-2xl border border-white/10 overflow-hidden transition-all hover:bg-zinc-900">
                                <button 
                                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-bold text-lg text-white">{item.q}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${openFaqIndex === i ? 'rotate-180 bg-yellow-600 text-black' : 'bg-white/10 text-gray-400'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-6 pt-0 text-gray-400 font-medium leading-relaxed">
                                        {item.a}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SECTION 5: FINAL CTA --- */}
            <div className="relative z-10 w-full px-6 md:px-12 py-24 bg-black text-center border-t border-white/5">
                <div className="w-full rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl border-4 border-white/10 relative group min-h-[600px] flex items-center justify-center">
                    {/* Background Image */}
                    <img 
                        src="https://picsum.photos/seed/creator_system/1920/1080?grayscale" 
                        alt="Creator System" 
                        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000"
                        referrerPolicy="no-referrer"
                    />
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40"></div>

                    {/* Content */}
                    <div className="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center">
                        <h2 className="text-3xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-12 text-white leading-[1.1]">
                            Say Goodbye to Boring videos 👋 
                        </h2>
                         <p className="text-xl font-medium text-gray-400 max-w-2xl mb-10">
                        Start making engaging contents that gets you followed
                        </p>
                        
                        <button 
                            onClick={onLogin}
                            className="group relative px-12 py-6 bg-yellow-500 text-black rounded-full font-black text-xl md:text-2xl uppercase tracking-widest hover:scale-105 hover:bg-yellow-500 transition-all duration-300 shadow-[0_0_60px_-10px_rgba(234,179,8,0.5)]"
                        >
                            <span className="relative z-10">Get Started</span>
                            <div className="absolute inset-0 rounded-full bg-yellow-500 blur-xl opacity-60 group-hover:opacity-90 transition-opacity"></div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 w-full bg-black border-t border-white/10 py-12 px-6 md:px-12 text-center">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                        Crappik © 2026
                    </p>
                    {onNavigate && (
                        <button 
                            onClick={() => onNavigate('/terms')}
                            className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            Terms of Service
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};
