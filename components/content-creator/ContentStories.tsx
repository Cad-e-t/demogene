

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteStory } from './api';

export const ContentStories = ({ session }: any) => {
    const [stories, setStories] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('content_stories').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
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
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <h2 className="text-3xl font-black mb-8">Your Stories</h2>
            <div className="columns-1 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {stories.map(s => (
                    <div key={s.id} className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-lg group relative">
                        {s.status === 'completed' ? (
                            <video 
                                src={s.video_url} 
                                controls 
                                poster={s.thumbnail_url}
                                className="w-full h-auto object-cover"
                            />
                        ) : s.status === 'failed' ? (
                             <div className="aspect-[9/16] bg-red-50 flex flex-col items-center justify-center p-6 text-center">
                                <span className="text-red-500 font-bold mb-2">Generation Failed</span>
                                <span className="text-xs text-red-400">Please try again</span>
                             </div>
                        ) : (
                             <div className="aspect-[9/16] bg-gray-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                                {s.thumbnail_url && <img src={s.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 relative z-10"></div>
                                <span className="text-white font-bold relative z-10 animate-pulse uppercase tracking-widest text-sm">
                                    {s.status === 'rendering' ? 'Rendering...' : 'Generating...'}
                                </span>
                             </div>
                        )}
                        
                        <div className="p-4 flex justify-between items-center">
                            <p className="text-xs text-gray-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</p>
                            <button 
                                onClick={(e) => handleDelete(e, s.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Video"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};