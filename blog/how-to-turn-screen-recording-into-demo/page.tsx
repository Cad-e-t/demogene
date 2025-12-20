
import React from 'react';

export const PostContent: React.FC = () => {
    return (
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
};
