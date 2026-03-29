
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Props {
    currentView: string;
    setView: (v: any) => void;
    onNavigate: (path: string) => void;
    isOpen: boolean;
    onClose: () => void;
    session: any;
    credits: number | null;
}

export const ContentSidebar: React.FC<Props> = ({ currentView, setView, onNavigate, isOpen, onClose, session, credits }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [imageError, setImageError] = useState(false);

    const navigate = (view: string) => {
        onNavigate(`/content-creator/${view}`);
        onClose();
    };

    const handleLogout = async () => {
        await (supabase.auth as any).signOut();
        window.location.href = 'https://creator.productcam.site'; 
    };

    const user = session?.user;
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';
    const avatarUrl = user?.user_metadata?.avatar_url;
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <>
            {/* Mobile Overlay (Blur) */}
            {isOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50 md:z-auto
                bg-black border-r border-white/10 
                flex flex-col items-center md:items-stretch py-6 shrink-0 
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                w-3/4 md:w-64 shadow-2xl md:shadow-none
            `}>
                 {/* App Title (Desktop) */}
                 <div className="relative px-6 mb-10 hidden md:block">
                     <div className="flex items-center gap-2 w-full">
                         <span className="font-black text-lg tracking-tighter text-white uppercase">Crappik</span>
                     </div>
                 </div>
                 
                 {/* App Title (Mobile) */}
                 <div className="px-6 mb-8 md:hidden flex items-center gap-2 relative">
                     <div className="flex items-center gap-2">
                        <span className="font-black text-xl tracking-tighter text-white uppercase">Crappik</span>
                     </div>
                 </div>
                 
                 <div className="flex flex-col gap-2 w-full px-2">
                     <NavButton icon="📊" label="Dashboard" active={currentView === 'billing'} onClick={() => navigate('billing')} />
                     <NavButton icon="✨" label="Create" active={currentView === 'dashboard'} onClick={() => navigate('dashboard')} />
                     <NavButton icon="folder" label="Projects" active={currentView === 'projects'} onClick={() => navigate('projects')} />
                     <NavButton icon="play" label="Stories" active={currentView === 'stories'} onClick={() => navigate('stories')} />
                 </div>

                 <div className="mt-auto w-full px-4 relative flex flex-col gap-4">
                     {/* Balance Section */}
                     <div className="relative rounded-2xl p-[1px] overflow-hidden">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_70%,#eab308_100%)] animate-[spin_4s_linear_infinite]" />
                         <div className="relative bg-zinc-900 rounded-[15px] p-6 flex flex-col items-start justify-center h-full w-full">
                             <div className="text-3xl font-black text-white mb-1">
                                 {credits !== null ? Math.round(credits) : '0'}
                             </div>
                             <button 
                                onClick={() => navigate('billing')}
                                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-yellow-500 transition-colors flex items-center gap-1"
                             >
                                Add more <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </button>
                         </div>
                     </div>

                     {isProfileOpen && (
                        <div className="absolute bottom-[60px] left-4 right-4 bg-black border border-white/10 rounded-xl shadow-xl p-1 animate-fade-in z-[60]">
                            <button 
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Log Out
                            </button>
                        </div>
                     )}
                     
                     <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`w-full flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-xl transition-colors text-left border border-transparent hover:border-white/5 ${isProfileOpen ? 'bg-zinc-900 border-white/10' : ''}`}
                     >
                         {avatarUrl && !imageError ? (
                             <img 
                                src={avatarUrl} 
                                alt={displayName} 
                                className="w-9 h-9 rounded-full object-cover bg-black shrink-0" 
                                onError={() => setImageError(true)}
                             />
                         ) : (
                             <div className="w-9 h-9 rounded-full bg-yellow-600 text-black flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                 {initial}
                             </div>
                         )}
                         <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-white truncate">{displayName}</p>
                         </div>
                         <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </button>
                 </div>
            </aside>
        </>
    );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${active ? 'bg-yellow-900/20 text-yellow-600' : 'text-zinc-400 hover:bg-zinc-900'}`}
    >
        <span className="text-xl md:text-lg">{icon === 'folder' ? '📂' : icon === 'play' ? '🎬' : icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </button>
);
