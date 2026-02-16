import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export const BillingDashboard = ({ session, onViewChange, onToggleSidebar }: any) => {
    const [credits, setCredits] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

                // Fetch Transactions from unified credit_transactions table
                const { data: txs } = await supabase
                    .from('credit_transactions')
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
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 md:p-12">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-slate-50 z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Dashboard</h1>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <h1 className="hidden md:block text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Dashboard</h1>

            <div className="max-w-4xl space-y-12">
                {/* Balance Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Current Balance</h2>
                        <div className="text-5xl font-black text-blue-600">
                            {loading ? '...' : credits.toLocaleString()} <span className="text-xl text-slate-300 font-bold">Credits</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onViewChange('creator-pricing')}
                        className="px-8 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 uppercase tracking-widest"
                    >
                        Add Credits
                    </button>
                </div>

                {/* Transactions */}
                <div>
                    <h3 className="text-xl font-black text-slate-900 mb-6">Recent Transactions</h3>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-medium">No transactions found.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                {tx.description}
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-black text-right ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
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
    );
};