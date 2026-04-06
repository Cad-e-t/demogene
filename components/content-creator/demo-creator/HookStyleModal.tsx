import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { API_URL } from '../api';
import { EFFECT_TYPES } from '../ContentVideoPlayer';

interface HookStyleModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStyle: any;
    onUpdateStyle: (newStyle: any) => Promise<void>;
    userId: string;
}

export const HookStyleModal: React.FC<HookStyleModalProps> = ({ isOpen, onClose, currentStyle, onUpdateStyle, userId }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [showAnimationScreen, setShowAnimationScreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Delete old asset if it exists
            if (currentStyle?.style === 'media' && currentStyle?.media) {
                await fetch(`${API_URL}/demo/delete-hook-asset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: currentStyle.media })
                });
            }

            // 2. Get signed URL
            const res = await fetch(`${API_URL}/demo/generate-hook-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type })
            });
            const { uploadUrl, publicUrl } = await res.json();

            // 3. Upload to R2
            await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            // 4. Update style
            await onUpdateStyle({ style: 'media', media: publicUrl, animation: 'none' });
            
            // 5. Show animation screen if it's an image
            if (file.type.startsWith('image/')) {
                setShowAnimationScreen(true);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload media.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectBackground = async (style: string) => {
        // Delete old asset if it exists
        if (currentStyle?.style === 'media' && currentStyle?.media) {
            try {
                await fetch(`${API_URL}/demo/delete-hook-asset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: currentStyle.media })
                });
            } catch (e) {
                console.error("Failed to delete old asset", e);
            }
        }
        await onUpdateStyle({ style });
        setShowAnimationScreen(false);
    };

    const handleSelectAnimation = async (animationId: string) => {
        await onUpdateStyle({ ...currentStyle, animation: animationId });
    };

    const isImageMedia = currentStyle?.style === 'media' && currentStyle?.media && !currentStyle.media.match(/\.(mp4|webm|mov)$/i);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                >
                    {/* Left: Preview */}
                    <div className="w-full md:w-1/2 bg-black p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 w-full text-left">Live Preview</h3>
                        <div className="aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5 flex items-center justify-center">
                            {currentStyle?.style === 'white' && <div className="absolute inset-0 bg-white" />}
                            {currentStyle?.style === 'black' && <div className="absolute inset-0 bg-black" />}
                            {(currentStyle?.style === 'blur' || currentStyle?.style === 'blurred') && (
                                <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                                    <span className="text-zinc-500 font-bold">Blurred Video Background</span>
                                </div>
                            )}
                            {currentStyle?.style === 'media' && currentStyle?.media && (
                                currentStyle.media.match(/\.(mp4|webm|mov)$/i) ? (
                                    <video src={currentStyle.media} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                                ) : (
                                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                                        <motion.img 
                                            src={currentStyle.media} 
                                            className="w-full h-full object-cover" 
                                            alt="Hook Background"
                                            animate={
                                                currentStyle.animation === 'zoom_in' ? { scale: [1, 1.1] } :
                                                currentStyle.animation === 'zoom_out' ? { scale: [1.1, 1] } :
                                                currentStyle.animation === 'slide_left' ? { x: ['0%', '-5%'] } :
                                                currentStyle.animation === 'slide_right' ? { x: ['-5%', '0%'] } :
                                                currentStyle.animation === 'slide_up' ? { y: ['0%', '-5%'] } :
                                                currentStyle.animation === 'slide_down' ? { y: ['-5%', '0%'] } :
                                                currentStyle.animation === 'slide_up_left' ? { x: ['0%', '-5%'], y: ['0%', '-5%'] } :
                                                currentStyle.animation === 'slide_up_right' ? { x: ['-5%', '0%'], y: ['0%', '-5%'] } :
                                                currentStyle.animation === 'slide_down_left' ? { x: ['0%', '-5%'], y: ['-5%', '0%'] } :
                                                currentStyle.animation === 'slide_down_right' ? { x: ['-5%', '0%'], y: ['-5%', '0%'] } :
                                                currentStyle.animation === 'slow_zoom_in' ? { scale: [1, 1.05] } :
                                                currentStyle.animation === 'handheld_walk' ? { y: [0, -5, 0, 5, 0], x: [0, 2, 0, -2, 0] } :
                                                { scale: 1, x: 0, y: 0 }
                                            }
                                            transition={{
                                                duration: currentStyle.animation === 'slow_zoom_in' ? 10 : 3,
                                                repeat: Infinity,
                                                repeatType: "reverse",
                                                ease: "easeInOut"
                                            }}
                                        />
                                    </div>
                                )
                            )}
                            <div className="relative z-10 text-center p-4">
                                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Hook Text Here</h1>
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col gap-6 relative h-[500px] overflow-y-auto">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence mode="wait">
                            {showAnimationScreen && isImageMedia ? (
                                <motion.div 
                                    key="animation-screen"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col gap-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setShowAnimationScreen(false)}
                                            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <h2 className="text-2xl font-bold text-white">Image Animation</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {EFFECT_TYPES.map((effect) => {
                                            const isSelected = currentStyle?.animation === effect.id || (!currentStyle?.animation && effect.id === 'none');
                                            return (
                                                <button
                                                    key={effect.id}
                                                    onClick={() => handleSelectAnimation(effect.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800 border-white/5 hover:border-white/20'}`}
                                                >
                                                    <div className={`font-bold mb-1 ${isSelected ? 'text-yellow-500' : 'text-white'}`}>{effect.name}</div>
                                                    <div className="text-xs text-zinc-400">{effect.description}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="main-screen"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col gap-6"
                                >
                                    <h2 className="text-2xl font-bold text-white">Hook Style</h2>

                                    {/* Upload */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Custom Media</h3>
                                        <input 
                                            type="file" 
                                            accept="image/*,video/*" 
                                            className="hidden" 
                                            ref={fileInputRef}
                                            onChange={handleUpload}
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-full py-4 rounded-xl border border-dashed border-white/20 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                            <span className="font-bold">{isUploading ? 'Uploading...' : 'Upload Image or Video'}</span>
                                        </button>
                                        
                                        {isImageMedia && (
                                            <button 
                                                onClick={() => setShowAnimationScreen(true)}
                                                className="w-full py-2 mt-2 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors text-sm"
                                            >
                                                Configure Image Animation
                                            </button>
                                        )}
                                    </div>

                                    {/* Select Background */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Solid Backgrounds</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['white', 'black', 'blur'].map((style) => {
                                                const isSelected = currentStyle?.style === style || (style === 'blur' && currentStyle?.style === 'blurred');
                                                return (
                                                    <button
                                                        key={style}
                                                        onClick={() => handleSelectBackground(style)}
                                                        disabled={isUploading}
                                                        className={`py-3 rounded-xl border font-bold capitalize transition-all ${isSelected ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        {style}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
