import React, { useEffect } from 'react';

export const BlogView: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Blog - Product Demo Guides | ProductCam";
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
        <div className="bg-white min-h-screen text-gray-900 antialiased selection:bg-green-500 selection:text-white">
            <div className="max-w-2xl mx-auto px-6 py-10 md:py-20">
                <nav className="mb-16 flex items-center justify-between">
                    <a href="https://productcam.site/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
                         <div className="w-8 h-8 flex items-center justify-center bg-green-500/10 rounded-lg text-[10px] font-black text-green-600 border border-green-500/20 group-hover:bg-green-600 group-hover:text-white transition-all">
                             PC
                         </div>
                         <span className="font-black text-lg text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </a>
                    <a href="https://productcam.site/" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                        Home
                    </a>
                </nav>

                <header className="mb-20">
                    <h1 className="text-5xl font-bold text-gray-900 tracking-tight mb-6">Blog</h1>
                    <p className="text-lg text-gray-500 leading-relaxed">Guides on product storytelling, demo automation, and sharing software effectively.</p>
                </header>

                <div className="space-y-20">
                    {posts.map((post) => (
                        <article key={post.slug} className="group">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">{post.category}</span>
                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{post.readTime}</span>
                            </div>
                            <a href={`#/blog/${post.slug}`} className="block">
                                <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors leading-tight">
                                    {post.title}
                                </h2>
                                <p className="text-gray-500 leading-relaxed mb-6 max-w-xl">
                                    {post.description}
                                </p>
                                <span className="text-sm font-bold text-gray-900 border-b-2 border-gray-100 group-hover:border-green-500 transition-all pb-1">
                                    Read Article
                                </span>
                            </a>
                        </article>
                    ))}
                </div>
                
                <footer className="mt-32 pt-12 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">ProductCam © 2025</p>
                    <a href="https://productcam.site/" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Home</a>
                </footer>
            </div>
        </div>
    );
};