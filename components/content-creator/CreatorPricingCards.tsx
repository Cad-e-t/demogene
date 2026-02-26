
import React from 'react';

const STARTER_ID = "pdt_T48406oZ5JfWEo1XFEx9C";
const PRO_ID = "pdt_aaVFvXmh0fAAa9TMyygKI";
const BUSINESS_ID = "pdt_IkNZmPAGOSqCxUpSBwg2r";

interface PricingCardProps {
    title: string;
    price: string;
    highlights: React.ReactNode;
    features: string[];
    isPopular?: boolean;
    buttonLabel: string;
    onAction: () => void;
    color: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ title, price, highlights, features, isPopular, buttonLabel, onAction, color }) => (
    <div className={`relative flex flex-col p-8 bg-zinc-900 rounded-[32px] border transition-all duration-300 ${isPopular ? 'border-yellow-500 shadow-2xl scale-105 z-10' : 'border-white/10 shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:border-white/20'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-600 text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                Most Popular
            </div>
        )}
        
        <div className="mb-8 text-center">
            <h3 className={`text-2xl font-black uppercase tracking-tighter ${color}`}>{title}</h3>
            <div className="flex items-center justify-center gap-1 mt-4">
                <span className="text-5xl font-black text-white">${price}</span>
                <span className="text-sm font-bold text-gray-400 self-end mb-2">/ pack</span>
            </div>
        </div>

        <button 
            onClick={onAction}
            className={`w-full py-4 mb-8 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${isPopular ? 'bg-yellow-600 text-black hover:bg-yellow-700' : 'bg-white text-black hover:bg-gray-200'}`}
        >
            {buttonLabel}
        </button>

        <div className="mb-8 space-y-3 text-center">
            {highlights}
        </div>

        <div className="w-full h-px bg-white/10 mb-8"></div>

        <ul className="space-y-4 mb-8 flex-1 text-left">
            {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-400 leading-relaxed">
                    <svg className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feat}</span>
                </li>
            ))}
        </ul>
    </div>
);

interface CreatorPricingCardsProps {
    onAction: (productId: string) => void;
    actionLabel: string;
}

export const CreatorPricingCards: React.FC<CreatorPricingCardsProps> = ({ onAction, actionLabel }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto items-stretch">
            <PricingCard 
                title="Starter"
                price="19"
                color="text-white"
                highlights={
                    <>
                        <p className="font-black text-xl block mt-1 text-white">30 Short Videos / month
                        </p>
                        <p className="text-sm font-bold text-gray-400">700 Credits per Month</p>
                    </>
                }
                features={[
                    "Optimized for YouTube Shorts",
                    "Instagram Reels & TikTok Compatibility",
                    "Faceless Shorts",
                    "10+ visual styles",
                    "Library of 20+ voices",
                    "Story-Driven Short Videos",
                    "Facts-Based Video Shorts",
                    "Subtitled Video Shorts"
                ]}
                buttonLabel={actionLabel}
                onAction={() => onAction(STARTER_ID)}
            />
            
            <PricingCard 
                title="Pro"
                price="49"
                isPopular
                color="text-yellow-500"
                highlights={
                    <>
                        <p className="font-black text-xl block mt-1 text-white">100 Short Videos / month
                        </p>
                        <p className="text-base text-gray-300 leading-tight font-bold">
                            + 30 Long Videos
                        </p>
                        <p className="text-sm font-bold text-yellow-400 pt-1">1800 Credits per Month</p>
                    </>
                }
                features={[
                    "Optimized for YouTube Shorts",
                    "Instagram Reels & TikTok Compatibility",
                    "Faceless Shorts",
                    "10+ visual styles",
                    "Library of 20+ voices",
                    "Story-Driven Short Videos",
                    "Subtitled Video Shorts"
                ]}
                buttonLabel={actionLabel}
                onAction={() => onAction(PRO_ID)}
            />
            
            <PricingCard 
                title="Business"
                price="149"
                color="text-purple-500"
                highlights={
                    <>
                        <p className="font-black text-xl block mt-1 text-white">250 Short Videos / month
                        </p>
                        <p className="text-base text-gray-300 leading-tight font-bold">
                            + 100 Long Videos
                        </p>
                        <p className="text-sm font-bold text-purple-400 pt-1">5500 Credits per Month</p>
                    </>
                }
                features={[
                    "Optimized for YouTube Shorts",
                    "Instagram Reels & TikTok Compatibility",
                    "Faceless Shorts",
                    "10+ visual styles",
                    "Library of 20+ voices",
                    "Story-Driven Short Videos",
                    "Facts-Based Video Shorts",
                    "Subtitled Video Shorts"
                ]}
                buttonLabel={actionLabel}
                onAction={() => onAction(BUSINESS_ID)}
            />
        </div>
    );
};
