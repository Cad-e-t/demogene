
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export const BillingDashboard = ({ session, onViewChange }: any) => {
    const [credits, setCredits] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Credits
                const { data: profile } = await supabase
                    .from('creator_profile')
                    .select('credits')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) setCredits(profile.credits || 0);

                // Fetch Transactions
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
        <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-6 md:p-12">
            <h1 className="text-3xl font-black text-gray-900 mb-8 uppercase tracking-tighter">Dashboard</h1>

            <div className="max-w-4xl space-y-12">
                {/* Balance Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Current Balance</h2>
                        <div className="text-5xl font-black text-indigo-600">
                            {loading ? '...' : credits.toLocaleString()} <span className="text-xl text-gray-300 font-bold">Credits</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onViewChange('creator-pricing')}
                        className="px-8 py-4 bg-black text-white font-black rounded-xl hover:bg-gray-800 transition shadow-lg shadow-black/10 uppercase tracking-widest"
                    >
                        Add Credits
                    </button>
                </div>

                {/* Transactions */}
                <div>
                    <h3 className="text-xl font-black text-gray-900 mb-6">Recent Transactions</h3>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-medium">No transactions found.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                {tx.description}
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-black text-right ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
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
