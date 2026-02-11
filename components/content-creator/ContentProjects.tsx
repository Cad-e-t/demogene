import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteProject } from './api';

export const ContentProjects = ({ session, onViewChange, onOpenProject, onToggleSidebar }: any) => {
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            console.log("[ContentProjects] Fetching projects...");
            const { data } = await supabase.from('content_projects').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
            setProjects(data || []);
        };
        fetch();
    }, [session]);

    const handleProjectClick = async (project: any) => {
        console.log(`[ContentProjects] Loading project: ${project.id}`);
        // Fetch segments
        const { data: segments, error } = await supabase.from('content_segments').select('*').eq('project_id', project.id).order('order_index');
        
        if (error) {
            console.error("[ContentProjects] Failed to load segments", error);
            alert("Failed to load project");
            return;
        }

        if (onOpenProject) {
            onOpenProject(project, segments || []);
        } else {
            console.warn("[ContentProjects] onOpenProject not provided");
        }
    };

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this project? This will also remove all generated segments.")) {
            try {
                // Optimistic UI update
                setProjects(prev => prev.filter(p => p.id !== projectId));
                await deleteProject(projectId, session.user.id);
            } catch (err) {
                console.error(err);
                alert("Failed to delete project");
                // Refresh list on failure
                const { data } = await supabase.from('content_projects').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
                setProjects(data || []);
            }
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-gray-50 z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Projects</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <h2 className="hidden md:block text-3xl font-black mb-8">Projects</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div 
                        key={p.id} 
                        onClick={() => handleProjectClick(p)}
                        className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition text-left group cursor-pointer relative"
                    >
                        <h3 className="font-bold text-lg mb-2 truncate group-hover:text-indigo-600 transition-colors pr-8">{p.title}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{new Date(p.created_at).toLocaleDateString()}</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.status}
                        </span>
                        
                        <button 
                            onClick={(e) => handleDelete(e, p.id)}
                            className="absolute bottom-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Project"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};