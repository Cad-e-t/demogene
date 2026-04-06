import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { deleteProject } from './api';

export const ContentProjects = ({ session, onViewChange, onOpenProject, onToggleSidebar }: any) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            console.log("[ContentProjects] Fetching projects...");
            // Fetch content_projects
            const { data: contentData } = await supabase
                .from('content_projects')
                .select('*, content_segments(image_url)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            
            // Format content_projects
            const formattedContent = (contentData || []).map((p: any) => {
                const firstValidSegment = p.content_segments?.find((s: any) => s.image_url);
                return {
                    ...p,
                    type: 'faceless',
                    previewUrl: firstValidSegment ? firstValidSegment.image_url : null
                };
            });

            // Fetch demo_projects
            const { data: demoData } = await supabase
                .from('demo_projects')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            const formattedDemo = (demoData || []).map((p: any) => {
                return {
                    ...p,
                    type: 'demo',
                    previewUrl: null // We could extract a frame later, but for now null
                };
            });

            // Combine and sort
            const combined = [...formattedContent, ...formattedDemo].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setProjects(combined);
        };
        fetch();
    }, [session]);

    const handleProjectClick = async (project: any) => {
        console.log(`[ContentProjects] Loading project: ${project.id}`);
        
        if (project.type === 'demo') {
            // Use onViewChange to navigate to demo-editor, but we need to pass the ID.
            // Wait, ContentApp handles routing. We can just use window.location or a callback.
            // Let's use a custom event or update ContentApp to handle it.
            // Actually, ContentApp passes onViewChange which calls onNavigate.
            // We can append the ID to the URL or use local storage.
            // Better: update ContentApp to accept a project ID for demo-editor.
            // For now, let's just trigger a custom event that ContentApp can listen to.
            const event = new CustomEvent('open-demo-project', { detail: { projectId: project.id } });
            window.dispatchEvent(event);
            return;
        }

        // Fetch segments ordered for faceless projects
        const { data: segments, error } = await supabase.from('content_segments').select('*').eq('project_id', project.id).order('order_index');
        
        if (error) {
            console.error("[ContentProjects] Failed to load segments", error);
            setError("Failed to load project. Please try again.");
            setTimeout(() => setError(null), 5000);
            return;
        }

        if (onOpenProject) {
            onOpenProject(project, segments || []);
        } else {
            console.warn("[ContentProjects] onOpenProject not provided");
        }
    };

    const handleDelete = async (projectId: string) => {
        setConfirmDeleteId(null);
        setDeletingId(projectId);
        try {
            // Optimistic UI update
            setProjects(prev => prev.filter(p => p.id !== projectId));
            await deleteProject(projectId, session.user.id);
        } catch (err) {
            console.error(err);
            setError("Failed to delete project");
            setTimeout(() => setError(null), 5000);
            // Refresh list on failure
            const { data } = await supabase.from('content_projects').select('*, content_segments(image_url)').eq('user_id', session.user.id).order('created_at', { ascending: false });
            const formatted = (data || []).map((p: any) => {
                const firstValidSegment = p.content_segments?.find((s: any) => s.image_url);
                return { ...p, previewUrl: firstValidSegment ? firstValidSegment.image_url : null };
            });
            setProjects(formatted);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black">
            
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-black z-20 py-2">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Projects</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Desktop Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="hidden md:block text-3xl font-black text-white">Projects</h2>
                {error && (
                    <div className="text-xs font-bold text-red-600 bg-red-900/20 px-4 py-2 rounded-xl border border-red-900/30 animate-shake">
                        {error}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Delete Project?</h3>
                        <p className="text-zinc-400 text-sm mb-8 font-medium">This will permanently remove all generated segments and assets. This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-3 text-sm font-bold text-zinc-400 hover:bg-black rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleDelete(confirmDeleteId)}
                                className="flex-1 py-3 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div 
                        key={p.id} 
                        onClick={() => handleProjectClick(p)}
                        className="bg-zinc-900 rounded-3xl border border-white/5 shadow-sm hover:shadow-lg transition text-left group cursor-pointer relative overflow-hidden flex flex-col"
                    >
                        {/* Preview Area */}
                        <div className="w-full aspect-video bg-zinc-900 relative overflow-hidden">
                            {p.previewUrl ? (
                                <img src={p.previewUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Project Preview" />
                            ) : p.status === 'draft' ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black">
                                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-white/20 px-4 py-2 rounded-xl">Draft</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black">
                                    <div className="w-8 h-8 border-4 border-yellow-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                </div>
                            )}
                            
                            {/* Overlay Gradient for Title Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                        </div>

                        <div className="p-5 relative">
                            <h3 className="font-bold text-lg mb-1 truncate text-white group-hover:text-yellow-600 transition-colors pr-8">{p.title}</h3>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(p.id);
                            }}
                            disabled={deletingId === p.id}
                            className="absolute bottom-4 right-4 p-2 text-zinc-600 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10 disabled:opacity-50"
                            title="Delete Project"
                        >
                            {deletingId === p.id ? (
                                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};