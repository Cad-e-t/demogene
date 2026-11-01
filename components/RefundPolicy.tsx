import React from 'react';
import { motion } from "motion/react";

export const RefundPolicy: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
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
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-8">Refund Policy</h1>
                        <p className="text-gray-500 mb-12 font-medium">Last Updated: November 1, 2026</p>

                        <div className="space-y-12 text-lg leading-relaxed text-gray-700">
                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">1. General Policy</h2>
                                <p className="mb-4">
                                    All purchases made on Crappik are final, and we do not offer monetary refunds. Refunds are not provided for change of mind, accidental purchases, unused credits, or subjective dissatisfaction with AI-generated creative outputs.
                                </p>
                                <p>
                                    <strong>Why we do not offer refunds:</strong> Every video storyboard, custom scene illustration, neural voiceover, audio transcription, and cloud render incurs immediate, non-recoverable GPU and third-party AI model computation costs the moment resources are provisioned. Rather than locking users into recurring subscriptions, Crappik offers low-entry pay-as-you-go credit packs so you only pay for what you choose to purchase.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">2. Credit Purchases</h2>
                                <p>
                                    Crappik operates on a pay-as-you-go credit system rather than recurring subscriptions. Purchased credits are non-refundable, non-exchangeable, and non-transferable once purchased, whether partially used, unused, or expired after their 12-month validity period, subject to applicable law.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">3. Technical Problems & Reporting Issues</h2>
                                <p className="mb-4">
                                    If a technical bug, system error, or service interruption prevents you from accessing or using credits or features you have paid for, please report the issue so our team can investigate and make it right:
                                </p>
                                <ul className="list-disc pl-6 space-y-3 mb-4">
                                    <li>
                                        <strong>In-Studio Feedback Button:</strong> Sign in to the Crappik Creator Studio and click the <strong>Feedback</strong> button at the top-right corner of the dashboard (above the prompt box). Describe what happened, which project or step failed, and submit the bug report directly to our engineering team.
                                    </li>
                                    <li>
                                        <strong>Email or X Support:</strong> For support, questions, or if an issue prevents you from signing in to the studio dashboard, email us at{' '}
                                        <a
                                            href="mailto:crappik@outlook.com"
                                            className="font-semibold text-black underline underline-offset-2 hover:opacity-80 transition-opacity"
                                        >
                                            crappik@outlook.com
                                        </a>{' '}
                                        or send us a message on{' '}
                                        <a
                                            href="https://x.com/crappik"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-black underline underline-offset-2 hover:opacity-80 transition-opacity"
                                        >
                                            X
                                        </a>{' '}
                                        with your account email address and a brief description of the problem.
                                    </li>
                                </ul>
                                <p>
                                    When a verified platform error or failed generation impacts your paid usage, our team will resolve the underlying access issue or restore the affected credits to your account balance so you receive the full service you paid for.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-black tracking-tight uppercase mb-4 text-black">4. Legal Exceptions</h2>
                                <p>
                                    Nothing in this Refund Policy limits, excludes, or modifies any mandatory statutory rights, warranties, or remedies you may have under applicable consumer protection laws in your jurisdiction that cannot be waived or restricted by contract.
                                </p>
                            </section>

                            <section className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <p className="text-sm text-gray-500">
                                    Need support or have questions? Email us at{' '}
                                    <a
                                        href="mailto:crappik@outlook.com"
                                        className="font-semibold text-gray-800 hover:text-black underline underline-offset-2 transition-colors"
                                    >
                                        crappik@outlook.com
                                    </a>{' '}
                                    or send a message on{' '}
                                    <a
                                        href="https://x.com/crappik"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-gray-800 hover:text-black underline underline-offset-2 transition-colors"
                                    >
                                        X
                                    </a>
                                    .
                                </p>
                                <button
                                    onClick={() => onNavigate('/terms')}
                                    className="text-sm font-bold text-gray-600 hover:text-black underline underline-offset-4 transition-colors self-start sm:self-auto"
                                >
                                    View Terms of Service
                                </button>
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
