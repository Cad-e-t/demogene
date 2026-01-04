
import React, { useEffect } from 'react';

export const FeaturesPage: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Features - Automated Product Demo Software | ProductCam";
    }, []);

    const sections = [
        {
            id: "automated-demo-generation",
            title: "How does ProductCam automate product demos?",
            content: "ProductCam uses a sophisticated AI pipeline to analyze raw screen recordings. By identifying user actions like clicks, scrolls, and typing, it automatically segments the video into logical steps. This removes the need for manual cutting and stitching, transforming a standard capture into a structured demo in minutes."
        },
        {
            id: "screen-recording-narration",
            title: "Can I turn screen recordings into narrated videos?",
            content: "Yes. ProductCam features built-in text-to-speech (TTS) integration. Based on the actions detected on screen, our AI generates a descriptive script which is then narrated by professional-grade AI voices. This ensures every feature you show is explained clearly to the viewer without you needing to record audio yourself."
        },
        {
            id: "smart-zoom-technology",
            title: "How do smart zooms improve software walkthroughs?",
            content: "One of the key features of ProductCam is its 'Zoom & Hold' technology. When the AI detects a significant interaction (like clicking a button or filling a form), it automatically crops and zooms into that region. This maintains viewer focus on the most important parts of the UI, making the demo much easier to follow on small screens or high-resolution displays."
        },
        {
            id: "custom-backgrounds",
            title: "What are custom background styles for SaaS demos?",
            content: "To give your demos a polished, professional look, ProductCam allows you to wrap your screen recording in a styled canvas. You can choose from various high-quality backgrounds and gradients that contrast with your app's UI, making the product 'pop' and look ready for a landing page or social media launch."
        },
        {
            id: "no-code-video-editing",
            title: "Is ProductCam a no-code video editing tool?",
            content: "ProductCam is better described as an automated production tool rather than a manual editor. While we provide an 'Advanced Editor' for fine-tuning segments, the core philosophy is automation. You don't need to understand timelines, keyframes, or masking; the software handles the heavy lifting of demo production for you."
        }
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-green-500 selection:text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
                <nav className="mb-16 flex items-center justify-between border-b border-gray-100 pb-8">
                    <a href="https://productcam.site" className="flex items-center gap-2 group">
                         <span className="font-black text-xl text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </a>
                    <a href="https://productcam.site" className="text-sm font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                        Home
                    </a>
                </nav>

                <header className="mb-20">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase mb-6">Product Features</h1>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-2xl">
                        ProductCam is built to solve the bottleneck of manual demo production. Explore how our automated features help you ship faster.
                    </p>
                </header>

                <div className="space-y-24">
                    {sections.map((section) => (
                        <section key={section.id} id={section.id} className="scroll-mt-24">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">
                                {section.title}
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed font-medium">
                                {section.content}
                            </p>
                        </section>
                    ))}
                </div>

                <div className="mt-32 p-10 bg-gray-50 rounded-[40px] text-center border border-gray-100">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Ready to automate your demos?</h2>
                    <p className="text-gray-500 font-medium mb-8">Start turning your screen recordings into polished assets today.</p>
                    <a href="https://productcam.site" className="inline-block px-10 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition shadow-xl shadow-green-600/20 uppercase tracking-tighter">
                        Get Started for Free
                    </a>
                </div>

                <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em]">ProductCam Features © 2025</p>
                    <div className="flex gap-8">
                        <a href="https://productcam.site" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Home</a>
                        <a href="https://productcam.site/#/about" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">About</a>
                        <a href="https://productcam.site/#/pricing-details" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Pricing</a>
                    </div>
                </footer>
            </div>
        </div>
    );
};
