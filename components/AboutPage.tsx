
import React, { useEffect } from 'react';

export const AboutPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "About Us - The Vision Behind ProductCam | ProductCam";
    }, []);

    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-green-500 selection:text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
                <nav className="mb-16 flex items-center justify-between border-b border-gray-100 pb-8">
                    <button onClick={() => onNavigate('/')} className="flex items-center gap-2 group">
                         <span className="font-black text-xl text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </button>
                    <button onClick={() => onNavigate('/')} className="text-sm font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                        Home
                    </button>
                </nav>

                <header className="mb-20">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase mb-6">About ProductCam</h1>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-2xl">
                        Empowering builders to showcase their work through automated video production.
                    </p>
                </header>

                <div className="space-y-20">
                    <section>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">What is ProductCam?</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-medium">
                            ProductCam is an AI-powered platform designed to automate the creation of software demo videos. We believe that every developer and founder should be able to share high-quality video updates of their product without needing a dedicated video editing team or expensive software suites.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">Who should use automated demo software?</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-medium">
                            ProductCam is built for SaaS founders, product managers, and indie hackers who need to create launch videos, onboarding guides, or feature announcements. If you have a screen recording but don't have the time to edit it, narrate it, and polish it, ProductCam is designed for you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">How does the AI video generation pipeline work?</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-medium">
                            Our pipeline leverages Gemini AI to 'watch' your video. It identifies the most important parts of the user interface you're interacting with. It then generates a script based on those actions, creates a high-quality voiceover, and applies visual enhancements like zooms and pacing to match the narration perfectly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">Why is manual video editing a bottleneck?</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-medium">
                            Traditional video editing requires specialized skills and hours of manual labor. This friction often prevents teams from sharing regular video updates, leading to slower feedback loops and less effective product launches. ProductCam removes this friction, turning hours of editing into seconds of automated processing.
                        </p>
                    </section>
                </div>

                <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em]">ProductCam About © 2025</p>
                    <div className="flex gap-8">
                        <button onClick={() => onNavigate('/')} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Home</button>
                        <button onClick={() => onNavigate('/features')} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Features</button>
                        <button onClick={() => onNavigate('/pricing-details')} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Pricing</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};