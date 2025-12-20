
import React, { useState } from 'react';

interface SidebarProps {
    currentView: 'home' | 'videos' | 'blog' | 'blog-post';
    setCurrentView: (view: 'home' | 'videos' | 'blog' | 'blog-post') => void;
    handleLogout: () => void;
}

const SidebarIcon = ({ active, onClick, label, path }: any) => (
    <button 
        onClick={onClick}
        className={`group relative w-full h-12 flex items-center justify-center transition-colors duration-200 ${active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
        title={label}
    >
        {path}
        {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-green-600 rounded-r hidden md:block"></div>
        )}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, handleLogout }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleMobileNav = (view: 'home' | 'videos' | 'blog' | 'blog-post') => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
    };

    const handleMobileLogout = () => {
        handleLogout();
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* --- DESKTOP SIDEBAR (Visible md+) --- */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-14 bg-white border-r border-gray-200 flex-col items-center z-50 pt-4">
                 {/* Logo */}
                 <div onClick={() => setCurrentView('home')} className="mb-6 w-8 h-8 flex items-center justify-center bg-green-50 rounded-full text-[10px] font-bold text-green-700 select-none border border-green-100 cursor-pointer">
                     PC
                 </div>

                 {/* Icons */}
                 <div className="w-full flex flex-col gap-1">
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
                    <SidebarIcon 
                        active={currentView === 'blog' || currentView === 'blog-post'} 
                        onClick={() => setCurrentView('blog')} 
                        label="Blog"
                        path={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4v4h4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12h10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16h10" /></svg>}
                    />
                 </div>
                 
                 <div className="mt-auto mb-4 w-full flex justify-center">
                     <button onClick={handleLogout} className="text-gray-400 hover:text-gray-900 p-2 transition-colors">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                     </button>
                 </div>
            </aside>

            {/* --- MOBILE TOPBAR --- */}
            <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
                     <div className="w-7 h-7 flex items-center justify-center bg-green-50 rounded-full text-[10px] font-bold text-green-700 border border-green-100">
                         PC
                     </div>
                     <span className="font-bold text-sm text-gray-900">ProductCam</span>
                </div>

                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 hover:text-black"
                >
                    {isMobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-2xl flex flex-col p-4 gap-2 animate-fade-in">
                        <button 
                            onClick={() => handleMobileNav('home')}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${currentView === 'home' ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Create New Demo
                        </button>
                        <button 
                            onClick={() => handleMobileNav('videos')}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${currentView === 'videos' ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            My Videos
                        </button>
                        <button 
                            onClick={() => handleMobileNav('blog')}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${currentView === 'blog' ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Guides & Blog
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button 
                            onClick={handleMobileLogout}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </nav>
        </>
    );
};
