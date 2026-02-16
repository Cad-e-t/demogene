
import React from 'react';
import { createCheckoutSession } from '../../frontend-api';
import { CreatorPricingCards } from './CreatorPricingCards';

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
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 md:p-12 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                <button 
                    onClick={() => onViewChange('billing')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 mb-8 uppercase tracking-widest transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </button>

                <h1 className="text-4xl font-black text-slate-900 mb-12 text-center uppercase tracking-tighter">Get Credits</h1>

                <CreatorPricingCards 
                    onAction={handlePurchase} 
                    actionLabel="Buy Pack" 
                />
            </div>
        </div>
    );
};
