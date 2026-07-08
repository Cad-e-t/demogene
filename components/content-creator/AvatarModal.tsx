import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, ArrowLeft, Trash2, Plus, Sparkles } from 'lucide-react';
import { API_URL } from './api';
import { supabase } from "../../supabaseClient";

interface AvatarModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSelectAvatar: (avatar: { id: string, url: string }) => void;
    onShowPricing?: () => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({ isOpen, onClose, userId, onSelectAvatar, onShowPricing }) => {
    const [avatars, setAvatars] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // Create state
    const [createMode, setCreateMode] = useState<'selection' | 'upload' | 'generate'>('selection');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [generatedAvatar, setGeneratedAvatar] = useState<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchAvatars();
            setIsCreating(false);
            setCreateMode('selection');
            setGeneratedAvatar(null);
            setPrompt('');
        }
    }, [isOpen, userId]);

    const fetchAvatars = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('avatar')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error("Failed to fetch avatars", error);
            } else {
                setAvatars(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch avatars", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, url: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${API_URL}/api/avatars/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, userId })
            });
            if (res.ok) {
                setAvatars(avatars.filter(a => a.id !== id));
            }
        } catch (e) {
            console.error("Failed to delete avatar", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        setIsUploading(true);
        try {
            // 1. Get upload URL
            const res = await fetch(`${API_URL}/api/avatars/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type
                })
            });

            if (!res.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, publicUrl } = await res.json();

            // 2. Upload file
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            // 3. Save to DB
            const saveRes = await fetch(`${API_URL}/api/avatars/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, url: publicUrl })
            });

            if (saveRes.ok) {
                const { avatar } = await saveRes.json();
                setAvatars([avatar, ...avatars]);
                setIsCreating(false);
            }
        } catch (e) {
            console.error("Upload failed", e);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !userId) return;

        setIsGenerating(true);
        try {
            const res = await fetch(`${API_URL}/api/avatars/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, prompt, aspectRatio: '9:16' })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to generate");
            }
            
            const { avatar } = await res.json();
            setGeneratedAvatar(avatar);
            // Also add to gallery in background
            setAvatars(prev => [avatar, ...prev]);
        } catch (e: any) {
            console.error("Generation failed", e);
            if (e.message && e.message.toLowerCase().includes("insufficient credits")) {
                if (onShowPricing) {
                    onShowPricing();
                    onClose();
                } else {
                    alert(e.message);
                }
            } else {
                alert(e.message || "Failed to generate image.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            {isCreating && (
                                <button 
                                    onClick={() => {
                                        if (createMode === 'selection' || generatedAvatar) {
                                            setIsCreating(false);
                                            setGeneratedAvatar(null);
                                        } else {
                                            setCreateMode('selection');
                                        }
                                    }}
                                    className="p-2 -ml-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <h2 className="text-xl font-semibold text-white tracking-tight">
                                {isCreating ? 'Create Character' : 'Add a custom character to star in your video'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {!isCreating && (
                                <button 
                                    onClick={() => {
                                        setIsCreating(true);
                                        setCreateMode('selection');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Create New
                                </button>
                            )}
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!isCreating ? (
                            // Gallery View
                            isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                                </div>
                            ) : avatars.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {avatars.map(avatar => (
                                        <div 
                                            key={avatar.id} 
                                            onClick={() => onSelectAvatar(avatar)}
                                            className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-zinc-800 cursor-pointer border border-white/5 hover:border-white/30 transition-colors"
                                        >
                                            <img src={avatar.url} alt="Avatar" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium">Select</span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(e, avatar.id, avatar.url)}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-300 hover:text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-all z-10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                        <Sparkles className="w-8 h-8 text-zinc-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">You don't have any custom character yet</h3>
                                    <p className="text-zinc-400 text-sm max-w-xs">
                                        Create a character to cast them consistently in your videos.
                                    </p>
                                </div>
                            )
                        ) : (
                            // Creation View
                            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto w-full">
                                {createMode === 'selection' && !generatedAvatar && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-white font-medium">Upload an Image</span>
                                        </button>
                                        <button
                                            onClick={() => setCreateMode('generate')}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Sparkles className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-white font-medium">Generate with AI</span>
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            accept="image/*" 
                                            className="hidden" 
                                        />
                                        {isUploading && (
                                            <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                                                <Loader2 className="w-10 h-10 animate-spin text-white mb-4" />
                                                <p className="text-white font-medium">Uploading...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(createMode === 'generate' || generatedAvatar) && (
                                    <div className="w-full flex flex-col items-center">
                                        {generatedAvatar ? (
                                            <div className="mb-8 relative rounded-xl overflow-hidden shadow-xl border border-white/10 max-w-sm w-full aspect-[9/16]">
                                                <img src={generatedAvatar.url} alt="Generated Avatar" className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <button 
                                                        onClick={() => onSelectAvatar(generatedAvatar)}
                                                        className="px-3 py-1.5 bg-white text-black font-medium rounded-lg text-sm shadow-lg hover:bg-zinc-200 transition-colors"
                                                    >
                                                        Use Character
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full text-center mb-8">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 mx-auto">
                                                    <Sparkles className="w-8 h-8 text-zinc-400" />
                                                </div>
                                                <h3 className="text-xl font-medium text-white mb-2">Describe your character</h3>
                                                <p className="text-zinc-400 text-sm">
                                                    Be specific about their physical appearance, clothing, and style. (Costs 4 credits)
                                                </p>
                                            </div>
                                        )}

                                        <div className="w-full relative">
                                            <textarea 
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="A cinematic portrait of a young woman with short pink hair wearing a leather jacket..."
                                                className="w-full bg-[#2C2C2E] text-white rounded-xl p-4 pr-32 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-white/20 border border-white/5"
                                            />
                                            <button 
                                                onClick={handleGenerate}
                                                disabled={!prompt.trim() || isGenerating}
                                                className="absolute bottom-4 right-4 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                            >
                                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                {generatedAvatar ? 'Regenerate' : 'Generate'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
