
import React, { useEffect } from 'react';
import { BLOG_POSTS } from '../blogData';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
    onGoHome: () => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack, onGoHome }) => {
    const post = BLOG_POSTS[slug];
    
    useEffect(() => {
        if (!post) return;

        // Set document title for SEO
        document.title = `${post.title} | ProductCam Blog`;
        
        // Update Meta Description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', post.description);

        // Scroll to top on load
        window.scrollTo(0, 0);
    }, [slug, post]);

    if (!post) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Post not found</h1>
                <button onClick={onBack} className="text-green-600 font-bold">Back to Blog</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
            <nav className="flex items-center justify-between mb-16">
                <button 
                    onClick={onBack}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Blog
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-wider">{post.category}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{post.readTime}</span>
                </div>
            </nav>

            <article>
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8 leading-tight">
                        {post.title}
                    </h1>
                </header>
                
                <section 
                    className="prose prose-lg max-w-none text-gray-700 font-medium leading-relaxed blog-content"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <footer className="mt-20 pt-10 border-t border-gray-100">
                    <div className="flex flex-col items-center gap-8 bg-gray-50 rounded-2xl p-10 text-center">
                        <h3 className="text-2xl font-bold text-gray-900">Ready to create your own demo?</h3>
                        <p className="text-gray-600 max-w-md">Join hundreds of founders using ProductCam to share their vision without the editing headache.</p>
                        <button 
                            onClick={onGoHome}
                            className="px-10 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-xl transform hover:scale-105 duration-200"
                        >
                            Get Started Free
                        </button>
                    </div>
                    <div className="mt-12 text-center">
                        <p className="text-gray-400 text-sm font-medium">ProductCam Guides © 2025</p>
                    </div>
                </footer>
            </article>
        </div>
    );
};
