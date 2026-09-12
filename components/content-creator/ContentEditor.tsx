import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSegments, editImageSegment, saveSegments, regenerateImageSegment, generateAssets, exportVideo, generateUploadUrl, updateSegmentImage, updateSegmentAvatar, generateVideoSegment, animateAllSegments, generateDescription, retryProject, sanitizeErrorMsg } from './api';
import { ContentVideoPlayer, EFFECT_TYPES, EFFECT_SEQUENCES } from './ContentVideoPlayer';
import { AvatarModal } from './AvatarModal';
import { supabase } from '../../supabaseClient';
import { VOICES } from '../../constants';
import { VOICE_SAMPLES } from '../../voiceSamples';
import { EFFECT_PRESETS, LONG_FORM_PRESETS, VOICE_STYLES, VOICE_PACES, VOICE_ACCENTS, VoiceStyleConfig, SUBTITLE_PRESETS, SubtitleConfiguration, DEFAULT_SUBTITLE_CONFIG } from './types';
import { STYLE_PREVIEWS } from './creator-assets';
import { SubtitleConfigurationPanel } from './SubtitleConfigurationPanel';
import { CreatorPricingCards } from './CreatorPricingCards';
import { createCheckoutSession } from '../../frontend-api';
import { motion, AnimatePresence } from 'motion/react';

export const EffectPreview = ({ effectType, imageUrl, aspectRatio }: { effectType: string, imageUrl: string, aspectRatio: '9:16' | '16:9' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [media, setMedia] = useState<HTMLImageElement | HTMLVideoElement | null>(null);

    useEffect(() => {
        const isVideo = imageUrl.toLowerCase().endsWith('.mp4');
        if (isVideo) {
            const video = document.createElement('video');
            video.preload = "auto";
            video.muted = true;
            video.playsInline = true;
            video.src = imageUrl;
            video.onloadeddata = () => setMedia(video);
            video.load();
        } else {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => setMedia(img);
        }
    }, [imageUrl]);

    useEffect(() => {
        if (!media || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const startTime = performance.now();
        const duration = 3000;

        const render = (now: number) => {
            const elapsed = (now - startTime) % duration;
            const progress = elapsed / duration;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const w = canvas.width;
            const h = canvas.height;
            const iw = media instanceof HTMLVideoElement ? media.videoWidth : media.width;
            const ih = media instanceof HTMLVideoElement ? media.videoHeight : media.height;
            
            // Avoid division by zero if media properties haven't fully populated
            if (iw === 0 || ih === 0) {
                frameId = requestAnimationFrame(render);
                return;
            }

            const baseScale = Math.max(w / iw, h / ih);

            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;

            const iw_visible = w / baseScale;
            const ih_visible = h / baseScale;

            switch (effectType) {
                case 'zoom_in':
                    scale = 1.0 + (progress * 0.5);
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'zoom_out':
                    scale = 1.8 - (progress * 0.5);
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'slow_zoom_in':
                    scale = 1.0 + (progress * 0.15);
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'slide_left':
                    scale = 1.15;
                    offsetX = (1 - progress) * (iw - iw_visible / scale);
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'slide_right':
                    scale = 1.15;
                    offsetX = progress * (iw - iw_visible / scale);
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'slide_up':
                    scale = 1.2;
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (1 - progress) * (ih - ih_visible / scale);
                    break;
                case 'slide_down':
                    scale = 1.2;
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = progress * (ih - ih_visible / scale);
                    break;
                case 'slide_up_left':
                    scale = 1.2;
                    offsetX = (1 - progress) * (iw - iw_visible / scale);
                    offsetY = (1 - progress) * (ih - ih_visible / scale);
                    break;
                case 'slide_up_right':
                    scale = 1.2;
                    offsetX = progress * (iw - iw_visible / scale);
                    offsetY = (1 - progress) * (ih - ih_visible / scale);
                    break;
                case 'slide_down_left':
                    scale = 1.2;
                    offsetX = (1 - progress) * (iw - iw_visible / scale);
                    offsetY = progress * (ih - ih_visible / scale);
                    break;
                case 'slide_down_right':
                    scale = 1.2;
                    offsetX = progress * (iw - iw_visible / scale);
                    offsetY = progress * (ih - ih_visible / scale);
                    break;
                case 'cinematic_drift':
                    scale = 1.1;
                    offsetX = progress * (iw - iw_visible / scale);
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'doc_push':
                    scale = 1.0 + (progress * 0.1);
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                case 'organic_float':
                    scale = 1.05 + (0.03 * Math.sin(progress * Math.PI * 2));
                    const floatX = (iw_visible / scale / 60) * Math.sin(progress * Math.PI);
                    const floatY = (ih_visible / scale / 80) * Math.cos(progress * Math.PI);
                    offsetX = (iw - iw_visible / scale) / 2 + floatX;
                    offsetY = (ih - ih_visible / scale) / 2 + floatY;
                    break;
                case 'dolly_reveal':
                    scale = 1.15 - (progress * 0.15);
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
            }

            const dw = iw * baseScale * scale;
            const dh = ih * baseScale * scale;
            const dx = -offsetX * baseScale * scale;
            const dy = -offsetY * baseScale * scale;

            ctx.drawImage(media, dx, dy, dw, dh);
            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [media, effectType]);

    return (
        <canvas 
            ref={canvasRef} 
            width={aspectRatio === '9:16' ? 180 : 320} 
            height={aspectRatio === '9:16' ? 320 : 180}
            className="w-full h-full object-cover rounded-lg"
        />
    );
};

export const ContentEditor = ({ session, project, initialSegments, onBack, onComplete, dodoCustomerId, onViewChange, isNewCreation, credits: propCredits }: any) => {
    const [segments, setSegments] = useState(initialSegments);
    useEffect(() => {
        // Only set initial segments when the project changes to prevent 
        // stale activeProjectData from reverting real-time updates
        setSegments(initialSegments);
    }, [project.id]);
    const [localProject, setLocalProject] = useState(project); // Local project copy for status sync
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [animatingSegmentId, setAnimatingSegmentId] = useState<string | null>(null);
    const [animationPrompt, setAnimationPrompt] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAnimatingAll, setIsAnimatingAll] = useState(false);
    const [confirmAnimateAll, setConfirmAnimateAll] = useState({ show: false, cost: 0, count: 0, model: 'fast' as 'fast' | 'ultra' });
    const [imageEditModalId, setImageEditModalId] = useState<string | null>(null);
    const [imageEditTab, setImageEditTab] = useState<'regenerate' | 'edit' | 'upload'>('regenerate');
    
    const [projectCharacters, setProjectCharacters] = useState<any[]>([]);
    const [lightboxChar, setLightboxChar] = useState<{ imageUrl: string | null; name: string; outfit?: string; desc?: string } | null>(null);

    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarConfirmDeleteId, setAvatarConfirmDeleteId] = useState<string | null>(null);

    const [regeneratePrompt, setRegeneratePrompt] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [loadingImage, setLoadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showAudioConfirmation, setShowAudioConfirmation] = useState(false);

    const [uploadConfirmSegmentId, setUploadConfirmSegmentId] = useState<string | null>(null);
    const [uploadingSegmentId, setUploadingSegmentId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New State for Real-time Preview
    const [audioUrl, setAudioUrl] = useState<string | null>(project.voice_file_path || null);
    const [transcription, setTranscription] = useState<any | null>(project.transcription || null);
    const [segmentDurations, setSegmentDurations] = useState<number[]>(project.segment_durations || []);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
    
    // Action Status States
    const [exportStatus, setExportStatus] = useState<'idle' | 'error'>('idle');
    const [regenerateStatus, setRegenerateStatus] = useState<'idle' | 'error'>('idle');
    const [editStatus, setEditStatus] = useState<'idle' | 'error'>('idle');
    const [saveDefaultStatus, setSaveDefaultStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showAnimateAllMenu, setShowAnimateAllMenu] = useState(false);
    const [showAnimateMenu, setShowAnimateMenu] = useState(false);

    const [generatingTextIndex, setGeneratingTextIndex] = useState(0);
    const thinkingTexts = ['Thinking...', 'Building the scenes...', 'Crafting the story...'];

    useEffect(() => {
        if (localProject.status === 'generating') {
            const interval = setInterval(() => {
                setGeneratingTextIndex((prev) => (prev + 1) % thinkingTexts.length);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [localProject.status]);
    const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showExportUpgradeModal, setShowExportUpgradeModal] = useState(false);
    const [lastStatus, setLastStatus] = useState<string | null>(project.status);
    const [lastRenderStatus, setLastRenderStatus] = useState<string | null>(project.render_status);

    // YouTube Metadata States
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [metadataTitle, setMetadataTitle] = useState('');
    const [metadataDescription, setMetadataDescription] = useState(project.description || '');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);
    const [copiedDescription, setCopiedDescription] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const [userCredits, setUserCredits] = useState<number | null>(
        typeof propCredits === 'number' ? propCredits : null
    );

    const fetchUserCredits = useCallback(async () => {
        const userId = session?.user?.id || project?.user_id;
        if (!userId) return;
        try {
            const { data } = await supabase.from('profiles').select('credits').eq('id', userId).single();
            if (data && data.credits !== undefined && data.credits !== null) {
                setUserCredits(data.credits);
            }
        } catch (e) {
            console.error("Error fetching user credits:", e);
        }
    }, [session?.user?.id, project?.user_id]);

    useEffect(() => {
        if (typeof propCredits === 'number') {
            setUserCredits(propCredits);
        }
    }, [propCredits]);

    useEffect(() => {
        fetchUserCredits();
        const userId = session?.user?.id || project?.user_id;
        if (!userId) return;

        const channel = supabase.channel(`editor-credits-${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload: any) => {
                if (payload.new && payload.new.credits !== undefined && payload.new.credits !== null) {
                    setUserCredits(payload.new.credits);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchUserCredits, session?.user?.id, project?.user_id]);

    const activePromptText = typeof project.prompt === 'object' 
        ? (project.prompt?.voiceover || project.prompt?.prompt || project.title || "Create video")
        : (typeof project.prompt === 'string' ? project.prompt : (project.title || "Create video"));
    const activePromptAspectRatio = project.aspect_ratio || (typeof project.prompt === 'object' && (project.prompt?.aspectRatio || project.prompt?.aspect_ratio));
    const activePromptStyle = project.image_style || (typeof project.prompt === 'object' && (project.prompt?.style || project.prompt?.imageStyle || project.prompt?.image_style));
    const activePromptAvatarUrl = typeof project.prompt === 'object' && (project.prompt?.avatarUrl || project.prompt?.avatar_url);

    const handleCopyPrompt = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    const handleRetryProject = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        try {
            const userId = session?.user?.id || project.user_id;
            setLocalProject((prev: any) => ({ ...prev, status: 'generating', render_status: 'generating' }));
            await retryProject(project.id, userId);
            setNotification({
                message: "Retry initiated. Generating missing scenes and assets...",
                type: "success"
            });
            setTimeout(() => setNotification(null), 5000);
        } catch (err: any) {
            console.error("Retry failed:", err);
            const msg = err?.message || "Failed to retry generation.";
            
            // Check project's latest status in DB
            const { data: latestProj } = await supabase.from('content_projects').select('status').eq('id', project.id).single();
            const isInsufficient = latestProj?.status === 'insufficient' || 
                                   msg.toLowerCase().includes('credit') || 
                                   msg.toLowerCase().includes('balance') || 
                                   msg.toLowerCase().includes('insufficient');
            const nextStatus = isInsufficient ? 'insufficient' : 'draft';

            setLocalProject((prev: any) => ({ ...prev, status: nextStatus, render_status: 'failed' }));
            await supabase.from('content_projects').update({ status: nextStatus, render_status: 'failed' }).eq('id', project.id);

            if (nextStatus === 'insufficient') {
                fetchUserCredits();
            } else {
                setNotification({
                    message: msg,
                    type: "error"
                });
                setTimeout(() => setNotification(null), 6000);
            }
        } finally {
            setIsRetrying(false);
        }
    };

    const handleAddCredits = async () => {
        setShowPricingModal(true);
        setLocalProject((prev: any) => ({ ...prev, status: 'draft' }));
        try {
            await supabase.from('content_projects').update({ status: 'draft' }).eq('id', project.id);
        } catch (err) {
            console.error("Failed to update status to draft:", err);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isGeneratingAssets || loadingImage || submitting || isGeneratingDescription) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isGeneratingAssets, loadingImage, submitting, isGeneratingDescription]);

    // Fetch latest project details on mount
    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await supabase.from('content_projects').select('*').eq('id', project.id).single();
            if (data) {
                setLocalProject(data);
                setAudioUrl(data.voice_file_path);
                setTranscription(data.transcription);
                setSegmentDurations(data.segment_durations || []);
                if (data.description) setMetadataDescription(data.description);
                if (data.subtitles) {
                    setSubtitles(data.subtitles as SubtitleConfiguration);
                }
            }
        };
        fetchProject();
    }, [project.id]);

    // Fetch project characters for segment character references
    useEffect(() => {
        if (!project?.id) return;
        const fetchCharacters = async () => {
            try {
                const { data, error } = await supabase
                    .from('content_characters')
                    .select('*')
                    .eq('project_id', project.id);
                if (!error && data) {
                    setProjectCharacters(data);
                }
            } catch (err) {
                console.error("Error fetching project characters:", err);
            }
        };
        fetchCharacters();
    }, [project?.id, imageEditModalId]);

    // Reset character lightbox when modal closes
    useEffect(() => {
        if (!imageEditModalId) {
            setLightboxChar(null);
        }
    }, [imageEditModalId]);

    const handleGenerateDescription = async () => {
        if (!metadataTitle.trim()) {
            setNotification({
                message: "Please enter a video title first.",
                type: 'error'
            });
            setTimeout(() => setNotification(null), 4000);
            return;
        }
        setIsGeneratingDescription(true);
        try {
            const res = await generateDescription(project.id, metadataTitle.trim(), session.user.id);
            if (res.description) {
                setMetadataDescription(res.description);
                setLocalProject((prev: any) => ({ ...prev, description: res.description, title: metadataTitle.trim() }));
                setNotification({
                    message: "YouTube description generated successfully!",
                    type: 'success'
                });
                setTimeout(() => setNotification(null), 4000);
            }
        } catch (e: any) {
            console.error("Generate description failed", e);
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue while generating the YouTube description. Please try again.");
            if (friendlyError.includes("Insufficient credits") || friendlyError.includes("credit")) {
                setShowPricingModal(true);
            } else {
                setNotification({
                    message: friendlyError,
                    type: 'error'
                });
                setTimeout(() => setNotification(null), 6000);
            }
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleSaveMetadata = async () => {
        setIsSavingMetadata(true);
        try {
            const { error } = await supabase
                .from('content_projects')
                .update({
                    title: metadataTitle.trim(),
                    description: metadataDescription
                })
                .eq('id', project.id);
            if (error) throw error;
            setLocalProject((prev: any) => ({ ...prev, title: metadataTitle.trim(), description: metadataDescription }));
            setNotification({
                message: "Metadata saved successfully!",
                type: 'success'
            });
            setTimeout(() => setNotification(null), 3000);
        } catch (e) {
            console.error("Failed to save metadata", e);
            setNotification({
                message: "Failed to save metadata",
                type: 'error'
            });
            setTimeout(() => setNotification(null), 4000);
        } finally {
            setIsSavingMetadata(false);
        }
    };

    const handleCopyDescription = () => {
        if (!metadataDescription) return;
        navigator.clipboard.writeText(metadataDescription);
        setCopiedDescription(true);
        setTimeout(() => setCopiedDescription(false), 2000);
    };

    // Trigger initial generation once on mount if navigated from a newly created project
    const hasTriggeredInitialGen = useRef(false);
    useEffect(() => {
        const triggerInitialGeneration = async () => {
            if ((isNewCreation || project?.isNewCreation) && !hasTriggeredInitialGen.current) {
                hasTriggeredInitialGen.current = true;
                try {
                    setLocalProject((prev: any) => ({ ...prev, status: 'generating' }));
                    const avatarUrl = project.prompt?.avatarUrl || null;
                    await generateSegments(project.id, session?.user?.id || project.user_id, avatarUrl);
                } catch (e: any) {
                    console.error("Initial generation failed", e);
                    const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue. Please try again.");
                    
                    // Check project's latest status in DB
                    const { data: latestProj } = await supabase.from('content_projects').select('status').eq('id', project.id).single();
                    const isInsufficient = latestProj?.status === 'insufficient' ||
                                           friendlyError.toLowerCase().includes("insufficient") || 
                                           friendlyError.toLowerCase().includes("balance") || 
                                           friendlyError.toLowerCase().includes("credit");
                    const nextStatus = isInsufficient ? 'insufficient' : 'draft';

                    setLocalProject((prev: any) => ({ ...prev, status: nextStatus, render_status: 'failed' }));
                    await supabase.from('content_projects').update({ status: nextStatus, render_status: 'failed' }).eq('id', project.id);

                    if (nextStatus === 'insufficient') {
                        fetchUserCredits();
                    } else {
                        setErrorMessage(friendlyError);
                        setNotification({ message: friendlyError, type: 'error' });
                        setTimeout(() => setNotification(null), 6000);
                    }
                }
            }
        };

        triggerInitialGeneration();
    }, [isNewCreation, project?.id, project?.isNewCreation, session?.user?.id, project?.user_id, fetchUserCredits]);

    const handleGenerateAssets = async () => {
        setIsGeneratingAssets(true);
        setErrorMessage(null);
        try {
            // Save segments first to ensure script is up to date
            await saveSegments(segments);
            const res = await generateAssets(project.id, voice.id, session.user.id);
            setAudioUrl(res.audioUrl);
            setTranscription(res.transcription);
            setSegmentDurations(res.segmentDurations);
            // Refresh project to get updated status
            const { data } = await supabase.from('content_projects').select('*').eq('id', project.id).single();
            if (data) setLocalProject(data);
            return true;
        } catch (e: any) {
            console.error("Asset generation failed", e);
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue generating assets. Please try again. Credits were not charged or have been refunded.");
            if (friendlyError.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setErrorMessage(friendlyError);
                setNotification({
                    message: friendlyError,
                    type: 'error'
                });
                setTimeout(() => {
                    setErrorMessage(null);
                    setNotification(null);
                }, 6000);
            }
            return false;
        } finally {
            setIsGeneratingAssets(false);
        }
    };

    const handleUploadClick = (segmentId: string, hasImage: boolean) => {
        if (hasImage) {
            setUploadConfirmSegmentId(segmentId);
        } else {
            setUploadingSegmentId(segmentId);
            setTimeout(() => fileInputRef.current?.click(), 0);
        }
    };

    const handleSelectAvatar = async (avatar: { id: string, url: string }) => {
        if (!imageEditModalId) return;
        setLoadingImage(true);
        try {
            await updateSegmentAvatar(imageEditModalId, avatar.url);
            setSegments(segments.map((s: any) => s.id === imageEditModalId ? { ...s, avatar_url: avatar.url } : s));
        } catch (e) {
            console.error(e);
            alert("Failed to update avatar");
        } finally {
            setLoadingImage(false);
            setShowAvatarModal(false);
        }
    };

    const handleDeleteAvatar = async (segmentId: string) => {
        setLoadingImage(true);
        try {
            await updateSegmentAvatar(segmentId, null);
            setSegments(segments.map((s: any) => s.id === segmentId ? { ...s, avatar_url: null } : s));
        } catch (e) {
            console.error(e);
            alert("Failed to delete avatar");
        } finally {
            setLoadingImage(false);
            setAvatarConfirmDeleteId(null);
        }
    };

    const handleConfirmUpload = () => {
        setUploadingSegmentId(uploadConfirmSegmentId);
        setUploadConfirmSegmentId(null);
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingSegmentId) return;

        try {
            setLoadingImage(true);
            const segment = segments.find((s: any) => s.id === uploadingSegmentId);
            
            const { signedUrl, publicUrl } = await generateUploadUrl(project.id, uploadingSegmentId, file.name, file.type);

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });
            
            if (!uploadRes.ok) throw new Error("Failed to upload image. Please try again.");

            await updateSegmentImage(uploadingSegmentId, publicUrl, segment?.image_url);
            
            setSegments((prev: any[]) => prev.map(s => s.id === uploadingSegmentId ? { ...s, image_url: publicUrl } : s));
        } catch (err: any) {
            console.error("Upload failed");
            setNotification({
                message: sanitizeErrorMsg(err, "Failed to upload image."),
                type: 'error'
            });
            setTimeout(() => setNotification(null), 6000);
        } finally {
            setLoadingImage(false);
            setUploadingSegmentId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExport = async (quality: string) => {
        if (userCredits !== null && userCredits <= 0) {
            setShowExportUpgradeModal(true);
            return;
        }

        setSubmitting(true);
        setExportStatus('idle');
        setErrorMessage(null);
        setShowExportMenu(false);
        try {
            await supabase.from('content_projects').update({ subtitles: subtitles }).eq('id', project.id);
            await exportVideo(project.id, session.user.id, quality);
            onComplete();
        } catch (e: any) {
            setExportStatus('error');
            const friendlyError = sanitizeErrorMsg(e, "Export failed. Please try again.");
            setErrorMessage(friendlyError);
            setNotification({
                message: friendlyError,
                type: 'error'
            });
            setTimeout(() => {
                setExportStatus('idle');
                setErrorMessage(null);
                setNotification(null);
            }, 6000);
            setSubmitting(false);
        }
    };

    const handleRegenerateVoice = async () => {
        if (isGeneratingAssets) return;
        setShowAudioConfirmation(true);
    };

    const confirmRegenerateVoice = async () => {
        setShowAudioConfirmation(false);
        await handleGenerateAssets();
    };

    const togglePlay = () => setIsPlaying(!isPlaying);
    const handleTimeUpdate = (t: number) => setCurrentTime(t);
    
    const handleAnimate = async (segmentId: string, model: 'fast' | 'ultra' = 'fast') => {
        const seg = segments.find((s: any) => s.id === segmentId);
        if (!seg || !seg.image_url) return;
        
        setIsAnimating(true);
        setErrorMessage(null);
        setShowAnimateMenu(false);
        try {
            const { videoUrl } = await generateVideoSegment(segmentId, seg.image_url, animationPrompt, model);
            
            // Update segments state
            setSegments((prev: any[]) => prev.map(s => s.id === segmentId ? { ...s, image_url: videoUrl } : s));
            
            // Persist segment update (animation_prompt might have changed)
            await supabase.from('content_segments').update({ animation_prompt: animationPrompt }).eq('id', segmentId);

            setNotification({
                message: "Magic! Video generated successfully.",
                type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);
            
        } catch (e: any) {
            console.error("Animation failed");
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue generating the video. Please try again.");
            if (friendlyError.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setErrorMessage(friendlyError);
                setNotification({
                    message: friendlyError,
                    type: 'error'
                });
                setTimeout(() => setNotification(null), 6000);
            }
        } finally {
            setIsAnimating(false);
        }
    };
    
    const handleAnimateAllClick = () => {
        const unAnimatedSegments = segments.filter((seg: any) => seg.image_url && !seg.image_url.toLowerCase().endsWith('.mp4'));
        if (unAnimatedSegments.length > 0) {
            const costPerSec = 5;
            const cost = unAnimatedSegments.reduce((acc: number, seg: any) => {
                const idx = segments.findIndex((s: any) => s.id === seg.id);
                const rawDur = segmentDurations[idx] || 4;
                const rounded = Math.round(rawDur);
                let finalDur = 2;
                if (rounded === 3 || rounded === 4) finalDur = 2;
                else if (rounded === 5) finalDur = 3;
                else if (rounded === 6 || rounded === 7) finalDur = 4;
                else if (rounded === 8 || rounded === 9) finalDur = 5;
                else if (rounded === 10 || rounded === 11) finalDur = 6;
                else if (rounded > 11) finalDur = 7;
                else finalDur = 2;
                return acc + (finalDur * costPerSec);
            }, 0);
            
            setConfirmAnimateAll({
                show: true,
                cost: cost,
                count: unAnimatedSegments.length,
                model: 'ultra'
            });
        }
        setShowAnimateAllMenu(false);
    };

    const confirmAnimateAllAction = async () => {
        setConfirmAnimateAll({ show: false, cost: 0, count: 0, model: 'ultra' });
        setIsAnimatingAll(true);
        setLocalProject((prev: any) => ({ ...prev, render_status: 'Animating' }));
        try {
            await animateAllSegments(project.id, session.user.id);
            setNotification({ message: 'Batch animation completely processed.', type: 'success' });
            setTimeout(() => setNotification(null), 4000);
        } catch (e: any) {
            console.error("Animate All failed");
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue with batch animation. Please try again.");
            if (friendlyError.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setErrorMessage(friendlyError);
                setNotification({ message: friendlyError, type: 'error' });
                setTimeout(() => setNotification(null), 6000);
            }
            setLocalProject((prev: any) => ({ ...prev, render_status: 'ready' }));
        } finally {
            setIsAnimatingAll(false);
        }
    };

    // Config Panel State
    const [activeModule, setActiveModule] = useState<'narration' | 'images' | 'effect' | 'captions' | null>(() => {
        const saved = localStorage.getItem('content_editor_active_module');
        return (saved as 'narration' | 'images' | 'effect' | 'captions' | null) || 'images';
    });
    const [isMobileConfigOpen, setIsMobileConfigOpen] = useState(() => {
        const saved = localStorage.getItem('content_editor_mobile_config_open');
        return saved ? saved === 'true' : true;
    });
    const [narrationSection, setNarrationSection] = useState<'voice' | 'style' | null>(null);
    const [narrationView, setNarrationView] = useState<'summary' | 'edit_script'>(() => {
        const saved = localStorage.getItem('content_editor_narration_view');
        return (saved as 'summary' | 'edit_script') || 'summary';
    });
    const [subtitleView, setSubtitleView] = useState<'summary' | 'edit' | 'transcription'>(() => {
        const saved = localStorage.getItem('content_editor_subtitle_view');
        return (saved as 'summary' | 'edit' | 'transcription') || 'summary';
    });

    useEffect(() => {
        localStorage.setItem('content_editor_active_module', activeModule || '');
        localStorage.setItem('content_editor_mobile_config_open', isMobileConfigOpen.toString());
        localStorage.setItem('content_editor_narration_view', narrationView);
        localStorage.setItem('content_editor_subtitle_view', subtitleView);
    }, [activeModule, isMobileConfigOpen, narrationView, subtitleView]);
    
    // Local state for editable settings
    const [voice, setVoice] = useState(VOICES.find(v => v.id === project.voice_id) || VOICES[0]);
    
    const [effect, setEffect] = useState<string | string[]>(() => {
        let parsedEffect = project.effect;
        if (typeof project.effect === 'string') {
            try {
                parsedEffect = JSON.parse(project.effect);
            } catch (e) {
                // Not JSON, keep as string
            }
        }

        if (Array.isArray(parsedEffect)) return parsedEffect;
        
        // Migration: If it's a string, convert to sequence
        const defaultSequenceKey = project.aspect_ratio === '16:9' ? 'minimalist' : 'cinematic';
        const baseSequence = EFFECT_SEQUENCES[parsedEffect as keyof typeof EFFECT_SEQUENCES] || EFFECT_SEQUENCES[defaultSequenceKey];
        // Expand to match segments if possible
        if (initialSegments?.length) {
            const expanded = [];
            for (let i = 0; i < initialSegments.length; i++) {
                expanded.push(baseSequence[i % baseSequence.length]);
            }
            return expanded;
        }
        return baseSequence;
    });

    // Migration logic
    useEffect(() => {
        if (animatingSegmentId) {
            const seg = segments.find((s: any) => s.id === animatingSegmentId);
            setAnimationPrompt(seg?.animation_prompt || '');
        }
    }, [animatingSegmentId, segments]);

    useEffect(() => {
        let parsedEffect = project.effect;
        if (typeof project.effect === 'string') {
            try {
                parsedEffect = JSON.parse(project.effect);
            } catch (e) {
                // Not JSON, keep as string
            }
        }

        if (typeof parsedEffect === 'string' && Object.keys(EFFECT_SEQUENCES).includes(parsedEffect)) {
            const defaultSequenceKey = project.aspect_ratio === '16:9' ? 'minimalist' : 'cinematic';
            const baseSequence = EFFECT_SEQUENCES[parsedEffect as keyof typeof EFFECT_SEQUENCES] || EFFECT_SEQUENCES[defaultSequenceKey];
            const expanded = [];
            const targetLength = segments?.length || 5;
            for (let i = 0; i < targetLength; i++) {
                expanded.push(baseSequence[i % baseSequence.length]);
            }
            setEffect(expanded);
            supabase.from('content_projects').update({ effect: expanded }).eq('id', project.id).then();
        }
    }, [project.id, project.effect, segments?.length]);
    
    // Default style or match by prompt text
    const defaultVoiceStylePrompt = VOICE_STYLES.find(s => s.id === 'storyteller')?.prompt || VOICE_STYLES[0].prompt;
    let parsedInitialStyle: VoiceStyleConfig = { style: defaultVoiceStylePrompt, pace: VOICE_PACES[0].prompt, accent: VOICE_ACCENTS[0].prompt };
    if (project.narration_style) {
        if (typeof project.narration_style === 'object') {
            parsedInitialStyle = { ...project.narration_style };
        } else if (typeof project.narration_style === 'string') {
            try {
                parsedInitialStyle = JSON.parse(project.narration_style);
            } catch (e) {
                // fallback
            }
        }
    }
    if (parsedInitialStyle && !VOICE_STYLES.find(s => s.prompt === parsedInitialStyle.style)) {
        parsedInitialStyle.style = defaultVoiceStylePrompt;
    }
    const [narrationStyle, setNarrationStyle] = useState<VoiceStyleConfig>(parsedInitialStyle);

    // Initialize subtitles from project or default
    const [subtitles, setSubtitles] = useState<SubtitleConfiguration>(() => {
        return project.subtitles as SubtitleConfiguration || DEFAULT_SUBTITLE_CONFIG;
    });
    const [subtitleState, setSubtitleState] = useState<'enabled' | 'disabled'>(project.subtitle_state || 'enabled');
    
    // Audio Preview
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- SYNC LOGIC ---

    // 2. Subscribe to Project Status Changes
    useEffect(() => {
        const channel = supabase.channel(`project-status-${project.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'content_projects',
                filter: `id=eq.${project.id}`
            }, (payload) => {
                console.log("[ContentEditor] Project update received", payload.new);
                const oldStatus = lastStatus || localProject.status;
                const oldRenderStatus = lastRenderStatus || localProject.render_status;
                
                setLocalProject((prev: any) => ({ ...prev, ...payload.new }));
                setLastStatus(payload.new.status);
                setLastRenderStatus(payload.new.render_status);

                // Check for image generation failures
                if (oldStatus === 'generating' && payload.new.status === 'draft') {
                    // We need to wait a bit for segments to sync or fetch them
                    setTimeout(async () => {
                        const { data: currentSegments } = await supabase.from('content_segments').select('image_url').eq('project_id', project.id);
                        if (currentSegments) {
                            const failedCount = currentSegments.filter(s => !s.image_url).length;
                            if (failedCount > 0) {
                                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', project.user_id).single();
                                if (profile && profile.credits < failedCount * 4) {
                                    setShowPricingModal(true);
                                } else {
                                    setNotification({
                                        message: `We encountered a technical issue generating ${failedCount} image(s), credits refunded. Please try again.`,
                                        type: 'error'
                                    });
                                    setTimeout(() => setNotification(null), 6000);
                                }
                            }
                        }
                    }, 1000);
                }

                // Check for audio generation failures
                if (oldRenderStatus === 'generating' && payload.new.render_status === 'failed') {
                    (async () => {
                        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', project.user_id).single();
                        if (profile && profile.credits < 5) {
                            setShowPricingModal(true);
                        } else {
                            setNotification({
                                message: `We encountered a technical issue generating audio, credits refunded. Please try again.`,
                                type: 'error'
                            });
                            setTimeout(() => setNotification(null), 6000);
                        }
                    })();
                }
                
                // Auto-load assets when they appear in the DB
                if (payload.new.voice_file_path && !audioUrl) {
                    setAudioUrl(payload.new.voice_file_path);
                    setTranscription(payload.new.transcription);
                    setSegmentDurations(payload.new.segment_durations || []);
                }
                if (payload.new.subtitles) {
                    setSubtitles(payload.new.subtitles as SubtitleConfiguration);
                }
                if (payload.new.subtitle_state) {
                    setSubtitleState(payload.new.subtitle_state);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [project.id, audioUrl]);

    // 3. Subscribe to Segment Changes
    useEffect(() => {
        console.log(`[ContentEditor] Subscribing to segment updates for project ${project.id}`);
        const channel = supabase.channel(`project-segments-${project.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'content_segments',
                filter: `project_id=eq.${project.id}`
            }, (payload) => {
                console.log("[ContentEditor] Received segment update", payload);
                if (payload.eventType === 'INSERT') {
                    setSegments((prev: any[]) => {
                        const exists = prev.find(s => s.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new].sort((a, b) => a.order_index - b.order_index);
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setSegments((prev: any[]) => prev.map(s => 
                        s.id === payload.new.id ? { ...s, ...payload.new } : s
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setSegments((prev: any[]) => prev.filter(s => s.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [project.id]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleVoiceSample = (e: React.MouseEvent, voiceId: string) => {
        e.stopPropagation();
        const sampleUrl = VOICE_SAMPLES[voiceId];
        if (!sampleUrl) return;

        if (playingVoiceId === voiceId) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(sampleUrl);
            audioRef.current = audio;
            audio.play();
            setPlayingVoiceId(voiceId);
            audio.onended = () => setPlayingVoiceId(null);
        }
    };

    const handleVoiceSelect = async (newVoice: any) => {
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayingVoiceId(null);
        }
        setVoice(newVoice);
        await supabase.from('content_projects').update({ voice_id: newVoice.id }).eq('id', project.id);
    };

    const handleRegenerate = async (targetId?: string) => {
        const id = targetId || regeneratingId;
        if (!id) return;
        
        const seg = segments.find((s: any) => s.id === id);
        if (!seg) return;

        setLoadingImage(true);
        setRegenerateStatus('idle');
        setErrorMessage(null);
        try {
            let finalPrompt = seg.image_prompt;
            
            if (regeneratePrompt !== seg.image_prompt) {
                await supabase.from('content_segments').update({ image_prompt: regeneratePrompt }).eq('id', seg.id);
                finalPrompt = regeneratePrompt;
                setSegments((prev: any[]) => prev.map(s => s.id === id ? { ...s, image_prompt: regeneratePrompt } : s));
            }

            const res = await regenerateImageSegment(
                seg.id, 
                project.id, 
                finalPrompt, 
                project.aspect_ratio,
                seg.image_url
            );
            
            setSegments((prev: any[]) => prev.map(s => s.id === id ? { ...s, image_url: res.imageUrl } : s));
            setRegeneratingId(null);
        } catch (e: any) {
            console.error("Image regeneration failed.");
            setRegenerateStatus('error');
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue regenerating the image. Please try again. Credits were not charged or have been refunded.");
            if (friendlyError.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setErrorMessage(friendlyError);
                setNotification({
                    message: friendlyError,
                    type: 'error'
                });
                setTimeout(() => {
                    setRegenerateStatus('idle');
                    setErrorMessage(null);
                    setNotification(null);
                }, 6000);
            }
        } finally {
            setLoadingImage(false);
        }
    };

    const handleImageEdit = async (targetId?: string) => {
        const id = targetId || editingImageId;
        if (!id || !editPrompt) return;
        setLoadingImage(true);
        setEditStatus('idle');
        setErrorMessage(null);
        const seg = segments.find((s: any) => s.id === id);
        try {
            const res = await editImageSegment(seg.id, seg.image_url, editPrompt);
            setSegments((prev: any[]) => prev.map(s => s.id === id ? { ...s, image_url: res.imageUrl } : s));
            setEditingImageId(null);
            setEditPrompt('');
        } catch (e: any) {
            console.error("Image edit failed.");
            setEditStatus('error');
            const friendlyError = sanitizeErrorMsg(e, "We encountered a technical issue editing the image. Please try again. Credits were not charged or have been refunded.");
            if (friendlyError.includes("Insufficient credits")) {
                setShowPricingModal(true);
            } else {
                setErrorMessage(friendlyError);
                setNotification({
                    message: friendlyError,
                    type: 'error'
                });
                setTimeout(() => {
                    setEditStatus('idle');
                    setErrorMessage(null);
                    setNotification(null);
                }, 6000);
            }
        } finally {
            setLoadingImage(false);
        }
    };

    const handleEffectChange = async (newEffect: any) => {
        const defaultSequenceKey = project.aspect_ratio === '16:9' ? 'minimalist' : 'cinematic';
        const baseSequence = EFFECT_SEQUENCES[newEffect.id as keyof typeof EFFECT_SEQUENCES] || EFFECT_SEQUENCES[defaultSequenceKey];
        const expanded = [];
        for (let i = 0; i < segments.length; i++) {
            expanded.push(baseSequence[i % baseSequence.length]);
        }
        setEffect(expanded);
        await supabase.from('content_projects').update({ effect: expanded }).eq('id', project.id);
    };

    const handleSegmentEffectChange = async (segmentIndex: number, effectType: string) => {
        const defaultSequenceKey = project.aspect_ratio === '16:9' ? 'minimalist' : 'cinematic';
        const currentEffect = Array.isArray(effect) ? effect : (EFFECT_SEQUENCES[project.effect as keyof typeof EFFECT_SEQUENCES] || EFFECT_SEQUENCES[defaultSequenceKey]);
        const newSequence = [...currentEffect];
        
        // Ensure sequence is long enough to cover all segments
        while (newSequence.length < segments.length) {
            newSequence.push(newSequence[newSequence.length % newSequence.length] || 'zoom_in');
        }
        
        newSequence[segmentIndex] = effectType;
        setEffect(newSequence);
        await supabase.from('content_projects').update({ effect: newSequence }).eq('id', project.id);
        setAnimatingSegmentId(null);
    };

    const handleNarrationStyleChange = async (key: keyof VoiceStyleConfig, value: string) => {
        const newStyle = { ...narrationStyle, [key]: value };
        setNarrationStyle(newStyle);
        await supabase.from('content_projects').update({ narration_style: newStyle as any }).eq('id', project.id);
    };

    const handleSubtitleUpdate = (updates: Partial<SubtitleConfiguration>) => {
        const newConfig = { ...subtitles, ...updates };
        setSubtitles(newConfig);
        // Persist to DB
        supabase.from('content_projects').update({ subtitles: newConfig }).eq('id', project.id).then();
    };

    const handleTranscriptionUpdate = (newTranscription: any) => {
        setTranscription(newTranscription);
        supabase.from('content_projects').update({ transcription: newTranscription }).eq('id', project.id).then();
    };

    const handleSubtitleStateToggle = () => {
        const newState = subtitleState === 'enabled' ? 'disabled' : 'enabled';
        setSubtitleState(newState);
        supabase.from('content_projects').update({ subtitle_state: newState }).eq('id', project.id).then();
    };

    const handleApplySubtitlePreset = (presetId: string) => {
        let updates: Partial<SubtitleConfiguration> = {};
        if (presetId === 'pulse_bold') {
            updates = { animationType: 'pulse_bold', fontFamily: 'Arimo', fontSize: 24, highlightColor: '#FFFF00', primaryColor: '#ffffff', strokeWidth: 4 };
        } else if (presetId === 'glow_focus') {
            updates = { animationType: 'glow_focus', fontFamily: 'Griffy', fontSize: 28, primaryColor: '#ffffff', strokeWidth: 0 };
        } else if (presetId === 'impact_pop') {
            updates = { animationType: 'impact_pop', fontFamily: 'Chewy', fontSize: 32, highlightColor: '#FFFF00', primaryColor: '#ffffff', strokeWidth: 4 };
        } else if (presetId === 'comic_burst') {
            updates = { animationType: 'pulse_bold', fontFamily: 'Komika Hand', fontSize: 30, primaryColor: '#ffffff', secondaryColor: '#000000', strokeWidth: 6 };
        }
        handleSubtitleUpdate(updates);
    };

    const handleSaveAsDefault = async () => {
        if (!session?.user?.id) return;
        setSaveDefaultStatus('saving');
        try {
            // Strip 'enabled' flag from global defaults as it should be project-specific
            const { enabled, ...configToSave } = subtitles;
            
            await supabase.from('user_configurations').upsert({
                user_id: session.user.id,
                subtitles: configToSave,
                updated_at: new Date().toISOString()
            });
            setSaveDefaultStatus('success');
            setTimeout(() => setSaveDefaultStatus('idle'), 2000);
        } catch (e) {
            setSaveDefaultStatus('error');
            setTimeout(() => setSaveDefaultStatus('idle'), 3000);
        }
    };


    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    // Gate completion: All segments must have an image
    const allImagesReady = segments.every((s: any) => s.image_url);

    // Module Icons
    const Icons = {
        Narration: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
        Images: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        Effect: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
        Captions: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    };

    const renderModuleContent = (module: string) => {
        switch (module) {
            case 'narration':
                if (narrationView === 'edit_script') {
                    return (
                        <div className="md:space-y-4 space-y-2">
                            <button 
                                onClick={() => setNarrationView('summary')}
                                className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-1 md:mb-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                            </button>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {segments.map((seg: any, idx: number) => (
                                    <div key={seg.id} className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Segment {idx + 1}</label>
                                        <textarea
                                            value={seg.narration}
                                            onChange={(e) => {
                                                const newText = e.target.value;
                                                setSegments((prev: any[]) => prev.map(s => s.id === seg.id ? { ...s, narration: newText } : s));
                                            }}
                                            className="w-full p-3 bg-black border border-white/10 rounded-xl text-sm text-zinc-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 outline-none resize-y min-h-[80px]"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => {
                                    setNarrationView('summary');
                                    handleRegenerateVoice();
                                }}
                                disabled={isGeneratingAssets}
                                className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm mt-4"
                            >
                                {isGeneratingAssets ? 'Regenerating...' : 'Save & Regenerate Audio'}
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        {/* Script Edit Button */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationView('edit_script')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Script</div>
                                    <div className="font-bold text-white">Edit Segment by Segment</div>
                                </div>
                                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </div>

                        {/* Voice Accordion */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'voice' ? null : 'voice')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Voice</div>
                                    <div className="font-bold text-white">{voice.name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-zinc-500 transition-transform ${narrationSection === 'voice' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'voice' && (
                                <div className="p-2 bg-zinc-900 border-t border-white/10 space-y-2 max-h-60 overflow-y-auto">
                                    {VOICES.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleVoiceSelect(v)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${voice.id === v.id ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                        >
                                            <span className="font-bold">{v.name}</span>
                                            {VOICE_SAMPLES[v.id] && (
                                                <div onClick={(e) => toggleVoiceSample(e, v.id)} className={`p-1 rounded-full ${voice.id === v.id ? 'bg-zinc-700 text-zinc-600' : 'bg-black hover:bg-zinc-900 text-zinc-400'}`}>
                                                    {playingVoiceId === v.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Style Accordion */}
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setNarrationSection(narrationSection === 'style' ? null : 'style')}
                                className="w-full flex items-center justify-between p-4 bg-black hover:bg-zinc-900 transition"
                            >
                                <div className="text-left w-full pr-4 overflow-hidden">
                                    <div className="text-xs font-bold text-zinc-500 uppercase">Narration Style</div>
                                    <div className="font-bold text-white truncate w-full">{VOICE_STYLES.find(s => s.prompt === narrationStyle.style)?.name || VOICE_STYLES.find(s => s.id === 'storyteller')?.name || VOICE_STYLES[0].name}</div>
                                </div>
                                <svg className={`w-5 h-5 text-zinc-500 transition-transform shrink-0 ${narrationSection === 'style' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {narrationSection === 'style' && (
                                <div className="p-2 bg-zinc-900 border-t border-white/10 max-h-[300px] overflow-y-auto">
                                    <div className="flex gap-2 p-1">
                                        <div className="flex-1 space-y-1">
                                            <div className="text-xs uppercase text-zinc-500 font-bold px-2 py-1">Style</div>
                                            {VOICE_STYLES.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleNarrationStyleChange('style', s.prompt)}
                                                    className={`w-full flex flex-col items-start px-3 py-2 text-sm border rounded-lg transition-all ${narrationStyle.style === s.prompt ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                                    title={s.description}
                                                >
                                                    <div className="font-bold">{s.name}</div>
                                                    <div className={`text-[10px] text-left line-clamp-2 ${narrationStyle.style === s.prompt ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex-1 border-l border-white/5 pl-2 space-y-1">
                                            <div className="text-xs uppercase text-zinc-500 font-bold px-2 py-1">Pace</div>
                                            {VOICE_PACES.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleNarrationStyleChange('pace', p.prompt)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${narrationStyle.pace === p.prompt ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                                >
                                                    <div className="font-bold">{p.name}</div>
                                                </button>
                                            ))}
                                            <div className="text-xs uppercase text-zinc-500 font-bold px-2 py-1 mt-4">Accent</div>
                                            {VOICE_ACCENTS.map(a => (
                                                <button
                                                    key={a.id}
                                                    onClick={() => handleNarrationStyleChange('accent', a.prompt)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${narrationStyle.accent === a.prompt ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                                >
                                                    <div className="font-bold">{a.name}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleRegenerateVoice}
                            disabled={isGeneratingAssets}
                            className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm"
                        >
                            {isGeneratingAssets ? 'Regenerating...' : 'Regenerate Audio'}
                        </button>
                        {errorMessage && !isGeneratingAssets && !regeneratingId && !editingImageId && exportStatus === 'idle' && (
                            <div className="text-[10px] font-bold text-red-600 animate-pulse text-center">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                );
            case 'images':
                return (
                    <div className="flex flex-col flex-1 h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-2 pb-4 space-y-2 md:space-y-4">
                            {(() => {
                                const visibleSegments = segments;

                                return (
                                    <>
                                        {visibleSegments.map((seg: any, idx: number) => {

                            let currentAudioTime = 0;
                            let isActive = false;
                            for (let j = 0; j <= idx; j++) {
                                const dur = segmentDurations?.[j] || 0;
                                if (j === idx) {
                                    isActive = currentTime >= currentAudioTime && currentTime <= currentAudioTime + dur;
                                }
                                currentAudioTime += dur;
                            }

                            return (
                            <div 
                                key={seg.id} 
                                className={`flex gap-3 items-start p-2 md:p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-yellow-500/10 border-yellow-500/50 scale-[1.02]' : 'bg-zinc-900 border-white/5 hover:border-white/20'}`}
                                onClick={() => {
                                    let startTime = 0;
                                    for (let j = 0; j < idx; j++) startTime += segmentDurations?.[j] || 0;
                                    setCurrentTime(startTime);
                                }}
                            >
                                <div className="w-12 h-12 md:w-16 md:aspect-square bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-white/10 relative cursor-pointer flex items-center justify-center" onClick={(e) => { e.stopPropagation(); seg.image_url && setExpandedImage(seg.image_url); }}>
                                    {seg.image_url ? (
                                        seg.image_url.toLowerCase().includes('.mp4') ? (
                                            <video src={seg.image_url} muted playsInline className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={seg.image_url} className="w-full h-full object-cover" />
                                        )
                                    ) : localProject.status === 'draft' ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
                                            <div className="text-[8px] font-bold text-zinc-500 uppercase">Generating</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Segment {idx + 1}</div>
                                    <div className="flex gap-2 mt-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageEditModalId(seg.id);
                                                setRegeneratePrompt(seg.image_prompt || '');
                                                setEditPrompt('');
                                                setImageEditTab('regenerate');
                                            }} 
                                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 hover:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-200 transition"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            Edit
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAnimatingSegmentId(seg.id);
                                            }} 
                                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 hover:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-200 transition"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Animate
                                        </button>
                                    </div>
                                </div>
                            </div>
                                        )})}

                                    </>
                                );
                            })()}
                        </div>
                        
                        <div className="shrink-0 pt-4 pb-4 px-4 md:px-6 md:pb-6 border-t border-white/10 bg-black relative">
                            <button
                                onClick={() => handleAnimateAllClick()}
                                disabled={isAnimatingAll || localProject.render_status === 'Animating' || segments.filter((seg: any) => seg.image_url && !seg.image_url.toLowerCase().endsWith('.mp4')).length === 0}
                                className="w-full py-3 bg-yellow-500 text-black text-sm font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                            >
                                {isAnimatingAll || localProject.render_status === 'Animating' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        Animating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/></svg>
                                        Animate All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                );
            case 'effect':
                const currentPresets = project.aspect_ratio === '16:9' ? LONG_FORM_PRESETS : EFFECT_PRESETS;
                return (
                    <div className="space-y-2">
                        {currentPresets.map(e => {
                            const isSelected = !Array.isArray(effect) ? effect === e.id : false; // This is tricky after migration
                            // For now, let's just check if it matches the preset ID if we had one
                            return (
                                <button
                                    key={e.id}
                                    onClick={() => handleEffectChange(e)}
                                    className={`w-full text-left px-3 py-3 border rounded-xl transition-all ${isSelected ? 'bg-zinc-900 border-white/10 text-white' : 'bg-black border-white/10 hover:border-white/20 text-zinc-200'}`}
                                >
                                    <div className="font-bold text-sm">{e.name}</div>
                                    <div className={`text-[10px] text-zinc-500`}>{e.description}</div>
                                </button>
                            );
                        })}
                    </div>
                );
            case 'captions':
                if (subtitleView === 'summary') {
                    return (
                        <div className="space-y-6">
                            <SubtitleConfigurationPanel
                                subtitles={subtitles}
                                subtitleState={subtitleState}
                                subtitleView={subtitleView}
                                setSubtitleView={setSubtitleView}
                                handleSubtitleStateToggle={handleSubtitleStateToggle}
                                handleSubtitleUpdate={handleSubtitleUpdate}
                                transcription={transcription}
                                currentTime={currentTime}
                                handleTranscriptionUpdate={handleTranscriptionUpdate}
                            />
                        </div>
                    );
                }
                return (
                    <div className="md:space-y-4 space-y-2">
                        <SubtitleConfigurationPanel
                            subtitles={subtitles}
                            subtitleState={subtitleState}
                            subtitleView={subtitleView}
                            setSubtitleView={setSubtitleView}
                            handleSubtitleStateToggle={handleSubtitleStateToggle}
                            handleSubtitleUpdate={handleSubtitleUpdate}
                            transcription={transcription}
                            currentTime={currentTime}
                            handleTranscriptionUpdate={handleTranscriptionUpdate}
                        />

                        {/* Save Buttons */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <button
                                onClick={handleSaveAsDefault}
                                disabled={saveDefaultStatus === 'saving'}
                                className={`w-full py-3 text-sm font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
                                    saveDefaultStatus === 'success' ? 'bg-green-500 text-white border border-green-500' :
                                    saveDefaultStatus === 'error' ? 'bg-red-500 text-white border border-red-500' :
                                    'bg-black border border-white/10 text-white hover:bg-zinc-900'
                                }`}
                            >
                                {saveDefaultStatus === 'saving' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                                {saveDefaultStatus === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                {saveDefaultStatus === 'saving' ? 'Saving...' :
                                 saveDefaultStatus === 'success' ? 'Saved' :
                                 saveDefaultStatus === 'error' ? 'Failed' : 'Save as Default Style'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col h-full overflow-hidden">
            {/* Notifications */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {notification.type === 'error' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 hover:bg-black/20 rounded-full p-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Modals */}
            {confirmAnimateAll.show && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Animate {confirmAnimateAll.count} Images?</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            This will animate all your remaining static images into videos using the Grok model. 
                            This action will cost <strong className="text-yellow-500">{confirmAnimateAll.cost} credits</strong> 
                            &nbsp;for {confirmAnimateAll.count} segments based on their duration.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmAnimateAll({ show: false, cost: 0, count: 0, model: 'ultra' })}
                                className="flex-1 py-2.5 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmAnimateAllAction}
                                className="flex-1 py-2.5 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition shadow-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {expandedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setExpandedImage(null)}
                >
                    {expandedImage.toLowerCase().includes('.mp4') ? (
                        <video src={expandedImage} autoPlay loop controls muted playsInline className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    ) : (
                        <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    )}
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setExpandedImage(null)}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            
            {/* Top Bar (Full Width) */}
            <div className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-30 relative">
                <button onClick={onBack} className="text-zinc-400 hover:text-white text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-black transition-colors">
                    ← Back
                </button>
                <div className="flex items-center gap-3">
                    {isGeneratingAssets && (
                        <div className="flex items-center gap-2 text-[10px] text-yellow-600 font-bold animate-pulse bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-900/30">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                            GENERATING ASSETS... {timer}s
                        </div>
                    )}
                    <button
                        onClick={() => setShowMetadataModal(true)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition border border-white/10 hover:border-white/20 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-1.5 shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Metadata
                    </button>
                    <div className="relative">
                        <button 
                            onClick={showExportMenu ? () => setShowExportMenu(false) : () => setShowExportMenu(true)}
                            disabled={submitting || isGeneratingAssets}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 transition shadow-sm flex items-center gap-2 ${exportStatus === 'error' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                        >
                            {submitting ? `Exporting... ${timer}s` : exportStatus === 'error' ? (errorMessage || 'Export Failed') : 'Export Video'}
                            {(!submitting && exportStatus !== 'error') && (
                                <svg className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            )}
                        </button>
                        {showExportMenu && !submitting && !isGeneratingAssets && (
                            <div className="absolute right-0 top-full mt-2 w-36 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                                <button className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-zinc-800 transition border-b border-white/5" onClick={() => handleExport('720p')}>720p (Fast)</button>
                                <button className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-zinc-800 transition" onClick={() => handleExport('1080p')}>1080p (HQ)</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Left Margin Frame */}
                <div className="hidden md:block w-4 bg-black shrink-0 border-r border-white/10/50"></div>

                {/* Video Preview Area */}
                <div className={`flex-1 bg-zinc-900 flex flex-col relative overflow-hidden h-full transition-all duration-300 ${isMobileConfigOpen ? 'md:h-full h-[35%]' : 'h-full'}`}>

                    <div className={`flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 w-full relative transition-all duration-300 ${isMobileConfigOpen ? 'scale-90 md:scale-100' : 'scale-100'}`}>
                        {Boolean(
                            audioUrl && 
                            segmentDurations && 
                            segmentDurations.length > 0 && 
                            !['generating', 'rendering', 'rendering_voice', 'draft', 'insufficient'].includes(localProject.status) && 
                            localProject.render_status !== 'Animating' &&
                            localProject.render_status !== 'generating' &&
                            localProject.render_status !== 'failed'
                        ) ? (
                            <ContentVideoPlayer
                                segments={segments}
                                audioUrl={audioUrl}
                                transcription={transcription}
                                segmentDurations={segmentDurations}
                                aspectRatio={project.aspect_ratio}
                                effect={effect}
                                subtitleStyle={subtitles}
                                subtitleState={subtitleState}
                                isPlaying={isPlaying}
                                onPlayPause={togglePlay}
                                currentTime={currentTime}
                                onTimeUpdate={handleTimeUpdate}
                            />
                        ) : (
                            <div className="w-full max-w-xl md:max-w-2xl px-4 pt-2 md:pt-4 pb-8 flex flex-col gap-5 self-start">
                                {/* User Prompt Message (Right Side) */}
                                <div className="flex justify-end w-full">
                                    <div 
                                        onClick={() => setShowPromptModal(true)}
                                        className="bg-zinc-800/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 rounded-2xl rounded-tr-xs p-4 shadow-xl text-left w-full max-w-[82%] sm:max-w-[420px] h-[100px] ml-auto flex flex-col justify-between cursor-pointer group transition-all"
                                        title="Click to view full prompt"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">Prompt</span>
                                                {activePromptAspectRatio && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400 shrink-0">
                                                        {activePromptAspectRatio}
                                                    </span>
                                                )}
                                                {activePromptStyle && (
                                                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400 truncate max-w-[85px]">
                                                        {activePromptStyle}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPromptModal(true);
                                                }}
                                                className="text-[11px] font-medium text-yellow-500/90 hover:text-yellow-400 group-hover:text-yellow-400 flex items-center gap-1 transition-colors shrink-0 ml-2"
                                                title="View full prompt in lightbox"
                                            >
                                                <span>View full</span>
                                                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            </button>
                                        </div>

                                        <p className="text-sm text-zinc-200 font-normal leading-snug line-clamp-2 break-words mt-1">
                                            {activePromptText}
                                        </p>
                                    </div>
                                </div>

                                {/* AI Reply Column (Left Side) */}
                                <div className="flex justify-start w-full">
                                    <div className="flex items-start gap-3 w-full">
                                        {/* AI Assistant Avatar */}
                                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                            <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>

                                        {/* AI Reply Bubble */}
                                        <div className={`bg-zinc-950/80 border border-white/10 rounded-2xl rounded-tl-xs p-4 shadow-xl text-left w-full max-w-[82%] sm:max-w-[420px] ${
                                            (['generating', 'rendering', 'rendering_voice'].includes(localProject.status) || 
                                              localProject.render_status === 'Animating' || 
                                              localProject.render_status === 'generating' ||
                                              isRetrying) ? 'h-[100px]' : 'min-h-[100px]'
                                        } flex flex-col justify-center`}>
                                            {(['generating', 'rendering', 'rendering_voice'].includes(localProject.status) || 
                                              localProject.render_status === 'Animating' || 
                                              localProject.render_status === 'generating' ||
                                              isRetrying) ? (
                                                <div className="flex flex-col gap-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        {/* Blinking / Pulsing icon indicating processing */}
                                                        <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                                        </div>
                                                        <span className="text-sm font-medium text-zinc-200 tracking-wide animate-pulse">
                                                            {localProject.render_status === 'Animating' ? 'Animating Videos...' : 
                                                             localProject.status === 'generating' ? thinkingTexts[generatingTextIndex] :
                                                             localProject.status === 'rendering' ? 'Rendering Scene Images...' :
                                                             localProject.status === 'rendering_voice' ? 'Synthesizing Voiceover...' :
                                                             'Processing video generation...'}
                                                        </span>
                                                    </div>
                                                    {/* Chatbot typing dots */}
                                                    <div className="flex items-center gap-1.5 pl-6 pt-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70 animate-bounce [animation-delay:-0.3s]"></span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70 animate-bounce [animation-delay:-0.15s]"></span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70 animate-bounce"></span>
                                                        <span className="text-xs text-zinc-500 ml-2">Crafting scenes, voice, and visual assets</span>
                                                    </div>
                                                </div>
                                            ) : localProject.status === 'insufficient' ? (
                                                /* Insufficient Credits Reply */
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{userCredits !== null ? Math.max(0, Math.round(userCredits)) : 0} Credits Left</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                                        Your balance is insufficient to complete this project. Please add credits to your account to continue generation.
                                                    </p>
                                                    <div className="pt-1">
                                                        <button
                                                            onClick={handleAddCredits}
                                                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:scale-98 text-black text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                            <span>Add Credits</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Interrupted / Stopped State with Retry */
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">Generation Interrupted</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                                        Generation stopped before all scenes and audio could be completed. Click retry below to finish generating the remaining assets.
                                                    </p>
                                                    <div className="pt-1">
                                                        <button
                                                            onClick={handleRetryProject}
                                                            disabled={isRetrying}
                                                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 active:scale-98 text-black text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <svg className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            <span>{isRetrying ? 'Retrying Generation...' : 'Retry Generation'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Playback Controls removed from here and moved to ContentVideoPlayer */}
                </div>

                {/* Desktop: Config Panel (Strip + Wing) */}
                <div className="hidden md:flex h-full shrink-0 z-20 shadow-xl relative border-l border-white/10">
                    {/* Wing (Content) */}
                    <div className={`bg-black border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out ${activeModule === 'images' ? 'overflow-hidden' : 'overflow-y-auto'} ${activeModule ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                        <div className={`min-w-[20rem] flex-1 flex flex-col ${activeModule === 'images' ? 'p-0 overflow-hidden pt-6' : 'p-6'}`}>
                            {activeModule && renderModuleContent(activeModule)}
                        </div>
                    </div>

                    {/* Strip (Icons) */}
                    <div className="w-24 bg-black flex flex-col items-center py-6 gap-4 z-30">
                        <button 
                            onClick={() => setActiveModule(activeModule === 'narration' ? null : 'narration')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'narration' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Narration />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Audio</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'images' ? null : 'images')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'images' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Images />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Images</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'effect' ? null : 'effect')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'effect' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Effect />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight text-center leading-none">Video<br/>Effects</span>
                        </button>
                        <button 
                            onClick={() => setActiveModule(activeModule === 'captions' ? null : 'captions')}
                            className={`w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all ${activeModule === 'captions' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Icons.Captions />
                            <span className="text-[10px] font-black mt-2 uppercase tracking-tight">Subtitles</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile: Edit FAB */}
            <button 
                className="md:hidden absolute bottom-20 right-4 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center z-40"
                onClick={() => setIsMobileConfigOpen(true)}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </button>

            {/* Mobile: Settings Drawer */}
            <div className={`md:hidden fixed inset-x-0 bottom-0 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 transition-transform duration-300 ease-out transform ${isMobileConfigOpen ? 'translate-y-0' : 'translate-y-full'} ${isMobileConfigOpen && activeModule === 'images' ? 'flex flex-col h-[65vh]' : ''}`}>
                <div className={`${activeModule === 'images' ? 'flex flex-col flex-1 overflow-hidden w-full' : `p-6 ${activeModule ? 'p-4 max-h-[55vh]' : 'max-h-[70vh]'} overflow-y-auto`} transition-all duration-300`}>
                    {/* Drawer Handle */}
                    <div className={`w-12 h-1.5 bg-zinc-900 rounded-full mx-auto shrink-0 mb-4 md:mb-6 ${activeModule === 'images' ? 'mt-4' : ''}`} onClick={() => setIsMobileConfigOpen(false)}></div>

                    {!activeModule ? (
                        // Menu View
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setActiveModule('narration')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Narration /></div>
                                <span className="font-bold text-sm text-zinc-200">Audio</span>
                            </button>
                            <button onClick={() => setActiveModule('images')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Images /></div>
                                <span className="font-bold text-sm text-zinc-200">Images</span>
                            </button>
                            <button onClick={() => setActiveModule('effect')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Effect /></div>
                                <span className="font-bold text-sm text-zinc-200">Video Effects</span>
                            </button>
                            <button onClick={() => setActiveModule('captions')} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition">
                                <div className="p-3 bg-black rounded-full shadow-sm text-white"><Icons.Captions /></div>
                                <span className="font-bold text-sm text-zinc-200">Subtitles</span>
                            </button>
                        </div>
                    ) : (
                        // Detail View
                        <div className={`animate-fadeIn ${activeModule === 'images' ? 'flex flex-col flex-1 overflow-hidden' : ''}`}>
                            {!(activeModule === 'captions' && subtitleView !== 'summary') && !(activeModule === 'narration' && narrationView !== 'summary') && (
                                <div className={`flex items-center gap-4 shrink-0 ${activeModule === 'images' ? 'px-4 mb-3' : 'mb-6'}`}>
                                    <button onClick={() => setActiveModule(null)} className="p-2 -ml-2 text-zinc-500 hover:text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                </div>
                            )}
                            {renderModuleContent(activeModule)}
                        </div>
                    )}
                </div>
            </div>

            {/* Image Edit Modal */}
            <AnimatePresence>
                {imageEditModalId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                        >
                            {/* Left: Current Image & Characters */}
                            <div className="md:w-1/2 bg-black flex flex-col items-center justify-between p-4 border-b md:border-b-0 md:border-r border-white/10 relative overflow-y-auto max-h-[85vh] md:max-h-[80vh]">
                                <div className="flex-1 w-full flex items-center justify-center relative min-h-[30vh]">
                                    {(() => {
                                        const seg = segments.find((s: any) => s.id === imageEditModalId);
                                        return seg?.image_url ? (
                                            seg.image_url.toLowerCase().includes('.mp4') ? (
                                                <video src={seg.image_url} autoPlay loop muted playsInline className="max-w-full max-h-[40vh] md:max-h-[50vh] object-contain rounded-xl shadow-lg" />
                                            ) : (
                                                <img src={seg.image_url} className="max-w-full max-h-[40vh] md:max-h-[50vh] object-contain rounded-xl shadow-lg" />
                                            )
                                        ) : (
                                            <div className="text-zinc-500 font-bold uppercase tracking-widest">No Image</div>
                                        );
                                    })()}
                                </div>

                                {/* Segment Characters Section */}
                                {(() => {
                                    const seg = segments.find((s: any) => s.id === imageEditModalId);
                                    if (!seg) return null;

                                    let rawChars: any[] = [];
                                    if (Array.isArray(seg.characters)) {
                                        rawChars = seg.characters;
                                    } else if (typeof seg.characters === 'string') {
                                        try {
                                            const parsed = JSON.parse(seg.characters);
                                            if (Array.isArray(parsed)) rawChars = parsed;
                                        } catch (e) {
                                            rawChars = [];
                                        }
                                    }

                                    const resolvedChars = rawChars.map((item: any, idx: number) => {
                                        const charId = typeof item === 'string' ? item : (item.character_id || item.id || `char_${idx + 1}`);
                                        const outfitId = typeof item === 'object' && item.outfit_id ? item.outfit_id : '';
                                        
                                        const matched = projectCharacters.find((pc: any) => 
                                            pc.character_id === charId && (!outfitId || pc.outfit_id === outfitId)
                                        ) || projectCharacters.find((pc: any) => pc.character_id === charId);

                                        let imgUrl = item.image_url || matched?.image_url || null;
                                        if (!imgUrl && (charId === 'AVATAR' || charId.toLowerCase() === 'avatar')) {
                                            imgUrl = seg.avatar_url || project?.avatar_url || null;
                                        }

                                        let name = item.name || '';
                                        if (!name) {
                                            if (charId === 'AVATAR' || charId.toLowerCase() === 'avatar') {
                                                name = 'Avatar';
                                            } else {
                                                const cleaned = charId.replace(/^character_?/i, 'Character ').replace(/[-_]/g, ' ');
                                                name = cleaned.replace(/\b\w/g, (c: string) => c.toUpperCase());
                                            }
                                        }

                                        const outfit = outfitId ? outfitId.replace(/[-_]/g, ' ').replace(/\boutfit\s*/i, 'Outfit ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
                                        const desc = matched?.full_desc || item.full_desc || item.desc || '';
                                        const key = `${charId}_${outfitId}_${idx}`;

                                        return {
                                            key,
                                            charId,
                                            outfitId,
                                            name,
                                            outfit,
                                            desc,
                                            imageUrl: imgUrl,
                                            index: item.index !== undefined ? item.index : idx + 1
                                        };
                                    });

                                    if (resolvedChars.length === 0) {
                                        return (
                                            <div className="w-full mt-4 p-3.5 border border-white/10 rounded-2xl bg-zinc-900/60 flex items-center justify-between shrink-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-500 shrink-0">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-white">Segment Characters</p>
                                                        <p className="text-[11px] text-zinc-400">No characters assigned to this segment</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="w-full mt-4 p-3.5 border border-white/10 rounded-2xl bg-zinc-900/70 backdrop-blur-sm flex flex-col gap-2.5 shrink-0 transition-all">
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-semibold text-white tracking-wide">Segment Characters</span>
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-zinc-300 border border-white/10 font-mono">
                                                        {resolvedChars.length}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-zinc-500">
                                                    Click icon to view
                                                </span>
                                            </div>

                                            {/* Small expandable icons row */}
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                {resolvedChars.map((char) => (
                                                    <button
                                                        key={char.key}
                                                        type="button"
                                                        onClick={() => setLightboxChar(char)}
                                                        title={`${char.name}${char.outfit ? ` (${char.outfit})` : ''} - Click to view full image`}
                                                        className="w-10 h-10 rounded-xl overflow-hidden relative group transition-all duration-200 shrink-0 border border-white/15 hover:border-white/40 hover:scale-105 bg-zinc-800 cursor-pointer"
                                                    >
                                                        {char.imageUrl ? (
                                                            <img 
                                                                src={char.imageUrl} 
                                                                alt={char.name} 
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                                {char.name.charAt(0)}
                                                            </div>
                                                        )}

                                                        {/* Small view icon overlay on hover */}
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Right: Actions */}
                            <div className="md:w-1/2 p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white">Edit Image</h3>
                                    <button onClick={() => setImageEditModalId(null)} className="p-2 hover:bg-white/5 rounded-full transition">
                                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-1 p-1 bg-black rounded-xl mb-6">
                                    {(['regenerate', 'edit', 'upload'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setImageEditTab(tab)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${imageEditTab === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 space-y-6">
                                    {imageEditTab === 'regenerate' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Generation Prompt</label>
                                                <textarea 
                                                    value={regeneratePrompt}
                                                    onChange={(e) => setRegeneratePrompt(e.target.value)}
                                                    className="w-full p-4 bg-black border border-white/10 rounded-2xl text-sm text-white focus:border-yellow-500/50 outline-none resize-none h-32"
                                                    placeholder="Describe the image you want to generate..."
                                                />
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const id = imageEditModalId;
                                                    if (id) {
                                                        setRegeneratingId(id);
                                                        handleRegenerate(id).then(() => setImageEditModalId(null));
                                                    }
                                                }}
                                                disabled={loadingImage}
                                                className="w-full py-4 bg-yellow-500 text-black font-bold rounded-2xl hover:bg-yellow-400 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2"
                                            >
                                                {loadingImage ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : null}
                                                Regenerate Image
                                            </button>
                                        </div>
                                    )}

                                    {imageEditTab === 'edit' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Edit Instructions</label>
                                                <textarea 
                                                    value={editPrompt}
                                                    onChange={(e) => setEditPrompt(e.target.value)}
                                                    className="w-full p-4 bg-black border border-white/10 rounded-2xl text-sm text-white focus:border-blue-500/50 outline-none resize-none h-32"
                                                    placeholder="e.g. 'Add a red hat', 'Change background to a forest'..."
                                                />
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const id = imageEditModalId;
                                                    if (id) {
                                                        setEditingImageId(id);
                                                        handleImageEdit(id).then(() => setImageEditModalId(null));
                                                    }
                                                }}
                                                disabled={loadingImage || !editPrompt}
                                                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2"
                                            >
                                                {loadingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                                Apply Edit
                                            </button>
                                        </div>
                                    )}

                                    {imageEditTab === 'upload' && (
                                        <div className="flex flex-col items-center justify-center h-full py-8 border-2 border-dashed border-white/10 rounded-3xl bg-black/20">
                                            <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <p className="text-sm text-zinc-400 mb-6">Replace current image with a file</p>
                                            <button 
                                                onClick={() => {
                                                    handleUploadClick(imageEditModalId, false);
                                                    setImageEditModalId(null);
                                                }}
                                                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition"
                                            >
                                                Choose File
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Character Lightbox Modal */}
            <AnimatePresence>
                {lightboxChar && (
                    <div 
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                        onClick={() => setLightboxChar(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-sm sm:max-w-md w-full bg-zinc-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl p-5 flex flex-col items-center"
                        >
                            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                <div>
                                    <h4 className="text-sm font-bold text-white">{lightboxChar.name}</h4>
                                    {lightboxChar.outfit && (
                                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{lightboxChar.outfit}</p>
                                    )}
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setLightboxChar(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {lightboxChar.imageUrl ? (
                                <img 
                                    src={lightboxChar.imageUrl} 
                                    alt={lightboxChar.name} 
                                    className="max-h-[60vh] w-auto object-contain rounded-2xl border border-white/10 shadow-lg"
                                />
                            ) : (
                                <div className="w-full h-48 flex items-center justify-center text-zinc-500 text-sm">
                                    No image available
                                </div>
                            )}
                            {lightboxChar.desc && (
                                <p className="text-xs text-zinc-400 mt-3 text-center line-clamp-3 leading-relaxed">
                                    {lightboxChar.desc}
                                </p>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Animate Modal */}
            <AnimatePresence>
                {animatingSegmentId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Segment Animation</h3>
                                    <p className="text-xs text-zinc-500">Choose how this image moves in the video</p>
                                </div>
                                <button onClick={() => setAnimatingSegmentId(null)} className="p-2 hover:bg-white/5 rounded-full transition">
                                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {(() => {
                                    const seg = segments.find((s: any) => s.id === animatingSegmentId);
                                    if (!seg) return null;
                                    const isVideo = seg.image_url?.toLowerCase().endsWith('.mp4');

                                    const idx = segments.findIndex((s: any) => s.id === animatingSegmentId);
                                    const rawDur = segmentDurations[idx] || 4;
                                    const rounded = Math.round(rawDur);
                                    let finalDur = 2;
                                    if (rounded === 3 || rounded === 4) finalDur = 2;
                                    else if (rounded === 5) finalDur = 3;
                                    else if (rounded === 6 || rounded === 7) finalDur = 4;
                                    else if (rounded === 8 || rounded === 9) finalDur = 5;
                                    else if (rounded === 10 || rounded === 11) finalDur = 6;
                                    else if (rounded > 11) finalDur = 7;
                                    else finalDur = 2;
                                    const animationCost = finalDur * 5;

                                    return (
                                        <div className="space-y-6">
                                            {/* Top: Animation Input */}
                                            {!isVideo && (
                                                <div className="bg-black border border-white/5 rounded-2xl p-4 md:p-6 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                                                            Animation Sequence
                                                            <span className="text-yellow-500 lowercase font-normal italic">Powered by Replicate AI</span>
                                                        </label>
                                                        <textarea 
                                                            value={animationPrompt}
                                                            onChange={(e) => setAnimationPrompt(e.target.value)}
                                                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-yellow-500 outline-none resize-none h-20"
                                                            placeholder="Describe how the scene should move..."
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3 relative">
                                                        <button 
                                                            onClick={isAnimating || !animationPrompt ? undefined : () => handleAnimate(animatingSegmentId!)}
                                                            disabled={isAnimating || !animationPrompt}
                                                            className="flex-1 h-12 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2 disabled:opacity-50 relative"
                                                        >
                                                            {isAnimating ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                                    Magic in progress...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Animate with AI
                                                                    <div className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-2 font-mono text-black/60">{animationCost} credits</div>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    {errorMessage && (
                                                        <div className="text-[10px] text-center font-bold text-red-500 animate-pulse">{errorMessage}</div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {EFFECT_TYPES.map((eff) => {
                                                    const idx = segments.findIndex((s: any) => s.id === animatingSegmentId);
                                                    const defaultSequenceKey = project.aspect_ratio === '16:9' ? 'minimalist' : 'cinematic';
                                                    const currentEffectArray = Array.isArray(effect) ? effect : (EFFECT_SEQUENCES[project.effect as keyof typeof EFFECT_SEQUENCES] || EFFECT_SEQUENCES[defaultSequenceKey]);
                                                    const isCurrent = currentEffectArray[idx % currentEffectArray.length] === eff.id;

                                                    return (
                                                        <button
                                                            key={eff.id}
                                                            onClick={() => handleSegmentEffectChange(idx, eff.id)}
                                                            className={`group relative flex flex-col text-left bg-black border rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${isCurrent ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-white/10 hover:border-white/20'}`}
                                                        >
                                                            <div className="aspect-video w-full bg-zinc-900 relative">
                                                                {seg?.image_url && (
                                                                    <EffectPreview 
                                                                        effectType={eff.id} 
                                                                        imageUrl={seg.image_url} 
                                                                        aspectRatio={project.aspect_ratio} 
                                                                    />
                                                                )}
                                                                {isCurrent && (
                                                                    <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1 rounded-full shadow-lg">
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-3">
                                                                <div className="text-xs font-bold text-white group-hover:text-yellow-500 transition-colors">{eff.name}</div>
                                                                <div className="text-[10px] text-zinc-500 line-clamp-1">{eff.description}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modals (Regenerate/Edit) - Reused from previous implementation */}
            {showAudioConfirmation && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-black rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 text-white">Regenerate Audio?</h3>
                        <p className="text-zinc-400 mb-6 text-sm">This will discard the current audio and generate a new one.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => { setShowAudioConfirmation(false); setErrorMessage(null); }} disabled={isGeneratingAssets} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                            <button onClick={confirmRegenerateVoice} disabled={isGeneratingAssets} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-yellow-600 text-black hover:bg-yellow-500">
                                {isGeneratingAssets ? `Generating... ${timer}s` : 'Confirm'}
                            </button>
                        </div>
                        {errorMessage && !isGeneratingAssets && (
                            <div className="mt-4 text-xs font-bold text-red-600 animate-pulse">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />

            {/* Upload Confirmation Modal */}
            {uploadConfirmSegmentId && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-black rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-white">Replace Image?</h3>
                        <p className="text-sm text-zinc-300 mb-6">
                            This segment already has an image. Uploading a new one will discard the existing image. Do you want to continue?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setUploadConfirmSegmentId(null)} className="px-4 py-2 font-bold text-zinc-400 hover:bg-black rounded-lg transition">Cancel</button>
                            <button onClick={handleConfirmUpload} className="px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-500">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Overlay Modal */}
            {showPricingModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-6 max-w-5xl w-full shadow-2xl relative animate-fade-in-up mt-auto mb-auto my-12 text-center">
                        <button 
                            onClick={() => setShowPricingModal(false)}
                            className="absolute top-6 right-6 p-2 bg-black hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-full transition"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Out of Credits!</h2>
                        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                            Choose a pack below to continue creating amazing content instantly.
                        </p>
                        
                        <CreatorPricingCards 
                            onAction={async (productId) => {
                                try {
                                    const { checkout_url } = await createCheckoutSession(productId);
                                    window.location.href = checkout_url;
                                } catch (e) {
                                    console.error(e);
                                    setNotification({ message: "Failed to initiate checkout", type: "error" });
                                }
                            }} 
                            actionLabel="Buy Pack" 
                        />
                    </div>
                </div>
            )}

            {/* Export Upgrade Modal */}
            {showExportUpgradeModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-fade-in-up text-center">
                        <button 
                            onClick={() => setShowExportUpgradeModal(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Upgrade to Export</h2>
                        <p className="text-zinc-300 mb-8 leading-relaxed">
                            Upgrade your plan to export this video in brilliant Ultra HD. Click the button below to view pricing and get your packs.
                        </p>
                        <button
                            onClick={() => {
                                setShowExportUpgradeModal(false);
                                if (onViewChange) onViewChange('creator-pricing');
                            }}
                            className="w-full py-4 bg-yellow-600 text-black rounded-xl font-black uppercase tracking-widest hover:bg-yellow-500 transition shadow-lg shadow-yellow-600/20"
                        >
                            View Pricing
                        </button>
                    </div>
                </div>
            )}
            {/* Avatar Selection Modal */}
            <AvatarModal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                userId={session.user.id}
                onSelectAvatar={handleSelectAvatar}
            />

            {/* Avatar Delete Confirm Modal */}
            <AnimatePresence>
                {avatarConfirmDeleteId && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setAvatarConfirmDeleteId(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-bold text-lg mb-2 text-white">Remove Avatar?</h3>
                            <p className="text-sm text-zinc-400 mb-6">
                                The avatar will no longer be included when this segment's image is regenerated.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAvatarConfirmDeleteId(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteAvatar(avatarConfirmDeleteId)}
                                    disabled={loadingImage}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {loadingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Remove"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* YouTube Metadata & Description Modal */}
            <AnimatePresence>
                {showMetadataModal && (
                    <div 
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setShowMetadataModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="bg-[#121214] border border-white/10 p-6 md:p-8 rounded-[28px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between pb-5 border-b border-white/10 shrink-0">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">YouTube Metadata</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1.5 ml-10">
                                        Generate an engaging, SEO-optimized description with timestamps and hashtags.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowMetadataModal(false)}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="py-5 space-y-5 overflow-y-auto pr-1">
                                {/* Title Input Section */}
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                                        Video Title <span className="text-red-500 font-bold">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={metadataTitle}
                                            onChange={(e) => setMetadataTitle(e.target.value)}
                                            placeholder="Enter your video title (e.g. 10 Secrets of Deep Space)..."
                                            className="flex-1 bg-black/60 border border-white/10 focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition"
                                        />
                                        <button
                                            onClick={handleGenerateDescription}
                                            disabled={isGeneratingDescription || !metadataTitle.trim()}
                                            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-yellow-500/10"
                                        >
                                            {isGeneratingDescription ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                    <span>Generating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M7.5 5.6L10 0l2.5 5.6L18 8l-5.5 2.4L10 16l-2.5-5.6L2 8l5.5-2.4zm12 9.4L21 12l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5zm-14 2L7 14l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" />
                                                    </svg>
                                                    <span>Generate</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Description Display / Edit Area */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                            Description Output
                                        </label>
                                        {metadataDescription && (
                                            <button
                                                onClick={handleCopyDescription}
                                                className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
                                            >
                                                {copiedDescription ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span className="text-green-400">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Copy</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            rows={11}
                                            value={metadataDescription}
                                            onChange={(e) => setMetadataDescription(e.target.value)}
                                            placeholder="Generated YouTube description with timestamps, keywords, and hashtags will appear here..."
                                            className="w-full bg-black/60 border border-white/10 focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 rounded-2xl p-4 text-xs md:text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition leading-relaxed resize-none font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                                <div className="text-[11px] text-zinc-500">
                                    {metadataDescription ? `${metadataDescription.length} characters` : ''}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowMetadataModal(false)}
                                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleSaveMetadata}
                                        disabled={isSavingMetadata}
                                        className="px-5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSavingMetadata ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <span>Save Changes</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full Prompt Lightbox Modal */}
            <AnimatePresence>
                {showPromptModal && (
                    <div 
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                        onClick={() => setShowPromptModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#121214] border border-white/10 p-6 md:p-7 rounded-[28px] w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white tracking-tight">Full Prompt</h3>
                                        <p className="text-xs text-zinc-400">Complete video generation prompt and parameters</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPromptModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="py-4 overflow-y-auto max-h-[50vh] pr-1 space-y-4">
                                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 md:p-5">
                                    <p className="text-sm md:text-[15px] text-zinc-100 font-normal leading-relaxed break-words whitespace-pre-wrap select-text">
                                        {activePromptText}
                                    </p>
                                </div>

                                {/* Metadata attributes if available */}
                                {(activePromptAspectRatio || activePromptStyle || activePromptAvatarUrl) && (
                                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                                        {activePromptAspectRatio && (
                                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                                                <span className="text-zinc-400 font-medium">Aspect Ratio:</span>
                                                <span className="text-white font-mono font-semibold">{activePromptAspectRatio}</span>
                                            </div>
                                        )}
                                        {activePromptStyle && (
                                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                                                <span className="text-zinc-400 font-medium">Style:</span>
                                                <span className="text-white capitalize font-semibold">{activePromptStyle}</span>
                                            </div>
                                        )}
                                        {activePromptAvatarUrl && (
                                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                                                <img src={activePromptAvatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                                                <span className="text-zinc-200 font-medium">Character Avatar Attached</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                                <span className="text-xs text-zinc-500 font-mono">
                                    {activePromptText.length} characters
                                </span>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyPrompt(activePromptText)}
                                        className="px-3.5 py-2 text-xs font-bold rounded-xl transition border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {copiedPrompt ? (
                                            <>
                                                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-green-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span>Copy Prompt</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPromptModal(false)}
                                        className="px-4 py-2 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition shadow-sm cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};