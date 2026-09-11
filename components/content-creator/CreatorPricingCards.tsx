
import React from 'react';

const BASIC_ID = "pdt_0NnKC28379nFXlQADxnIZ";
const STARTER_ID = "pdt_T48406oZ5JfWEo1XFEx9C";
const PRO_ID = "pdt_aaVFvXmh0fAAa9TMyygKI";
const BUSINESS_ID = "pdt_IkNZmPAGOSqCxUpSBwg2r";

interface MinimalPackProps {
    title: string;
    level: string;
    price: string;
    credits: string;
    isPopular?: boolean;
    buttonLabel: string;
    onAction: () => void;
    color: string;
}

const MinimalPack: React.FC<MinimalPackProps> = ({ title, level, price, credits, isPopular, buttonLabel, onAction, color }) => (
    <div className={`relative flex items-center justify-between p-5 md:p-6 bg-white/[0.03] rounded-[24px] border transition-all duration-300 ${isPopular ? 'border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20 shadow-lg' : 'border-white/10 hover:bg-white/[0.06] hover:border-white/20'}`}>
        {isPopular && (
            <div className="absolute -top-3 left-6 bg-yellow-600 text-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Most Popular
            </div>
        )}
        
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 ${color}`}>{level}</span>
                <span className={`text-sm md:text-base font-bold text-white`}>{title}</span>
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-xl md:text-2xl font-black text-white">${price}</span>
                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest pt-1">/ {credits} Credits</span>
            </div>
        </div>

        <button 
            onClick={onAction}
            className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${isPopular ? 'bg-yellow-600 text-black hover:bg-yellow-500' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'}`}
        >
            <span className="hidden sm:inline">{buttonLabel}</span>
            <span className="sm:hidden">Buy</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </button>
    </div>
);

interface CreatorPricingCardsProps {
    onAction: (productId: string) => void;
    actionLabel: string;
}

export const CreatorPricingCards: React.FC<CreatorPricingCardsProps> = ({ onAction, actionLabel }) => {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-10">
            {/* Starter Creator Section */}
            <div>
                <div className="flex items-center gap-3 mb-5 pl-2">
                    <div className="h-4 w-1 bg-white/40 rounded-full" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Starter Creator</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MinimalPack 
                        title="Basic"
                        level="Level 1"
                        price="9"
                        credits="300"
                        color="text-zinc-300"
                        buttonLabel={actionLabel}
                        onAction={() => onAction(BASIC_ID)}
                    />
                    <MinimalPack 
                        title="Starter"
                        level="Level 2"
                        price="20"
                        credits="900"
                        isPopular
                        color="text-zinc-300"
                        buttonLabel={actionLabel}
                        onAction={() => onAction(STARTER_ID)}
                    />
                </div>
            </div>

            {/* Power Creator Section */}
            <div>
                <div className="flex items-center gap-3 mb-5 pl-2">
                     <div className="h-4 w-1 bg-white/40 rounded-full" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Power Creator</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <MinimalPack 
                        title="Pro"
                        level="Level 1"
                        price="45"
                        credits="2000"
                        color="text-purple-400"
                        buttonLabel={actionLabel}
                        onAction={() => onAction(PRO_ID)}
                    />
                    <MinimalPack 
                        title="Business"
                        level="Level 2"
                        price="200"
                        credits="10000"
                        color="text-purple-400"
                        buttonLabel={actionLabel}
                        onAction={() => onAction(BUSINESS_ID)}
                    />
                </div>
            </div>
        </div>
    );
};
