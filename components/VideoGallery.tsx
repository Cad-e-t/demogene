import React from 'react';
import { VideoProject, ProcessingStatus } from '../types';

interface VideoGalleryProps {
    videos: VideoProject[];
    onSelectVideo: (video: VideoProject) => void;
    fetchVideos: () => void;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, onSelectVideo, fetchVideos }) => {
    
    const getStatusText = (step?: ProcessingStatus['step']) => {
        switch(step) {
            case 'analyzing': return 'Analyzing Content...';
            case 'generating_audio': return 'Generating Voiceover...';
            case 'rendering': return 'Rendering Video...';
            default: return 'Processing...';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white">Your Videos</h2>
                <button onClick={fetchVideos} className="text-sm text-gray-400 hover:text-white px-3 py-1 bg-gray-800 rounded-lg border border-gray-700 transition">Refresh List</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos.map((vid) => (
                    <div 
                        key={vid.id} 
                        onClick={() => vid.status === 'completed' ? onSelectVideo(vid) : null} 
                        className={`group bg-gray-900 border rounded-xl overflow-hidden transition-all duration-300
                            ${vid.status === 'completed' 
                                ? 'border-gray-800 hover:border-indigo-500/50 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1' 
                                : 'border-indigo-500/30 cursor-default'
                            }`}
                    >
                        {vid.status === 'processing' ? (
                             <div className="aspect-video bg-black/50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                                 {/* Animated Processing Background */}
                                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 to-purple-900/10 animate-pulse"></div>
                                 
                                 <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 z-10"></div>
                                 <p className="text-indigo-300 font-medium z-10 animate-pulse">{getStatusText(vid.processingStep)}</p>
                                 <p className="text-xs text-gray-500 mt-2 z-10">This may take a minute</p>
                             </div>
                        ) : vid.status === 'failed' ? (
                            <div className="aspect-video bg-red-900/10 flex flex-col items-center justify-center p-6">
                                <svg className="w-10 h-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-red-400 font-medium">Processing Failed</p>
                                <p className="text-xs text-red-500/70 mt-1 text-center">{vid.errorMessage || "Unknown error"}</p>
                            </div>
                        ) : (
                            <div className="aspect-video bg-black relative">
                                <video 
                                    src={vid.final_video_url || ""} 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    muted 
                                    onMouseOver={e => e.currentTarget.play()} 
                                    onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-medium text-white border border-white/10">
                                    {vid.voice_id === 'voiceless' ? 'No Voice' : 'Narrated'}
                                </div>
                            </div>
                        )}
                        
                        <div className="p-5">
                            <h3 className="font-semibold text-lg text-white mb-2 truncate" title={vid.title}>{vid.title}</h3>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">{new Date(vid.created_at).toLocaleDateString()}</p>
                                {vid.status === 'processing' && <span className="text-xs text-indigo-400 font-medium px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">Processing</span>}
                                {vid.status === 'failed' && <span className="text-xs text-red-400 font-medium px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">Failed</span>}
                            </div>
                        </div>
                    </div>
                ))}
                {videos.length === 0 && <div className="col-span-full py-32 text-center text-gray-500 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">No videos created yet.</div>}
            </div>
        </div>
    );
};