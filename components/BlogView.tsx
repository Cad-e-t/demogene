import React, { useEffect } from 'react';

export const BlogView: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const posts = [
        {
            slug: 'how-to-turn-screen-recording-into-demo',
            title: 'How to Turn a Screen Recording Into a Product Demo',
            description: 'Learn how to transform a raw screen recording into a clear, narrated product demo that converts.',
            category: 'Tutorial',
            readTime: '5 min read'
        },
        {
            slug: 'how-to-create-product-demo-without-video-editing',
            title: 'How to Create a Product Demo Without Video Editing',
            description: 'Video editing is the main reason teams delay demos. Here is how to skip the timeline entirely.',
            category: 'Strategy',
            readTime: '4 min read'
        }
    ];

    return (
        <div className="bg-gray-50 min-h-screen text-gray-900 antialiased selection:bg-green-500 selection:text-white">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <header className="mb-16">
                    <a 
                        href="#/"
                        className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-8 flex items-center gap-2 transition-colors inline-flex"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Home
                    </a>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Product Demo Guides</h1>
                    <p className="text-xl text-gray-600 font-medium">Insights and tutorials on turning screen recordings into effective product storytelling.</p>
                </header>

                <div className="space-y-12">
                    {posts.map((post) => (
                        <a 
                            key={post.slug}
                            href={`#/blog/${post.slug}`}
                            className="block group border-b border-gray-100 pb-12"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-widest">{post.category}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{post.readTime}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors leading-tight">
                                {post.title}
                            </h2>
                            <p className="text-gray-600 leading-relaxed font-medium mb-4">
                                {post.description}
                            </p>
                            <span className="text-sm font-bold text-green-600 flex items-center gap-2">
                                Read Guide 
                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </span>
                        </a>
                    ))}
                </div>
                
                <footer className="mt-20 pt-10 border-t border-gray-100 text-center">
                    <p className="text-gray-500 text-sm font-medium">ProductCam Blog © 2025</p>
                </footer>
            </div>
        </div>
    );
};