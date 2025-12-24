
import React from 'react';
import { VideoProject } from '../types';

interface VideoModalProps {
    video: VideoProject;
    onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
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
                        <h3 className="font-bold text-xl leading-tight">{video.title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    {video.final_video_url && (
                        <a href={video.final_video_url} download className="block w-full py-3 bg-white text-black font-bold text-center rounded-lg hover:bg-gray-200 transition">Download Video</a>
                    )}
                </div>
            </div>
        </div>
    );
};
