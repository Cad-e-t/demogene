
import React from 'react';

interface PricingViewProps {
    onPurchase: (productId?: string) => void;
}

const SINGLE_DEMO_PRODUCT = "pdt_0NVMGufalf98j4GMNZu1g";
const PACK_10_DEMOS_PRODUCT = "pdt_2LwDVRweVv9iX22U5RDSW";

export const PricingView: React.FC<PricingViewProps> = ({ onPurchase }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-6 md:p-12 animate-fade-in overflow-y-auto">
            <div className="max-w-4xl w-full text-center mb-16 mt-8">
                <a 
                    href="#/" 
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 mb-8 uppercase tracking-widest transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </a>
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6 uppercase">Simple Transparent Pricing</h1>
                <p className="text-xl text-gray-600 font-medium">No monthly fees. Pay only for the demos you need.</p>
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                
                {/* 10 DEMO PACK - FEATURED */}
                <div className="bg-white border-[3px] border-green-600 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-green-500/10 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
                    
                    <div className="absolute top-6 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-600/20">
                            Most Popular
                        </span>
                    </div>
                    
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mt-8 mb-4">10 Demo Pack</h2>
                    
                    <div className="flex items-baseline gap-1 mb-10">
                        <span className="text-6xl md:text-8xl font-black text-gray-900">$12</span>
                        <span className="text-xl text-gray-400 font-bold uppercase tracking-widest">/Pack</span>
                    </div>

                    <div className="w-full space-y-5 mb-12 text-left">
                        {[
                            { text: "10 Demo Credits", bold: "Full pack" },
                            { text: "AI-Narrated voiceovers", bold: "Premium" },
                            { text: "Smart zooms & pacing", bold: "Professional" },
                            { text: "Custom background styles", bold: "Infinite" },
                            { text: "Credits never expire", bold: "Lifetime" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-base text-gray-700 font-medium">
                                    <span className="text-gray-900 font-bold">{item.bold}</span> - {item.text}
                                </p>
                            </div>
                        ))}
                        <a 
                            href="https://x.com/Henrylabss" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 group/chat"
                        >
                            <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover/chat:scale-110 transition-transform">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                            </div>
                            <p className="text-base text-gray-500 font-bold hover:text-blue-500 transition-colors">
                                Chat with the founder directly
                            </p>
                        </a>
                    </div>

                    <button 
                        onClick={() => onPurchase(PACK_10_DEMOS_PRODUCT)}
                        className="w-full py-6 bg-green-600 text-white rounded-2xl font-black text-2xl hover:bg-green-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 transform active:scale-[0.98] uppercase tracking-tighter"
                    >
                        Get 10 Demos
                    </button>
                </div>

                {/* SINGLE DEMO - ALTERNATIVE */}
                <div className="bg-white border-2 border-gray-200 rounded-[40px] p-8 md:p-12 shadow-sm flex flex-col items-center text-center relative group hover:border-gray-300 transition-colors">
                    
                    <h2 className="text-2xl font-black text-gray-500 uppercase tracking-tighter mt-4 mb-4">Single Demo</h2>
                    
                    <div className="flex items-baseline gap-1 mb-10">
                        <span className="text-5xl md:text-7xl font-black text-gray-900">$2</span>
                        <span className="text-xl text-gray-400 font-bold uppercase tracking-widest">/One</span>
                    </div>

                    <div className="w-full space-y-5 mb-12 text-left">
                        {[
                            { text: "1 Full Demo Credit", bold: "Single use" },
                            { text: "Standard voice options", bold: "All-access" },
                            { text: "Smart zooms & pacing", bold: "Professional" },
                            { text: "Download anytime", bold: "Instant" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-base text-gray-500 font-medium">
                                    <span className="text-gray-700 font-bold">{item.bold}</span> - {item.text}
                                </p>
                            </div>
                        ))}
                        <a 
                            href="https://x.com/Henrylabss" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 group/chat"
                        >
                            <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover/chat:scale-110 transition-transform">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                            </div>
                            <p className="text-base text-gray-500 font-bold hover:text-blue-500 transition-colors">
                                Chat with the founder directly
                            </p>
                        </a>
                    </div>

                    <button 
                        onClick={() => onPurchase(SINGLE_DEMO_PRODUCT)}
                        className="w-full py-5 border-2 border-gray-900 text-gray-900 rounded-2xl font-black text-xl hover:bg-gray-900 hover:text-white transition-all transform active:scale-[0.98] uppercase tracking-tighter"
                    >
                        Buy One Demo
                    </button>
                    
                    <p className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Perfect for testing out the tool
                    </p>
                </div>
            </div>
            
            <div className="mt-16 text-center max-w-2xl px-6">
                <p className="text-gray-400 text-sm font-medium mb-4">Secure payment via Dodo Payments. Credits never expire. All features included in every purchase.</p>
                <div className="flex items-center justify-center gap-6 opacity-30 grayscale">
                    <img src="https://dodopayments.com/logo-dark.svg" className="h-6" alt="Dodo Payments" />
                    <div className="w-px h-6 bg-gray-300"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-900">Encrypted Transactions</span>
                </div>
            </div>
        </div>
    );
};
