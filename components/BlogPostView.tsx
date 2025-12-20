
import React from 'react';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
    onGoHome: () => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack, onGoHome }) => {
    const isPost1 = slug === 'how-to-turn-screen-recording-into-demo';
    
    const content1 = (
        <>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">How to Turn a Screen Recording Into a Product Demo</h1>
            <div className="prose prose-lg max-w-none text-gray-700 font-medium leading-relaxed">
                <p className="text-xl text-gray-600 mb-10">
                    Most product demos start the same way: someone records their screen while clicking through the app. 
                    The problem is that raw screen recordings are rarely usable as demos. They’re too long, unfocused, silent, or confusing to new viewers.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What makes a good demo</h2>
                <p className="mb-6">A product demo needs:</p>
                <ul className="list-disc pl-6 mb-8 space-y-2">
                    <li>A clear beginning and ending</li>
                    <li>Context for why actions are happening</li>
                    <li>Focus on key moments, not every click</li>
                    <li>Pacing that matches a first-time viewer</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The traditional workflow</h2>
                <p className="mb-6">Most teams do this:</p>
                <p className="mb-6">Record themselves using the product recording tools - with developer by the side (picture-in-picture) and app interface as the background. This can work but the video is slow, boring to watch, and sometimes inaudible.</p>
                <p className="mb-6">Some teams hire editors and have to wait days for the video to be ready before they can launch. Moreover, the demos are often flashier than they are clear since hired editors care more about visuals than the product itself.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">A simplified approach</h2>
                <p className="mb-6">A faster way is to use a plain screen recording with clear narration to show how your product works. Instead of editing manually:</p>
                <ul className="list-disc pl-6 mb-8 space-y-2">
                    <li>The recording is analyzed</li>
                    <li>A script is generated from what’s happening on screen</li>
                    <li>Voiceover is added automatically</li>
                    <li>Zooms and pacing are applied where attention matters</li>
                </ul>
                <p className="mb-6">ProductCam follows this approach. You upload a screen recording and receive a polished demo without editing timelines or hiring editors.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">When this approach works best</h2>
                <p className="mb-6">This works best for:</p>
                <ul className="list-disc pl-6 mb-8 space-y-2 flex flex-wrap gap-x-12">
                    <li>Launch demos</li>
                    <li>Onboarding videos</li>
                    <li>Product Hunt demos</li>
                    <li>Feature walkthroughs</li>
                    <li>Investor pitch</li>
                </ul>
                <p className="mt-10 pt-10 border-t border-gray-100 text-center font-bold text-gray-900">
                    Turn your screen recording into a demo automatically. <br/>
                    Upload your recording and get a narrated, focused product demo in minutes.
                </p>
            </div>
        </>
    );

    const content2 = (
        <>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">How to Create a Product Demo Without Video Editing</h1>
            <div className="prose prose-lg max-w-none text-gray-700 font-medium leading-relaxed">
                <p className="text-xl text-gray-600 mb-10">
                    Video editing is the main reason most teams delay or avoid creating product demos. Timelines turn a simple screen capture into hours of work. But editing isn’t required to produce a clear, professional demo.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Why builders default to editing for product demos</h2>
                <ul className="list-disc pl-6 mb-8 space-y-2">
                    <li>Raw recordings feel unprofessional</li>
                    <li>Silence feels awkward</li>
                    <li>Important moments are easy to miss</li>
                </ul>
                <p className="mb-6">So people jump straight to editors.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What a demo actually needs</h2>
                <p className="mb-6">A demo doesn’t need flashy transitions. A product demo needs a structured walkthrough with clarity and pacing. These make watchers feel like they are using your tool.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Editing vs Automation</h2>
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="font-bold mb-3">Editing</h3>
                        <ul className="text-sm space-y-1">
                            <li>Manual</li>
                            <li>Time-consuming</li>
                            <li>Flashy but lacks communication</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <h3 className="font-bold mb-3 text-green-800">Automation</h3>
                        <ul className="text-sm space-y-1 text-green-800">
                            <li>Applies structure automatically</li>
                            <li>Generates narration</li>
                            <li>Highlights key actions</li>
                            <li>Produces consistent output</li>
                        </ul>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Who this is for</h2>
                <p className="mb-6">This approach is ideal for Founders sharing their tool on the internet, small teams ready to launch, and SaaS products.</p>
                <p className="mb-6">It is not ideal for brand commercials or cinematic marketing videos.</p>

                <p className="mt-10 pt-10 border-t border-gray-100 text-center font-bold text-gray-900">
                    Create a product demo without editing. <br/>
                    Upload your screen recording and let ProductCam handle the rest.
                </p>
            </div>
        </>
    );

    return (
        <div className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
            <div className="flex items-center justify-between mb-16">
                <button 
                    onClick={onBack}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Blog
                </button>
            </div>

            <article>
                {isPost1 ? content1 : content2}
            </article>

            <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col items-center gap-8">
                <button 
                    onClick={onGoHome}
                    className="px-10 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-xl"
                >
                    Get Started with ProductCam
                </button>
                <p className="text-gray-500 text-sm font-medium">ProductCam Guides © 2025</p>
            </div>
        </div>
    );
};
