import React, { useEffect } from 'react';
import { HowToTurnScreenRecording } from '../blog/HowToTurnScreenRecording';
import { HowToCreateWithoutEditing } from '../blog/HowToCreateWithoutEditing';

interface BlogPostViewProps {
    slug: string;
}

const BLOG_POSTS_MAP: Record<string, { title: string; metaDescription: string; category: string; readTime: string; Component: React.FC }> = {
    'how-to-turn-screen-recording-into-demo': {
        title: 'How to Turn a Screen Recording Into a Product Demo',
        metaDescription: 'Learn how to transform a raw screen recording into a clear product demo that explains context and maintains focus.',
        category: 'Tutorial',
        readTime: '5 min read',
        Component: HowToTurnScreenRecording
    },
    'how-to-create-product-demo-without-video-editing': {
        title: 'How to Create a Product Demo Without Video Editing',
        metaDescription: 'Discover why video editing is not required to produce professional product demos and how automation can simplify your launch.',
        category: 'Strategy',
        readTime: '4 min read',
        Component: HowToCreateWithoutEditing
    }
};

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug }) => {
    const postData = BLOG_POSTS_MAP[slug];

    useEffect(() => {
        window.scrollTo(0, 0);
        if (postData) {
            document.title = `${postData.title} | ProductCam Blog`;
            // Simple simulation of updating meta description (mostly for document purposes in SPA)
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', postData.metaDescription);
            }
        }
    }, [slug, postData]);

    if (!postData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-gray-500 mb-8">Post not found.</p>
                    <a href="#/blog" className="text-green-600 font-bold hover:underline">Back to Blog</a>
                </div>
            </div>
        );
    }

    const { title, category, readTime, Component } = postData;

    return (
        <div className="bg-white min-h-screen text-gray-900 antialiased selection:bg-green-500 selection:text-white">
            <div className="max-w-2xl mx-auto px-6 py-10 md:py-20">
                <nav className="mb-12 flex items-center justify-between">
                    <a href="https://productcam.site/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
                         <div className="w-8 h-8 flex items-center justify-center bg-green-500/10 rounded-lg text-[10px] font-black text-green-600 border border-green-500/20 group-hover:bg-green-600 group-hover:text-white transition-all">
                             PC
                         </div>
                         <span className="font-black text-lg text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </a>
                    <div className="flex items-center gap-4">
                        <a href="https://productcam.site/" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                            Home
                        </a>
                        <a href="#/blog" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                            Blog
                        </a>
                    </div>
                </nav>

                <nav className="flex items-center justify-between mb-16">
                    <a 
                        href="#/blog"
                        className="text-xs font-bold text-gray-400 hover:text-gray-900 flex items-center gap-2 transition-colors inline-flex uppercase tracking-widest"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to List
                    </a>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{category}</span>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{readTime}</span>
                    </div>
                </nav>

                <article>
                    <header className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15] mb-4">
                            {title}
                        </h1>
                    </header>
                    
                    <section className="prose prose-lg max-w-none text-gray-700 leading-relaxed font-normal">
                        <Component />
                    </section>

                    <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                            ProductCam Blog © 2025
                        </div>
                        <div className="flex gap-6">
                            <a href="https://productcam.site/" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Home</a>
                            <a href="#/blog" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Blog Index</a>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
};