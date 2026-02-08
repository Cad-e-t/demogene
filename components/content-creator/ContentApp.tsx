
import React, { useState, useEffect } from 'react';
import { ContentLanding } from './ContentLanding';
import { ContentDashboard } from './ContentDashboard';
import { ContentProjects } from './ContentProjects';
import { ContentStories } from './ContentStories';
import { ContentSidebar } from './ContentSidebar';
import { supabase } from '../../supabaseClient';
import { ContentProject, ContentSegment } from './types';

export const ContentApp = ({ session: parentSession, onNavigate }: { session: any, onNavigate: (p: string) => void }) => {
    const [session, setSession] = useState<any>(parentSession || null);
    
    // URL-Based Navigation Helper (Path based)
    const getPathView = () => {
        const path = window.location.pathname;
        if (path.includes('/projects')) return 'projects';
        if (path.includes('/stories')) return 'stories';
        return 'dashboard';
    };

    const [view, setView] = useState<'landing' | 'dashboard' | 'projects' | 'stories'>('landing');
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

    const handleLogin = async () => {
        // Store intended destination before redirecting
        localStorage.setItem('productcam_redirect', '/content-creator');
        
        await (supabase.auth as any).signInWithOAuth({ 
            provider: 'google',
            options: {
                // Use origin to keep URL clean for hash extraction
                redirectTo: window.location.origin
            }
        });
    };
    
    const handleOpenProject = (project: ContentProject, segments: ContentSegment[]) => {
        console.log(`[ContentApp] Opening project ${project.id} with ${segments.length} segments`);
        setActiveProjectData({ project, segments });
        // Manually set view to dashboard via navigate
        onNavigate('/content-creator/dashboard');
    };

    if (!session) {
        return <ContentLanding onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            <ContentSidebar currentView={view} setView={() => {}} onNavigate={onNavigate} />
            <main className="flex-1 flex flex-col relative h-full overflow-hidden">
                {view === 'dashboard' && (
                    <ContentDashboard 
                        session={session} 
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                        initialProjectData={activeProjectData}
                    />
                )}
                {view === 'projects' && (
                    <ContentProjects 
                        session={session} 
                        onViewChange={(v: string) => onNavigate(`/content-creator/${v}`)}
                        onOpenProject={handleOpenProject}
                    />
                )}
                {view === 'stories' && <ContentStories session={session} />}
            </main>
        </div>
    );
};