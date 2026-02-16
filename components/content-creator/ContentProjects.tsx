import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteProject } from './api';

export const ContentProjects = ({ session, onViewChange, onOpenProject, onToggleSidebar }: any) => {
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            console.log("[ContentProjects] Fetching projects...");
            // Join segments to get preview image
            const { data } = await supabase
                .from('content_projects')
                .select('*, content_segments(image_url)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            
            // Format data to attach previewUrl from first valid segment
            const formatted = (data || []).map((p: any) => {
                const firstValidSegment = p.content_segments?.find((s: any) => s.image_url);
                return {
                    ...p,
                    previewUrl: firstValidSegment ? firstValidSegment.image_url : null
                };
            });
            setProjects(formatted);
        };
        fetch();
    }, [session]);

    const handleProjectClick = async (project: any) => {
        console.log(`[ContentProjects] Loading project: ${project.id}`);
        // Fetch segments ordered
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
                // Re-fetch logic simplified for error handling
                const { data } = await supabase.from('content_projects').select('*, content_segments(image_url)').eq('user_id', session.user.id).order('created_at', { ascending: false });
                const formatted = (data || []).map((p: any) => {
                    const firstValidSegment = p.content_segments?.find((s: any) => s.image_url);
                    return { ...p, previewUrl: firstValidSegment ? firstValidSegment.image_url : null };
                });
                setProjects(formatted);
            }
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-slate-50 z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Projects</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <h2 className="hidden md:block text-3xl font-black mb-8 text-slate-900">Projects</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div 
                        key={p.id} 
                        onClick={() => handleProjectClick(p)}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition text-left group cursor-pointer relative overflow-hidden flex flex-col"
                    >
                        {/* Preview Area */}
                        <div className="w-full aspect-video bg-slate-100 relative overflow-hidden">
                            {p.status === 'draft' ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-slate-300 px-4 py-2 rounded-xl">Draft</span>
                                </div>
                            ) : p.previewUrl ? (
                                <img src={p.previewUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Project Preview" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                                </div>
                            )}
                            
                            {/* Overlay Gradient for Title Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                        </div>

                        <div className="p-5 relative">
                            <h3 className="font-bold text-lg mb-1 truncate text-slate-900 group-hover:text-blue-600 transition-colors pr-8">{p.title}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <button 
                            onClick={(e) => handleDelete(e, p.id)}
                            className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"
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