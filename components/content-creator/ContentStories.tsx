import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteStory } from './api';

export const ContentStories = ({ session, onToggleSidebar }: any) => {
    const [stories, setStories] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('content_stories')
                .select('*, content_projects(aspect_ratio)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            setStories(data || []);
        };
        fetch();
        const sub = supabase.channel('stories').on('postgres_changes', { event: '*', schema: 'public', table: 'content_stories' }, fetch).subscribe();
        return () => { sub.unsubscribe(); };
    }, [session]);

    const handleDelete = async (e: React.MouseEvent, storyId: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this video?")) {
            try {
                setStories(prev => prev.filter(s => s.id !== storyId));
                await deleteStory(storyId, session.user.id);
            } catch(err) {
                console.error(err);
                alert("Failed to delete video");
            }
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-slate-50 z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Your Stories</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <h2 className="hidden md:block text-3xl font-black mb-8 text-slate-900">Your Stories</h2>

            <div className="columns-1 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {stories.map(s => {
                    const isLandscape = s.content_projects?.aspect_ratio === '16:9';
                    const aspectClass = isLandscape ? 'aspect-video' : 'aspect-[9/16]';

                    return (
                        <div key={s.id} className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-lg group relative">
                            {s.status === 'completed' ? (
                                <video 
                                    src={s.video_url} 
                                    controls 
                                    poster={s.thumbnail_url}
                                    className="w-full h-auto object-cover"
                                />
                            ) : s.status === 'failed' ? (
                                 <div className={`${aspectClass} bg-red-50 flex flex-col items-center justify-center p-6 text-center`}>
                                    <span className="text-red-500 font-bold mb-2">Generation Failed</span>
                                    <span className="text-xs text-red-400">Please try again</span>
                                 </div>
                            ) : (
                                 <div className={`${aspectClass} bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
                                    {s.thumbnail_url && <img src={s.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 relative z-10"></div>
                                    <span className="text-white font-bold relative z-10 animate-pulse uppercase tracking-widest text-sm">
                                        {s.status === 'rendering' ? 'Rendering...' : 'Generating...'}
                                    </span>
                                 </div>
                            )}
                            
                            <div className="p-4 flex justify-between items-center">
                                <p className="text-xs text-slate-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</p>
                                <div className="flex gap-2">
                                    {s.status === 'completed' && (
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                try {
                                                    const response = await fetch(s.video_url);
                                                    if (!response.ok) throw new Error('Network response was not ok');
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
                                        onClick={(e) => handleDelete(e, s.id)}
                                        className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
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