
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { VideoProject } from '../types';
import { deleteVideo } from '../frontend-api';

interface AssetLibraryProps {
    session: any;
    onSelect: (video: VideoProject) => void;
    onUpload: (file: File) => void;
    onClose: () => void;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ session, onSelect, onUpload, onClose }) => {
    const [uploads, setUploads] = useState<VideoProject[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (session) fetchUploads();
    }, [session]);

    const fetchUploads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'uploaded') // Only show raw uploads
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setUploads(data as VideoProject[]);
        }
        setLoading(false);
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
            onClose();
        }
    };

    const handleDelete = async (e: React.MouseEvent, vid: VideoProject) => {
        e.stopPropagation();
        if (window.confirm("Delete this recording? This cannot be undone.")) {
            try {
                // Optimistically remove from UI
                setUploads(prev => prev.filter(u => u.id !== vid.id));
                await deleteVideo(vid);
            } catch(e) {
                console.error("Failed to delete", e);
                alert("Failed to delete video. Please try again.");
                fetchUploads(); // Revert on failure
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white z-10">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Select Recording</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raw uploads cleared automatically after 7 days</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        
                        {/* Upload New Card */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video rounded-2xl border-2 border-dashed border-green-300 bg-green-50/50 hover:bg-green-50 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center group text-center p-4"
                        >
                            <div className="w-12 h-12 bg-white text-green-600 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span className="font-black text-green-700 uppercase tracking-tight text-sm">Upload New</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-1">MP4 / MOV</span>
                            <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={onFileSelect} />
                        </div>

                        {loading && Array.from({length:3}).map((_, i) => (
                             <div key={i} className="aspect-video bg-gray-200 rounded-2xl animate-pulse"></div>
                        ))}

                        {!loading && uploads.map(vid => (
                            <div 
                                key={vid.id} 
                                onClick={() => { onSelect(vid); onClose(); }}
                                className="group bg-white rounded-2xl p-3 border border-gray-100 hover:border-green-500 hover:shadow-xl transition-all cursor-pointer flex flex-col relative"
                            >
                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => handleDelete(e, vid)}
                                        className="p-1.5 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full shadow-sm border border-gray-200 backdrop-blur-sm"
                                        title="Delete Asset"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                
                                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3 relative shrink-0">
                                    <video src={vid.input_video_url || ''} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                </div>
                                <h4 className="font-bold text-gray-900 truncate text-sm mb-auto">{vid.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(vid.created_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
