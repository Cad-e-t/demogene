import React, { useEffect } from 'react';

interface BlogPostViewProps {
    slug: string;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    const getContent = () => {
        if (slug === 'how-to-turn-screen-recording-into-demo') {
            return {
                title: 'How to Turn a Screen Recording Into a Product Demo',
                category: 'Tutorial',
                readTime: '5 min read',
                body: (
                    <>
                        <p className="text-xl text-gray-600 mb-10">
                            Most product demos start the same way: someone records their screen while clicking through the app. 
                            The problem is that raw screen recordings are rarely usable as demos. They’re too long, unfocused, silent, or confusing to new viewers.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What makes a good demo</h2>
                        <p className="mb-6">A product demo needs to be more than just a recording of your cursor. It needs to tell a story. Here is what you need:</p>
                        <ul className="list-disc pl-6 mb-8 space-y-2">
                            <li><strong>A Narrative Arc:</strong> A clear beginning (the problem), middle (the solution), and end (the outcome).</li>
                            <li><strong>Contextual Commentary:</strong> Narrated context explains <em>why</em> you are clicking, not just <em>where</em>.</li>
                            <li><strong>Visual Focus:</strong> Using zooms to highlight specific UI elements prevents the user from getting lost in a complex dashboard.</li>
                            <li><strong>Professional Pacing:</strong> Removing awkward pauses and speeding up repetitive tasks keeps the viewer engaged.</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The traditional manual workflow</h2>
                        <p className="mb-6">Historically, teams have relied on complex video editors like Screenflow or Adobe Premiere. While powerful, these tools introduce a significant bottleneck:</p>
                        <p className="mb-6">1. Record the raw footage.<br/>2. Manually cut out mistakes.<br/>3. Record a voiceover (often requiring multiple takes).<br/>4. Sync the audio with the video.<br/>5. Manually keyframe zooms.</p>
                        <p className="mb-6">This process often takes 4-8 hours for a single 2-minute demo.</p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The Modern Automated Approach</h2>
                        <p className="mb-6">With AI, you can now skip 90% of the manual labor. By analyzing the screen recording directly, tools like ProductCam can:</p>
                        <ul className="list-disc pl-6 mb-8 space-y-2">
                            <li><strong>Generate a Script:</strong> Identify the actions on screen and write a professional narration automatically.</li>
                            <li><strong>Apply Smart Zooms:</strong> Automatically detect where clicks are happening and zoom the camera in for focus.</li>
                            <li><strong>Sync Voiceover:</strong> Generate human-like AI voiceovers that are perfectly timed to the visual actions.</li>
                        </ul>
                    </>
                )
            };
        } else if (slug === 'how-to-create-product-demo-without-video-editing') {
            return {
                title: 'How to Create a Product Demo Without Video Editing',
                category: 'Strategy',
                readTime: '4 min read',
                body: (
                    <>
                        <p className="text-xl text-gray-600 mb-10">
                            Video editing is the primary reason most software teams delay or avoid creating product demos. Complex timelines and keyframes turn a simple task into a multi-day project.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The "Editing" Trap</h2>
                        <p className="mb-6">Many founders believe that a "professional" demo requires cinematic transitions and flashy effects. In reality, your users care about one thing: <strong>Clarity.</strong></p>
                        
                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Focus on Content, Not Cuts</h2>
                        <p className="mb-6">A demo doesn’t need flashy transitions. It needs a structured walkthrough. If you can communicate your value proposition clearly, the "raw" feeling of an unedited video can actually build trust—provided it is focused.</p>

                        <div className="grid md:grid-cols-2 gap-8 my-12">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <h3 className="font-bold mb-3 text-gray-900">Why Manual Editing Fails</h3>
                                <ul className="text-sm space-y-2 text-gray-600">
                                    <li>• High barrier to entry (learning curve)</li>
                                    <li>• Hard to update when the UI changes</li>
                                    <li>• Easy to over-edit and lose the message</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                <h3 className="font-bold mb-3 text-green-800">The Power of Automation</h3>
                                <ul className="text-sm space-y-2 text-green-800">
                                    <li>• Instant turnaround (minutes vs hours)</li>
                                    <li>• Consistent brand style across all videos</li>
                                    <li>• Narrated logic built-in automatically</li>
                                </ul>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3 Steps to a No-Edit Demo</h2>
                        <p className="mb-6">1. <strong>The Perfect Take:</strong> Focus on a clean walkthrough of a single feature. Don't worry about small pauses.<br/>
                        2. <strong>Automated Narration:</strong> Use AI to generate a script that explains the technical steps in plain English.<br/>
                        3. <strong>Algorithmic Pacing:</strong> Let a system handle the "pauses" and "zooms" based on click data.</p>
                    </>
                )
            };
        }
        return null;
    };

    const content = getContent();

    if (!content) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-gray-600 mb-8">Post not found.</p>
                    <a href="#/blog" className="text-green-600 font-bold hover:underline">Back to Blog</a>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen text-gray-900 antialiased selection:bg-green-500 selection:text-white">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <nav className="flex items-center justify-between mb-16">
                    <a 
                        href="#/blog"
                        className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors inline-flex"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Blog
                    </a>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-wider">{content.category}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{content.readTime}</span>
                    </div>
                </nav>

                <article>
                    <header className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8 leading-tight">
                            {content.title}
                        </h1>
                    </header>
                    
                    <section className="prose prose-lg max-w-none text-gray-700 font-medium leading-relaxed">
                        {content.body}
                    </section>

                    <footer className="mt-20 pt-10 border-t border-gray-100">
                        <div className="flex flex-col items-center gap-8 bg-gray-50 rounded-2xl p-10 text-center">
                            <h3 className="text-2xl font-bold text-gray-900">Ready to create your own demo?</h3>
                            <p className="text-gray-600 max-w-md">Join hundreds of founders using ProductCam to share their vision without the editing headache.</p>
                            <a 
                                href="#/"
                                className="px-10 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-xl transform hover:scale-105 duration-200 inline-block"
                            >
                                Get Started Free
                            </a>
                        </div>
                        <div className="mt-12 text-center">
                            <p className="text-gray-400 text-sm font-medium">ProductCam Guides © 2025</p>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
};