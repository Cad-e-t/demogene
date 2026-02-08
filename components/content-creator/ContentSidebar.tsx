
import React from 'react';

interface Props {
    currentView: string;
    setView: (v: any) => void;
    onNavigate: (path: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const ContentSidebar: React.FC<Props> = ({ currentView, setView, onNavigate, isOpen, onClose }) => {
    
    const navigate = (view: string) => {
        onNavigate(`/content-creator/${view}`);
        onClose();
    };

    return (
        <>
            {/* Mobile Overlay (Blur) */}
            {isOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-40 bg-white/10 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50 md:z-auto
                bg-white border-r border-gray-200 
                flex flex-col items-center md:items-stretch py-6 shrink-0 
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                w-3/4 md:w-64 shadow-2xl md:shadow-none
            `}>
                 <div className="px-6 mb-10 hidden md:block">
                     <span className="font-black text-lg tracking-tighter text-indigo-600 uppercase">Creator</span>
                 </div>
                 
                 {/* Mobile Logo inside Sidebar for context if needed, or keep clean */}
                 <div className="px-6 mb-8 md:hidden flex items-center gap-2">
                     <span className="font-black text-xl tracking-tighter text-indigo-600 uppercase">Creator</span>
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
                     {/* Mobile Back to Home */}
                     <button onClick={() => onNavigate('/')} className="md:hidden text-xs font-bold text-gray-400 hover:text-indigo-600 transition uppercase tracking-widest w-full text-center mt-4">
                         Exit to Home
                     </button>
                 </div>
            </aside>
        </>
    );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
    >
        <span className="text-xl md:text-lg">{icon === 'folder' ? '📂' : icon === 'play' ? '🎬' : icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </button>
);
