
import React from 'react';
import { motion } from "motion/react";

export const TermsOfService: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div 
                        className="flex items-center gap-2 cursor-pointer" 
                        onClick={() => onNavigate('/')}
                    >
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <span className="text-white font-black text-xl tracking-tighter">C</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">Crappik</span>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-8">Terms of Service</h1>
                        <p className="text-gray-500 mb-12 font-medium">Last Updated: March 31, 2026</p>

                        <div className="space-y-12 text-lg leading-relaxed text-gray-700">
                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">1. Acceptance of Terms</h2>
                                <p>
                                    By accessing or using Crappik ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. Crappik is a product designed to help creators generate high-quality video content using artificial intelligence.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">2. Description of Service</h2>
                                <p>
                                    Crappik provides AI-powered video generation tools. Users can upload recordings, provide descriptions, and generate edited videos with AI voiceovers, captions, and visual enhancements.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">3. Credits and Payments</h2>
                                <p>
                                    Crappik operates on a pay-as-you-go credit system. Credits are purchased in packs and do not expire. 
                                    <strong> Refunds:</strong> We offer refunds for unused credits within 30 days of purchase. Once credits have been used to generate content, they are non-refundable due to the high computational costs associated with AI generation.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">4. Content Ownership</h2>
                                <p>
                                    You retain full ownership and commercial rights to any content you generate using Crappik. You are responsible for ensuring that the source material you upload does not violate any third-party rights or laws.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">5. Prohibited Use</h2>
                                <p>
                                    You agree not to use Crappik to generate content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable. We reserve the right to terminate accounts that violate these guidelines.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">6. Limitation of Liability</h2>
                                <p>
                                    Crappik is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service or the content generated through it.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">7. Changes to Terms</h2>
                                <p>
                                    We may update these terms from time to time. We will notify users of any significant changes by posting the new terms on this page.
                                </p>
                            </section>

                            <section className="pt-8 border-t border-gray-100">
                                <p className="text-sm text-gray-400">
                                    If you have any questions about these Terms, please contact us at support@crappik.site
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 py-12 px-6 border-t border-gray-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <span className="text-white font-black text-sm tracking-tighter">C</span>
                        </div>
                        <span className="font-black tracking-tighter uppercase">Crappik</span>
                    </div>
                    <p className="text-gray-400 text-sm">© 2026 Crappik. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};
