
import React from 'react';

export const ContentLanding = ({ onLogin }: { onLogin: () => void }) => {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Creator</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mb-12">
                Turn prompt ideas into viral short videos with AI-generated visuals, narration, and editing.
            </p>
            <button 
                onClick={onLogin}
                className="px-10 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest"
            >
                Start Creating
            </button>
        </div>
    );
};
