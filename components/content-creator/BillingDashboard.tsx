

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export const BillingDashboard = ({ session, onViewChange, onToggleSidebar }: any) => {
    const [credits, setCredits] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Credits from unified profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) setCredits(profile.credits || 0);

                // Fetch Transactions from creator_transactions table
                const { data: txs } = await supabase
                    .from('creator_transactions')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });
                
                if (txs) setTransactions(txs);

            } catch (e) {
                console.error("Error fetching billing data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session]);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-black p-6 md:p-12">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-black z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter">Dashboard</h1>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <h1 className="hidden md:block text-3xl font-black text-white mb-8 uppercase tracking-tighter">Dashboard</h1>

            <div className="max-w-4xl space-y-12">
                {/* Balance Card */}
                <div className="bg-zinc-900 rounded-3xl p-8 shadow-sm border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col items-start">
                        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Current Balance</h2>
                        <div className={`text-5xl font-black ${credits < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {loading ? '...' : credits.toLocaleString()} <span className="text-xl text-zinc-600 font-bold">Credits</span>
                        </div>
                        <button 
                            onClick={() => setIsPricingModalOpen(true)}
                            className="mt-3 text-xs font-bold text-zinc-500 hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500 transition-colors"
                        >
                            Learn how credits are charged
                        </button>
                    </div>
                    <button 
                        onClick={() => onViewChange('creator-pricing')}
                        className="w-full md:w-auto px-8 py-4 bg-yellow-600 text-white font-black rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-600/20 uppercase tracking-widest"
                    >
                        Add Credits
                    </button>
                </div>

                {/* Transactions */}
                <div>
                    <h3 className="text-xl font-black text-white mb-6">Recent Transactions</h3>
                    <div className="bg-zinc-900 rounded-3xl shadow-sm border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 font-medium">No transactions found.</div>
                            ) : (
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-black border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</th>
                                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-black/50 transition">
                                                <td className="px-6 py-4 text-sm font-bold text-zinc-400">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-white">
                                                    {tx.description}
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-black text-right ${tx.amount > 0 ? 'text-green-600' : 'text-white'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Details Modal */}
            {isPricingModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Credit Pricing</h3>
                            <button onClick={() => setIsPricingModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Image Generation</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-white/5">
                                        <span className="text-sm font-bold text-zinc-200">Ultra Quality</span>
                                        <span className="text-sm font-black text-yellow-600">4 credits / image</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-white/5">
                                        <span className="text-sm font-bold text-zinc-200">Ultimate Quality</span>
                                        <span className="text-sm font-black text-yellow-600">10.2 credits / image</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-white/5">
                                        <span className="text-sm font-bold text-zinc-200">Image Editing</span>
                                        <span className="text-sm font-black text-yellow-600">4 credits / edit</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Asset Generation</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-white/5">
                                        <span className="text-sm font-bold text-zinc-200">Audio Generation</span>
                                        <span className="text-sm font-black text-yellow-600">3 credits / minute <span className="text-xs font-medium text-zinc-500">(0.05/sec)</span></span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-white/5">
                                        <span className="text-sm font-bold text-zinc-200">Subtitles Generation</span>
                                        <span className="text-sm font-black text-yellow-600">1 credit / minute <span className="text-xs font-medium text-zinc-500">(0.017/sec)</span></span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-xl">
                                <p className="text-sm font-bold text-yellow-600 text-center">
                                    A min video cost approximately 28 - 44 credits for ULTRA and 64 - 104 credits for ULTIMATE
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 bg-black">
                            <button 
                                onClick={() => setIsPricingModalOpen(false)}
                                className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors uppercase tracking-widest text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
