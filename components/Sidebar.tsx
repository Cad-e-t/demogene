
import React, { useState } from 'react';

interface SidebarProps {
    currentView: 'home' | 'videos';
    setCurrentView: (view: 'home' | 'videos') => void;
    handleLogout: () => void;
    session: any;
}

const SidebarIcon = ({ active, onClick, label, path }: any) => (
    <button 
        onClick={onClick}
        className={`group relative w-full h-12 px-4 flex items-center gap-3 transition-colors duration-200 ${active ? 'bg-green-50 text-green-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        title={label}
    >
        <span className="shrink-0">{path}</span>
        <span className="text-sm font-bold tracking-tight">{label}</span>
        {active && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600 hidden md:block"></div>
        )}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, handleLogout, session }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleMobileNav = (view: 'home' | 'videos') => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
    };

    const handleMobileLogout = () => {
        handleLogout();
        setIsMobileMenuOpen(false);
    };

    const displayName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <>
            {/* --- DESKTOP SIDEBAR (Visible md+) --- */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-gray-200 flex-col z-50 pt-6">
                 {/* Logo */}
                 <div className="px-6 mb-10 flex items-center gap-3">
                     <span className="font-black text-lg tracking-tighter text-gray-900 uppercase">ProductCam</span>
                 </div>

                 {/* Icons */}
                 <div className="w-full flex flex-col gap-1">
                    <SidebarIcon 
                        active={currentView === 'home'} 
                        onClick={() => setCurrentView('home')} 
                        label="Dashboard"
                        path={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    />
                    <SidebarIcon 
                        active={currentView === 'videos'} 
                        onClick={() => setCurrentView('videos')} 
                        label="My Videos"
                        path={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    />
                 </div>
                 
                 {/* Profile Section */}
                 <div className="mt-auto w-full p-2 border-t border-gray-100 relative">
                     {isProfileOpen && (
                        <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-1 animate-fade-in z-[60]">
                            <button 
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Sign Out
                            </button>
                        </div>
                     )}
                     <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors text-left ${isProfileOpen ? 'bg-gray-50' : ''}`}
                     >
                         <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                             {initial}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                         </div>
                         <svg className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                     </button>
                 </div>
            </aside>

            {/* --- MOBILE TOPBAR (Visible < md) --- */}
            <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
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