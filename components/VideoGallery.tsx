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
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Your Videos</h2>
                <button onClick={fetchVideos} className="text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition shadow-sm">Refresh List</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos.map((vid) => (
                    <div 
                        key={vid.id} 
                        onClick={() => vid.status === 'completed' ? onSelectVideo(vid) : null} 
                        className={`group bg-white border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl
                            ${vid.status === 'completed' 
                                ? 'border-gray-200 hover:border-green-500/50 cursor-pointer hover:-translate-y-1' 
                                : 'border-green-100 cursor-default'
                            }`}
                    >
                        {vid.status === 'processing' ? (
                             <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                                 {/* Animated Processing Background */}
                                 <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 animate-pulse"></div>
                                 
                                 <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4 z-10"></div>
                                 <p className="text-green-700 font-bold z-10 animate-pulse">{getStatusText(vid.processingStep)}</p>
                                 <p className="text-xs text-gray-500 mt-2 z-10 font-medium">This may take a minute</p>
                             </div>
                        ) : vid.status === 'failed' ? (
                            <div className="aspect-video bg-red-50 flex flex-col items-center justify-center p-6">
                                <svg className="w-10 h-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-red-600 font-bold">Processing Failed</p>
                                <p className="text-xs text-red-500 mt-1 text-center font-medium">{vid.errorMessage || "Unknown error"}</p>
                            </div>
                        ) : (
                            <div className="aspect-video bg-black relative">
                                <video 
                                    src={vid.final_video_url || ""} 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                    muted 
                                    onMouseOver={e => e.currentTarget.play()} 
                                    onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                    {vid.voice_id === 'voiceless' ? 'No Voice' : 'Narrated'}
                                </div>
                            </div>
                        )}
                        
                        <div className="p-5">
                            <h3 className="font-bold text-lg text-gray-900 mb-2 truncate" title={vid.title}>{vid.title}</h3>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500 font-medium">{new Date(vid.created_at).toLocaleDateString()}</p>
                                {vid.status === 'processing' && <span className="text-xs text-green-700 font-bold px-2 py-0.5 bg-green-50 rounded border border-green-100">Processing</span>}
                                {vid.status === 'failed' && <span className="text-xs text-red-600 font-bold px-2 py-0.5 bg-red-50 rounded border border-red-100">Failed</span>}
                            </div>
                        </div>
                    </div>
                ))}
                {videos.length === 0 && <div className="col-span-full py-32 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-200 border-dashed font-medium">No videos created yet.</div>}
            </div>
        </div>
    );
};