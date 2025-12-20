
import React, { useEffect } from 'react';
import { PostContent as Content1 } from '../blog/how-to-turn-screen-recording-into-demo/page';
import { PostContent as Content2 } from '../blog/how-to-create-product-demo-without-video-editing/page';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
    onGoHome: () => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack, onGoHome }) => {
    const isPost1 = slug === 'how-to-turn-screen-recording-into-demo';
    
    useEffect(() => {
        const title = isPost1 
            ? "How to Turn a Screen Recording Into a Product Demo | ProductCam" 
            : "How to Create a Product Demo Without Video Editing | ProductCam";
        const desc = isPost1
            ? "Step-by-step guide on transforming raw screen captures into focused, narrated product walkthroughs that convert viewers into users."
            : "Discover how to bypass complex video editing timelines and use automation to create professional software demos in minutes.";
        
        document.title = title;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', desc);
        window.scrollTo(0, 0);
    }, [isPost1]);

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
                {isPost1 ? <Content1 /> : <Content2 />}
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
