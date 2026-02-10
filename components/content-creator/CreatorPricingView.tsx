
import React from 'react';
import { createCheckoutSession } from '../../frontend-api';

const STARTER_ID = "pdt_T48406oZ5JfWEo1XFEx9C";
const PRO_ID = "pdt_aaVFvXmh0fAAa9TMyygKI";
const BUSINESS_ID = "pdt_IkNZmPAGOSqCxUpSBwg2r";

export const CreatorPricingView = ({ onViewChange }: any) => {
    
    const handlePurchase = async (productId: string) => {
        try {
            const { checkout_url } = await createCheckoutSession(productId);
            window.location.href = checkout_url;
        } catch (e) {
            console.error(e);
            alert("Failed to initiate checkout");
        }
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6 md:p-12 flex flex-col items-center">
            <div className="w-full max-w-5xl">
                <button 
                    onClick={() => onViewChange('billing')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 mb-8 uppercase tracking-widest transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </button>

                <h1 className="text-4xl font-black text-gray-900 mb-12 text-center uppercase tracking-tighter">Get Credits</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Starter */}
                    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Starter</h2>
                        <div className="text-5xl font-black text-indigo-600 mb-2">$19</div>
                        <p className="text-lg font-bold text-gray-500 mb-8">700 Credits</p>
                        
                        <a href="https://x.com/henrylabss" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest mb-8">
                            Chat with founder
                        </a>

                        <button 
                            onClick={() => handlePurchase(STARTER_ID)}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition shadow-lg mt-auto uppercase tracking-widest"
                        >
                            Buy
                        </button>
                    </div>

                    {/* Pro */}
                    <div className="bg-white rounded-[40px] p-8 border-2 border-indigo-600 shadow-xl shadow-indigo-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4"></div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4 relative z-10">Pro</h2>
                        <div className="text-5xl font-black text-indigo-600 mb-2 relative z-10">$49</div>
                        <p className="text-lg font-bold text-gray-500 mb-8 relative z-10">1,800 Credits</p>
                        
                        <a href="https://x.com/henrylabss" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest mb-8 relative z-10">
                            Chat with founder
                        </a>

                        <button 
                            onClick={() => handlePurchase(PRO_ID)}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-lg mt-auto uppercase tracking-widest relative z-10"
                        >
                            Buy
                        </button>
                    </div>

                    {/* Business */}
                    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Business</h2>
                        <div className="text-5xl font-black text-indigo-600 mb-2">$149</div>
                        <p className="text-lg font-bold text-gray-500 mb-8">5,500 Credits</p>
                        
                        <a href="https://x.com/henrylabss" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest mb-8">
                            Chat with founder
                        </a>

                        <button 
                            onClick={() => handlePurchase(BUSINESS_ID)}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition shadow-lg mt-auto uppercase tracking-widest"
                        >
                            Buy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
