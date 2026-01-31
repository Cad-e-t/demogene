
import React, { useEffect } from 'react';

export const PricingPageSEO: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Pricing Details - Plans & Credits | ProductCam";
    }, []);

    const faq = [
        {
            q: "Which plan is right for you?",
            a: "The Basic plan ($15) is perfect for validating ideas or one-off launches with 10 credits. The Premium plan ($29) offers the best value per credit (30 credits) for growth-stage startups. For teams needing high volume, the Pro plan ($60) provides 100 credits."
        },
        {
            q: "Do credits expire?",
            a: "No. Your credits are yours forever. You can purchase a pack today and use the credits over the next few months or years without worry."
        },
        {
            q: "Is there a free trial for ProductCam?",
            a: "We currently operate on a pay-per-pack model to keep costs sustainable and avoid monthly subscriptions. This allows you to pay only for exactly what you need without recurring charges."
        },
        {
            q: "How are credits charged?",
            a: "A single credit is deducted from your balance only when a demo is successfully generated. If the process fails for any reason, your credit is not charged."
        }
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-green-500 selection:text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
                <nav className="mb-16 flex items-center justify-between border-b border-gray-100 pb-8">
                    <a href="https://productcam.site" className="flex items-center gap-2 group">
                         <span className="font-black text-xl text-gray-900 tracking-tighter uppercase">ProductCam</span>
                    </a>
                    <a href="https://productcam.site" className="text-sm font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                        Home
                    </a>
                </nav>

                <header className="mb-20">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase mb-6">Pricing Information</h1>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-2xl">
                        Transparent, credit-based pricing. No subscriptions, no hidden fees.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 items-start">
                    {/* Basic */}
                    <div className="p-8 border-2 border-gray-100 rounded-[40px] hover:border-gray-200 transition-all">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Basic</h2>
                        <div className="text-4xl font-black text-gray-900 mb-6">$15 <span className="text-sm text-gray-400 uppercase font-bold tracking-widest">/pack</span></div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 font-medium text-gray-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                10 Generation Credits
                            </li>
                            <li className="flex items-center gap-3 font-medium text-gray-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Watermark-free export
                            </li>
                        </ul>
                    </div>

                    {/* Premium */}
                    <div className="p-8 border-2 border-green-600 rounded-[40px] bg-green-50/30 relative overflow-hidden">
                        <div className="absolute top-4 right-4 bg-green-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">Popular</div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Premium</h2>
                        <div className="text-4xl font-black text-gray-900 mb-6">$29 <span className="text-sm text-gray-400 uppercase font-bold tracking-widest">/pack</span></div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 font-medium text-gray-900">
                                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                30 Generation Credits
                            </li>
                            <li className="flex items-center gap-3 font-medium text-gray-900">
                                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                Priority Processing
                            </li>
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className="p-8 border-2 border-gray-100 rounded-[40px] hover:border-gray-200 transition-all">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Pro</h2>
                        <div className="text-4xl font-black text-gray-900 mb-6">$60 <span className="text-sm text-gray-400 uppercase font-bold tracking-widest">/pack</span></div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 font-medium text-gray-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                100 Generation Credits
                            </li>
                            <li className="flex items-center gap-3 font-medium text-gray-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Direct Founder Support
                            </li>
                        </ul>
                    </div>
                </div>

                <section className="space-y-16">
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter text-center">Frequently Asked Questions</h2>
                    <div className="space-y-12">
                        {faq.map((item, i) => (
                            <div key={i}>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4">{item.q}</h3>
                                <p className="text-lg text-gray-600 leading-relaxed font-medium">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em]">ProductCam Pricing © 2025</p>
                    <div className="flex gap-8">
                        <a href="https://productcam.site" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Home</a>
                        <a href="https://productcam.site/#/features" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Features</a>
                        <a href="https://productcam.site/#/about" className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">About</a>
                    </div>
                </footer>
            </div>
        </div>
    );
};
