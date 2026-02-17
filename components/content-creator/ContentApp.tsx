
import React, { useState, useEffect } from 'react';
import { ContentLanding } from './ContentLanding';
import { ContentDashboard } from './ContentDashboard';
import { ContentProjects } from './ContentProjects';
import { ContentStories } from './ContentStories';
import { ContentSidebar } from './ContentSidebar';
import { BillingDashboard } from './BillingDashboard';
import { CreatorPricingView } from './CreatorPricingView';
import { supabase } from '../../supabaseClient';
import { ContentProject, ContentSegment } from './types';
import { CreatorPricingCards } from './CreatorPricingCards';
import { createCheckoutSession } from '../../frontend-api';

export const ContentApp = ({ session: parentSession, onNavigate }: { session: any, onNavigate: (p: string) => void }) => {
    const [session, setSession] = useState<any>(parentSession || null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    
    // URL-Based Navigation Helper (Path based)
    const getPathView = () => {
        const path = window.location.pathname;
        if (path.includes('/projects')) return 'projects';
        if (path.includes('/stories')) return 'stories';
        if (path.includes('/billing')) return 'billing';
        if (path.includes('/creator-pricing')) return 'creator-pricing';
        return 'dashboard';
    };

    const [view, setView] = useState<'landing' | 'dashboard' | 'projects' | 'stories' | 'billing' | 'creator-pricing'>('landing');
    const [activeProjectData, setActiveProjectData] = useState<{project: ContentProject, segments: ContentSegment[]} | null>(null);

    // Sync session from parent prop or fetch if missing
    useEffect(() => {
        if (parentSession) {
            setSession(parentSession);
            setView(getPathView());
        } else {
            (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
                setSession(session);
                if (session) {
                    setView(getPathView());
                }
            });
        }
    }, [parentSession]);

    // Fetch credits and subscribe to changes - USING 'profiles' TABLE
    useEffect(() => {
        if (session?.user?.id) {
            const fetchCredits = async () => {
                const { data } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
                setCredits(data?.credits || 0);
            };
            fetchCredits();

            const channel = supabase.channel('global-creator-credits')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'profiles',
                    filter: `id=eq.${session.user.id}`
                }, (payload: any) => {
                    if (payload.new) setCredits(payload.new.credits);
                })
                .subscribe();
            
            return () => { supabase.removeChannel(channel); };
        }
    }, [session]);

    // Listen to pushstate/popstate changes for navigation history support
    useEffect(() => {
        const handlePathChange = () => {
            if (session) {
                setView(getPathView());
            }
        };
        window.addEventListener('pushstate', handlePathChange);
        window.addEventListener('popstate', handlePathChange);
        return () => {
            window.removeEventListener('pushstate', handlePathChange);
            window.removeEventListener('popstate', handlePathChange);
        };
    }, [session]);

    // Fix: Clear active project when navigating away from dashboard to prevent editor from reopening
    useEffect(() => {
        if (view !== 'dashboard') {
            setActiveProjectData(null);
        }
    }, [view]);

    const handleLogin = async () => {
        try {
            console.log("Initiating login redirect...");
            // Store intended destination before redirecting
            localStorage.setItem('productcam_redirect', '/content-creator');
            
            const { error } = await (supabase.auth as any).signInWithOAuth({ 
                provider: 'google',
                options: {
                    // Use explicit redirect to root, App.tsx will handle routing to content-creator
                    redirectTo: 'https://creator.productcam.site'
                }
            });
            if (error) throw error;
        } catch (e) {
            console.error("Login failed:", e);
            alert("Login failed. Please try again.");
        }
    };

    const handleLogout = async () => {
        await (supabase.auth as any).signOut();
        window.location.href = 'https://creator.productcam.site';
    };
    
    const handleOpenProject = (project: ContentProject, segments: ContentSegment[]) => {
        console.log(`[ContentApp] Opening project ${project.id} with ${segments.length} segments`);
        setActiveProjectData({ project, segments });
        // Manually set view to dashboard via navigate
        onNavigate('/content-creator/dashboard');
    };

    const handleClearActiveProject = () => {
        setActiveProjectData(null);
    };

    const handlePurchase = async (productId: string) => {
        try {
            const { checkout_url } = await createCheckoutSession(productId);
            window.location.href = checkout_url;
        } catch (e) {
            console.error(e);
            alert("Failed to initiate checkout");
        }
    };

    if (!session) {
        return <ContentLanding onLogin={handleLogin} />;
    }

    const showGlobalOverlay = credits !== null && credits <= 0;

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
            <ContentSidebar 
                currentView={view} 
                setView={() => {}} 
                onNavigate={onNavigate} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                session={session}
            />
            <main className="flex-1 flex flex-col relative h-full overflow-hidden md:pt-0">
                {view === 'dashboard' && (
                    <ContentDashboard 
                        session={session} 
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                        initialProjectData={activeProjectData}
                        onClearProject={handleClearActiveProject}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                )}
                {view === 'projects' && (
                    <ContentProjects 
                        session={session} 
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                        onOpenProject={handleOpenProject}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                )}
                {view === 'stories' && (
                    <ContentStories 
                        session={session}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                )}
                {view === 'billing' && (
                    <BillingDashboard 
                        session={session}
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                )}
                {view === 'creator-pricing' && (
                    <CreatorPricingView 
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                    />
                )}
            </main>

            {/* Global Pricing Overlay Gatekeeper */}
            {showGlobalOverlay && (
                <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm overflow-y-auto animate-fade-in">
                    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
                        <div className="w-full max-w-6xl flex flex-col items-center bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[3rem] p-8 md:p-12 my-8 relative">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
                                    Unlock Creator Studio
                                </h2>
                                <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
                                    You need credits to continue creating. Purchase a pack to unlock the studio instantly.
                                </p>
                            </div>
                            
                            <CreatorPricingCards 
                                onAction={handlePurchase} 
                                actionLabel="Buy Credits" 
                            />
                            
                            <button 
                                onClick={handleLogout}
                                className="mt-12 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
