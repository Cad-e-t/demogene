
import React from 'react';

interface Props {
    currentView: string;
    setView: (v: any) => void;
    onNavigate: (path: string) => void;
}

export const ContentSidebar: React.FC<Props> = ({ currentView, setView, onNavigate }) => {
    const navigate = (view: string) => {
        onNavigate(`/content-creator/${view}`);
    };

    return (
        <aside className="w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col items-center md:items-stretch py-6 z-20 shrink-0">
             <div className="px-6 mb-10 hidden md:block">
                 <span className="font-black text-lg tracking-tighter text-indigo-600 uppercase">Creator</span>
             </div>
             
             <div className="flex flex-col gap-2 w-full px-2">
                 <NavButton icon="✨" label="Create" active={currentView === 'dashboard'} onClick={() => navigate('dashboard')} />
                 <NavButton icon="folder" label="Projects" active={currentView === 'projects'} onClick={() => navigate('projects')} />
                 <NavButton icon="play" label="Stories" active={currentView === 'stories'} onClick={() => navigate('stories')} />
             </div>

             <div className="mt-auto px-4">
                 <button onClick={() => onNavigate('/')} className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition uppercase tracking-widest hidden md:block w-full text-left">
                     ← ProductCam
                 </button>
             </div>
        </aside>
    );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
    >
        <span className="text-xl md:text-lg">{icon === 'folder' ? '📂' : icon === 'play' ? '🎬' : icon}</span>
        <span className="font-bold hidden md:inline text-sm">{label}</span>
    </button>
);