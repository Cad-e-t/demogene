
import React, { useState } from 'react';

interface Props {
    currentView: string;
    setView: (v: any) => void;
    onNavigate: (path: string) => void;
}

export const ContentSidebar: React.FC<Props> = ({ currentView, setView, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);

    const navigate = (view: string) => {
        onNavigate(`/content-creator/${view}`);
        setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-center z-40 px-4">
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="absolute left-4 p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {isOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
                <span className="font-black text-lg tracking-tighter text-indigo-600 uppercase">CREATOR</span>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed md:relative top-14 md:top-0 bottom-0 left-0 z-40 md:z-20
                bg-white border-r border-gray-200 
                flex flex-col items-center md:items-stretch py-6 shrink-0 
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                w-1/2 md:w-64
            `}>
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
                     {/* Mobile Back to Home */}
                     <button onClick={() => onNavigate('/')} className="md:hidden text-xs font-bold text-gray-400 hover:text-indigo-600 transition uppercase tracking-widest w-full text-center mt-4">
                         Exit
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
