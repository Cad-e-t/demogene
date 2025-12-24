import React from 'react';
import { VideoProject } from '../types';

interface VideoModalProps {
    video: VideoProject;
    onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
    const handleDownload = async () => {
        if (!video.final_video_url) return;
        
        try {
            const response = await fetch(video.final_video_url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const filename = video.title.toLowerCase().endsWith('.mp4') ? video.title : `${video.title}.mp4`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(video.final_video_url, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex-1 bg-black flex items-center justify-center">
                    {video.final_video_url && (
                        <video src={video.final_video_url} controls autoPlay className="w-full max-h-[60vh] md:max-h-full" />
                    )}
                </div>
                <div className="w-full md:w-96 p-6 border-l border-gray-800 overflow-y-auto bg-gray-900">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-xl leading-tight text-white">{video.title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    {video.final_video_url && (
                        <button 
                            onClick={handleDownload}
                            className="block w-full py-3 bg-white text-black font-bold text-center rounded-lg hover:bg-gray-200 transition"
                        >
                            Download Video
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};