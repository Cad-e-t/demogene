
import React from 'react';

interface SidebarProps {
    currentView: 'home' | 'videos';
    setCurrentView: (view: 'home' | 'videos') => void;
    handleLogout: () => void;
}

const SidebarIcon = ({ active, onClick, label, path }: any) => (
    <button 
        onClick={onClick}
        className={`group relative w-full h-16 flex items-center justify-center transition-colors ${active ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
    >
        {path}
        <div className="absolute left-full top-0 h-full bg-gray-900 border-l border-r border-gray-800 flex items-center overflow-hidden w-0 group-hover:w-32 transition-all duration-300 z-50">
             <span className="pl-4 whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {label}
             </span>
        </div>
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, handleLogout }) => {
    return (
        <aside className="fixed top-0 left-0 bottom-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center z-50">
             <div className="h-16 w-full flex items-center justify-center border-b border-gray-800 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
             </div>
             <div className="w-full flex flex-col gap-2">
                <SidebarIcon 
                    active={currentView === 'home'} 
                    onClick={() => setCurrentView('home')} 
                    label="Home"
                    path={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                />
                <SidebarIcon 
                    active={currentView === 'videos'} 
                    onClick={() => setCurrentView('videos')} 
                    label="Videos"
                    path={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                />
             </div>
             <div className="mt-auto mb-4">
                 <button onClick={handleLogout} className="text-gray-500 hover:text-white" title="Logout">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 </button>
             </div>
        </aside>
    );
};
