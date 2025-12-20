
import React from 'react';

interface BlogViewProps {
    onSelectPost: (slug: string) => void;
    onGoHome: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onSelectPost, onGoHome }) => {
    const posts = [
        {
            title: "How to Turn a Screen Recording Into a Product Demo",
            slug: "how-to-turn-screen-recording-into-demo",
            description: "Learn how to transform a raw screen recording into a clear, narrated product demo."
        },
        {
            title: "How to Create a Product Demo Without Video Editing",
            slug: "how-to-create-product-demo-without-video-editing",
            description: "Video editing is the main reason teams delay demos. Here is how to skip it entirely."
        }
    ];

    return (
        <div className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
            <header className="mb-16">
                <button 
                    onClick={onGoHome}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-8 flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Home
                </button>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Product Demo Guides</h1>
                <p className="text-xl text-gray-600 font-medium">Insights and tutorials on turning screen recordings into effective product storytelling.</p>
            </header>

            <div className="space-y-12">
                {posts.map((post) => (
                    <div 
                        key={post.slug} 
                        className="group cursor-pointer border-b border-gray-100 pb-12"
                        onClick={() => onSelectPost(post.slug)}
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                            {post.title}
                        </h2>
                        <p className="text-gray-600 leading-relaxed font-medium mb-4">
                            {post.description}
                        </p>
                        <span className="text-sm font-bold text-green-600 flex items-center gap-2">
                            Read Guide 
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </span>
                    </div>
                ))}
            </div>
            
            <footer className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-gray-500 text-sm font-medium">ProductCam Blog © 2025</p>
            </footer>
        </div>
    );
};
