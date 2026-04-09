import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteStory } from './api';

const ExpirationBadge = ({ createdAt }: { createdAt: string }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const createdTime = new Date(createdAt).getTime();
            const expirationTime = createdTime + 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            const diff = expirationTime - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                setIsUrgent(true);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                setTimeLeft(`Expires in ${hours}h ${minutes}m`);
                setIsUrgent(hours < 2);
            } else {
                setTimeLeft(`Expires in ${minutes}m`);
                setIsUrgent(true);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(interval);
    }, [createdAt]);

    if (!timeLeft) return null;

    return (
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${isUrgent ? 'bg-red-900/20 text-red-600 border border-red-900/30' : 'bg-black text-zinc-400 border border-white/5'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {timeLeft}
        </div>
    );
};

export const ContentStories = ({ session, onToggleSidebar }: any) => {
    const [stories, setStories] = useState<any[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('content_stories')
                .select('*, content_projects(title, aspect_ratio), demo_projects(title, aspect_ratio)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            setStories(data || []);
        };
        fetch();
        const sub = supabase.channel('stories').on('postgres_changes', { event: '*', schema: 'public', table: 'content_stories' }, fetch).subscribe();
        return () => { sub.unsubscribe(); };
    }, [session]);

    const handleDelete = async (storyId: string) => {
        setConfirmDeleteId(null);
        setIsDeleting(true);
        try {
            setStories(prev => prev.filter(s => s.id !== storyId));
            await deleteStory(storyId, session.user.id);
        } catch(err) {
            console.error(err);
            setError("Failed to delete video. Please try again.");
            setTimeout(() => setError(null), 5000);
            // Refresh list on failure
            const { data } = await supabase
                .from('content_stories')
                .select('*, content_projects(title, aspect_ratio), demo_projects(title, aspect_ratio)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            setStories(data || []);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-black z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Your Stories</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="hidden md:block text-3xl font-black text-white">Your Stories</h2>
                {error && (
                    <div className="text-xs font-bold text-red-600 bg-red-900/20 px-4 py-2 rounded-xl border border-red-900/30 animate-shake">
                        {error}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Delete Video?</h3>
                        <p className="text-zinc-400 text-sm mb-8 font-medium">This will permanently remove the exported video. This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-3 text-sm font-bold text-zinc-400 hover:bg-black rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleDelete(confirmDeleteId)}
                                className="flex-1 py-3 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="columns-1 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {stories.map(s => {
                    const isLandscape = (s.content_projects?.aspect_ratio || s.demo_projects?.aspect_ratio) === '16:9';
                    const aspectClass = isLandscape ? 'aspect-video' : 'aspect-[9/16]';
                    const title = s.content_projects?.title || s.demo_projects?.title || 'Untitled Story';

                    return (
                        <div key={s.id} className="break-inside-avoid bg-zinc-900 rounded-2xl overflow-hidden shadow-lg group relative">
                            {s.status === 'completed' ? (
                                <video 
                                    src={s.video_url} 
                                    controls 
                                    poster={s.thumbnail_url}
                                    className="w-full h-auto object-cover"
                                />
                            ) : s.status === 'failed' ? (
                                 <div className={`${aspectClass} bg-red-900/20 flex flex-col items-center justify-center p-6 text-center`}>
                                    <span className="text-red-500 font-bold mb-2">Generation Failed</span>
                                    <span className="text-xs text-red-400">Please try again</span>
                                 </div>
                            ) : (
                                 <div className={`${aspectClass} bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
                                    {s.thumbnail_url && <img src={s.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4 relative z-10"></div>
                                    <span className="text-white font-bold relative z-10 animate-pulse uppercase tracking-widest text-sm">
                                        {s.status === 'rendering' ? 'Rendering...' : 'Generating...'}
                                    </span>
                                 </div>
                            )}
                            
                            <div className="p-4 flex items-center justify-between">
                                <ExpirationBadge createdAt={s.created_at} />
                                <div className="flex justify-end gap-2">
                                    {s.status === 'completed' && (
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                try {
                                                    const response = await fetch(s.video_url);
                                                    if (!response.ok) throw new Error('Failed to download video. Please try again later.');
                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.style.display = 'none';
                                                    a.href = url;
                                                    a.download = `story-${s.id}.mp4`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(url);
                                                    document.body.removeChild(a);
                                                } catch (err) {
                                                    console.error('Download failed:', err);
                                                    // Fallback: try to download by navigating to the URL with a download attribute
                                                    const a = document.createElement('a');
                                                    a.style.display = 'none';
                                                    a.href = s.video_url;
                                                    a.download = `story-${s.id}.mp4`;
                                                    a.target = '_blank';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                }
                                            }}
                                            className="p-2 text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-full transition-colors"
                                            title="Download Video"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteId(s.id);
                                        }}
                                        disabled={isDeleting}
                                        className="p-2 text-red-500 hover:text-red-700 bg-red-900/20 hover:bg-red-900/40 rounded-full transition-colors disabled:opacity-50"
                                        title="Delete Video"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};