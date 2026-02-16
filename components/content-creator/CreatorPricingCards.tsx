
import React from 'react';

const STARTER_ID = "pdt_T48406oZ5JfWEo1XFEx9C";
const PRO_ID = "pdt_aaVFvXmh0fAAa9TMyygKI";
const BUSINESS_ID = "pdt_IkNZmPAGOSqCxUpSBwg2r";

interface PricingCardProps {
    title: string;
    price: string;
    credits: string;
    videos: string;
    features: string[];
    isPopular?: boolean;
    buttonLabel: string;
    onAction: () => void;
    color: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ title, price, credits, videos, features, isPopular, buttonLabel, onAction, color }) => (
    <div className={`relative flex flex-col p-8 bg-white rounded-[32px] border transition-all duration-300 ${isPopular ? 'border-blue-500 shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                Most Popular
            </div>
        )}
        
        <div className="mb-6">
            <h3 className={`text-xl font-black uppercase tracking-tighter ${color}`}>{title}</h3>
            <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-black text-slate-900">${price}</span>
                <span className="text-sm font-bold text-slate-400">/ pack</span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500">{credits} Credits</p>
            <p className="text-xs font-medium text-slate-400">Est. {videos} Videos</p>
        </div>

        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                    <svg className={`w-5 h-5 shrink-0 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feat}
                </li>
            ))}
        </ul>

        <button 
            onClick={onAction}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${isPopular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-black'}`}
        >
            {buttonLabel}
        </button>
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
                credits="700"
                videos="~15"
                features={[
                    "High-Quality Images",
                    "Standard Voice Models",
                    "No Watermark",
                    "Commercial Rights"
                ]}
                buttonLabel={actionLabel}
                onAction={() => onAction(STARTER_ID)}
                color="text-slate-900"
            />
            <PricingCard 
                title="Pro"
                price="49"
                credits="1,800"
                videos="~40"
                features={[
                    "Everything in Starter",
                    "Ultra-Quality Visuals",
                    "Premium Voice Models",
                    "Priority Generation",
                    "Image Editing Access"
                ]}
                isPopular
                buttonLabel={actionLabel}
                onAction={() => onAction(PRO_ID)}
                color="text-blue-600"
            />
            <PricingCard 
                title="Business"
                price="149"
                credits="5,500"
                videos="~120"
                features={[
                    "Everything in Pro",
                    "Maximum Parallelism",
                    "Direct Founder Support",
                    "Early Feature Access",
                    "Bulk Generation"
                ]}
                buttonLabel={actionLabel}
                onAction={() => onAction(BUSINESS_ID)}
                color="text-purple-600"
            />
        </div>
    );
};
