import React, { useEffect, useRef, useState, useMemo } from 'react';

import { CropOverlay, VideoTransform } from './CropOverlay';

interface DemoVideoPlayerProps {
    videoUrl: string;
    audioUrl: string | null;
    segments: any[];
    segmentDurations: number[];
    transcription: any | null;
    subtitleStyle: any;
    hookStyle: any;
    aspectRatio: '9:16' | '16:9';
    isPlaying: boolean;
    onPlayPause: () => void;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    videoTransform?: any;
    onVideoTransformChange?: (transform: any) => void;
    backgroundType: string;
}

const parseTime = (t: string | number) => {
    if (typeof t === 'number') return t;
    if (!t) return 0;
    const parts = t.toString().split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
};

export const DemoVideoPlayer: React.FC<DemoVideoPlayerProps> = ({
    videoUrl,
    audioUrl,
    segments,
    segmentDurations,
    transcription,
    subtitleStyle,
    hookStyle,
    aspectRatio,
    isPlaying,
    onPlayPause,
    currentTime,
    onTimeUpdate,
    videoTransform,
    onVideoTransformChange,
    backgroundType
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    const [showControls, setShowControls] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const isSeekingRef = useRef(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [subtitles, setSubtitles] = useState<any[]>([]);
    const hookMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
    const [containerRect, setContainerRect] = useState({ width: 0, height: 0 });
    const [isSelected, setIsSelected] = useState(false);

    // Local state for transforms to ensure smooth UI while dragging
    const [localTransform, setLocalTransform] = useState<any>(videoTransform || {});

    // Sync local transform when prop changes (e.g. from undo/redo)
    useEffect(() => {
        setLocalTransform(videoTransform || {});
    }, [videoTransform]);

    const visualTimeRef = useRef(currentTime);
    const lastTimestampRef = useRef(0);
    
    // Calculate segment timings
    const segmentTimings = useMemo(() => {
        let currentAudioTime = 0;
        return segments.map((seg, i) => {
            const audioDuration = segmentDurations[i] || 0;
            const audioStart = currentAudioTime;
            const audioEnd = currentAudioTime + audioDuration;
            currentAudioTime = audioEnd;
            
            const videoStart = parseTime(seg.video_start || 0);
            const videoEnd = parseTime(seg.video_end || 0);
            const videoDuration = videoEnd - videoStart;
            
            return {
                ...seg,
                audioStart,
                audioEnd,
                audioDuration,
                videoStart,
                videoEnd,
                videoDuration
            };
        });
    }, [segments, segmentDurations]);

    const totalDuration = segmentTimings.length > 0 ? segmentTimings[segmentTimings.length - 1].audioEnd : 0;

    const onPlayPauseRef = useRef(onPlayPause);
    const isPlayingRef = useRef(isPlaying);
    const isSeekingStateRef = useRef(isSeeking);
    const onTimeUpdateRef = useRef(onTimeUpdate);

    useEffect(() => {
        onPlayPauseRef.current = onPlayPause;
        isPlayingRef.current = isPlaying;
        isSeekingStateRef.current = isSeeking;
        onTimeUpdateRef.current = onTimeUpdate;
    }, [onPlayPause, isPlaying, isSeeking, onTimeUpdate]);

    const [hookMediaLoaded, setHookMediaLoaded] = useState(false);

    // Load Hook Media
    useEffect(() => {
        setHookMediaLoaded(false);
        if (hookStyle?.style === 'media' && hookStyle?.media) {
            const url = hookStyle.media;
            const cleanUrl = url.split('?')[0];
            if (cleanUrl.match(/\.(mp4|webm|mov)$/i)) {
                const v = document.createElement('video');
                v.src = url;
                v.muted = false;
                v.playsInline = true;
                v.onloadedmetadata = () => setHookMediaLoaded(true);
                v.load();
                hookMediaRef.current = v;
            } else {
                const img = new Image();
                img.onload = () => setHookMediaLoaded(true);
                img.src = url;
                hookMediaRef.current = img;
            }
        } else {
            hookMediaRef.current = null;
        }
    }, [hookStyle]);

    // Load Audio
    useEffect(() => {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        const handleTimeUpdate = () => {
            if (!isSeekingStateRef.current) {
                onTimeUpdateRef.current(audio.currentTime);
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', () => {
            if (isPlayingRef.current) onPlayPauseRef.current();
            setShowControls(true);
        });

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl]);

    // Sync Play/Pause
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(console.error);
                videoRef.current?.play().catch(console.error);
            } else {
                audioRef.current.pause();
                videoRef.current?.pause();
            }
        }
    }, [isPlaying]);

    // Sync Video to Audio Time is now handled in the render loop

    // Parse Subtitles
    useEffect(() => {
        if (!transcription || !transcription.words) return;
        
        const animationType = subtitleStyle?.animationType || 'pulse_bold';
        const isFade = animationType === 'glow_focus';
        const threshold = isFade ? 0.8 : 0.3;
        const maxCharsPerLine = aspectRatio === '16:9' ? 45 : 22;
        
        const defaultMaxWords = animationType === 'karaoke_block' ? 3 : (animationType === 'fade_group' ? 5 : (animationType === 'karaoke_bounce' ? 1 : 99));
        const maxWords = subtitleStyle?.maxWords !== undefined ? subtitleStyle.maxWords : defaultMaxWords;
        
        const lines: any[] = [];
        let group: any[] = [];

        transcription.words.forEach((word: any) => {
            const w = {
                text: word.text,
                start: word.start / 1000,
                end: word.end / 1000
            };

            let shouldGroup = true;
            if (group.length > 0) {
                const prevWord = group[group.length - 1];
                const gap = w.start - prevWord.end;
                const currentLineLength = group.map((g: any) => g.text).join(' ').length;
                
                if (gap > threshold || (currentLineLength + w.text.length > maxCharsPerLine) || group.length >= maxWords) {
                    shouldGroup = false;
                }
            }

            if (shouldGroup) {
                group.push(w);
            } else {
                lines.push({
                    start: group[0].start,
                    end: group[group.length - 1].end,
                    words: group
                });
                group = [w];
            }
        });
        
        if (group.length > 0) {
            lines.push({
                start: group[0].start,
                end: group[group.length - 1].end,
                words: group
            });
        }
        
        setSubtitles(lines);
        setIsLoaded(true);
    }, [transcription, subtitleStyle, aspectRatio]);

    // Track container size
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerRect({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const drawVideoWithTransform = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement | HTMLImageElement, cw: number, ch: number, transform?: VideoTransform) => {
        const vw = video instanceof HTMLVideoElement ? video.videoWidth : (video as HTMLImageElement).naturalWidth;
        const vh = video instanceof HTMLVideoElement ? video.videoHeight : (video as HTMLImageElement).naturalHeight;
        if (vw === 0 || vh === 0) return;

        const t = transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
        
        // Fallback for old scale property
        const scX = t.scaleX !== undefined ? t.scaleX : (t.scale || 1);
        const scY = t.scaleY !== undefined ? t.scaleY : (t.scale || 1);

        const fitScale = Math.min(cw / vw, ch / vh);
        const actualScaleX = fitScale * scX;
        const actualScaleY = fitScale * scY;

        const scaledW = vw * actualScaleX;
        const scaledH = vh * actualScaleY;

        const centerX = cw / 2 + (t.x || 0);
        const centerY = ch / 2 + (t.y || 0);

        const drawX = centerX - scaledW / 2;
        const drawY = centerY - scaledH / 2;

        const sX = vw * (t.cropLeft || 0);
        const sY = vh * (t.cropTop || 0);
        const sW = vw * (1 - (t.cropLeft || 0) - (t.cropRight || 0));
        const sH = vh * (1 - (t.cropTop || 0) - (t.cropBottom || 0));

        const dX = drawX + scaledW * (t.cropLeft || 0);
        const dY = drawY + scaledH * (t.cropTop || 0);
        const dW = scaledW * (1 - (t.cropLeft || 0) - (t.cropRight || 0));
        const dH = scaledH * (1 - (t.cropTop || 0) - (t.cropBottom || 0));

        if (sW > 0 && sH > 0 && dW > 0 && dH > 0) {
            ctx.drawImage(video, sX, sY, sW, sH, dX, dY, dW, dH);
        }
    };

    // Render Loop
    const currentSegment = segmentTimings.find(s => currentTime >= s.audioStart && currentTime <= s.audioEnd) || segmentTimings[0];
    const isHook = currentSegment?.isHook;

    // Get the correct transform for a segment
    const getTransformForSegment = (seg: any) => {
        const t = localTransform || {};
        if (seg?.isHook) {
            return t.hook || { x: 0, y: 0, scaleX: 1, scaleY: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
        }
        if (t.segments) return t.segments;
        if (t.x !== undefined || t.scaleX !== undefined || t.scale !== undefined) {
            return {
                x: t.x || 0,
                y: t.y || 0,
                scaleX: t.scaleX !== undefined ? t.scaleX : (t.scale || 1),
                scaleY: t.scaleY !== undefined ? t.scaleY : (t.scale || 1),
                cropTop: t.cropTop || 0,
                cropBottom: t.cropBottom || 0,
                cropLeft: t.cropLeft || 0,
                cropRight: t.cropRight || 0
            };
        }
        return { x: 0, y: 0, scaleX: 1, scaleY: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
    };

    // Get the correct transform for the current view
    const getCurrentTransform = () => {
        return getTransformForSegment(currentSegment);
    };

    const handleTransformChange = (newT: any) => {
        const updatedTransform = { ...(localTransform || {}) };
        if (isHook) {
            updatedTransform.hook = newT;
        } else {
            updatedTransform.segments = newT;
        }
        setLocalTransform(updatedTransform);
    };

    const handleTransformChangeEnd = (newT: any) => {
        const updatedTransform = { ...(localTransform || {}) };
        if (isHook) {
            updatedTransform.hook = newT;
        } else {
            updatedTransform.segments = newT;
        }
        if (onVideoTransformChange) {
            onVideoTransformChange(updatedTransform);
        }
    };

    const render = (timestamp: number) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const elapsed = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;

        let drawTime;
        if (isPlaying && audioRef.current) {
            const audioTime = audioRef.current.currentTime;
            if (Math.abs(audioTime - visualTimeRef.current) > 0.15) {
                visualTimeRef.current = audioTime;
            } else {
                visualTimeRef.current += elapsed;
                visualTimeRef.current += (audioTime - visualTimeRef.current) * 0.1;
            }
            drawTime = Math.max(0, Math.min(totalDuration, visualTimeRef.current));
        } else {
            drawTime = currentTime;
            visualTimeRef.current = drawTime;
        }

        if (video.readyState < 1) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Background
        const bgType = backgroundType || 'white';
        if (bgType === 'white') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgType === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (['blue', 'purple', 'green', 'red', 'grid'].includes(bgType)) {
            if (bgType === 'blue') ctx.fillStyle = '#3B82F6';
            else if (bgType === 'purple') ctx.fillStyle = '#8B5CF6';
            else if (bgType === 'green') ctx.fillStyle = '#10B981';
            else if (bgType === 'red') ctx.fillStyle = '#EF4444';
            else if (bgType === 'grid') ctx.fillStyle = '#FFFFFF';
            
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = bgType === 'grid' ? '#E5E7EB' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            const gridSize = 40;
            ctx.beginPath();
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();
        } else if (bgType === 'blur') {
            ctx.save();
            ctx.filter = 'blur(40px) brightness(0.7)';
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw > 0 && vh > 0) {
                const scale = Math.max(canvas.width / vw, canvas.height / vh);
                const x = (canvas.width - vw * scale) / 2;
                const y = (canvas.height - vh * scale) / 2;
                ctx.drawImage(video, x, y, vw * scale, vh * scale);
            } else {
                ctx.fillStyle = '#333333';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        const currentSegment = segmentTimings.find(s => drawTime >= s.audioStart && drawTime <= s.audioEnd) || 
                             segmentTimings.find(s => drawTime <= s.audioEnd) || 
                             segmentTimings[0];
        const isHook = currentSegment?.isHook;
        const hStyle = typeof hookStyle === 'string' ? hookStyle : (hookStyle?.style || 'blurred');

        // Video Sync Logic
        if (currentSegment) {
            if (isHook) {
                if (!video.paused) video.pause();
                if (Math.abs(video.currentTime - currentSegment.videoStart) > 0.1) {
                    video.currentTime = currentSegment.videoStart;
                }

                // Sync hook video if it's a media style
                if (hStyle === 'media' && hookMediaRef.current instanceof HTMLVideoElement) {
                    const media = hookMediaRef.current;
                    const audioDuration = currentSegment.audioDuration;
                    const videoDuration = media.duration || 0;
                    const requiredRate = videoDuration / Math.max(0.001, audioDuration);
                    let targetVideoTime = (drawTime - currentSegment.audioStart) * requiredRate;
                    targetVideoTime = Math.min(videoDuration, targetVideoTime);

                    if (!isPlaying || isSeekingRef.current) {
                        if (!media.paused) media.pause();
                        if (Math.abs(media.currentTime - targetVideoTime) > 0.1) {
                            media.currentTime = targetVideoTime;
                        }
                    } else {
                        if (requiredRate < 0.1 || targetVideoTime >= videoDuration) {
                            if (!media.paused) media.pause();
                            if (Math.abs(media.currentTime - targetVideoTime) > 0.1) {
                                media.currentTime = targetVideoTime;
                            }
                        } else {
                            if (media.paused) media.play().catch(console.error);
                            const safeRate = Math.max(0.1, Math.min(4.0, requiredRate));
                            if (Math.abs(media.playbackRate - safeRate) > 0.01) {
                                media.playbackRate = safeRate;
                            }
                            if (Math.abs(media.currentTime - targetVideoTime) > 0.25) {
                                media.currentTime = targetVideoTime;
                            }
                        }
                    }
                }
            } else {
                const audioDuration = currentSegment.audioDuration;
                const videoDuration = currentSegment.videoDuration;
                let targetVideoTime;
                let requiredRate = 1.0;

                if (videoDuration < audioDuration) {
                    // Normal speed, then freeze
                    targetVideoTime = currentSegment.videoStart + (drawTime - currentSegment.audioStart);
                    targetVideoTime = Math.min(currentSegment.videoEnd, targetVideoTime);
                } else {
                    // Speed up
                    requiredRate = videoDuration / Math.max(0.001, audioDuration);
                    targetVideoTime = currentSegment.videoStart + (drawTime - currentSegment.audioStart) * requiredRate;
                    targetVideoTime = Math.min(currentSegment.videoEnd, targetVideoTime);
                }

                if (!isPlaying || isSeekingRef.current) {
                    if (!video.paused) video.pause();
                    if (Math.abs(video.currentTime - targetVideoTime) > 0.1) {
                        video.currentTime = targetVideoTime;
                    }
                } else {
                    if (requiredRate < 0.1 || targetVideoTime >= currentSegment.videoEnd) {
                        if (!video.paused) video.pause();
                        if (Math.abs(video.currentTime - targetVideoTime) > 0.1) {
                            video.currentTime = targetVideoTime;
                        }
                    } else {
                        if (video.paused) video.play().catch(console.error);
                        const safeRate = Math.max(0.1, Math.min(4.0, requiredRate));
                        if (Math.abs(video.playbackRate - safeRate) > 0.01) {
                            video.playbackRate = safeRate;
                        }
                        if (Math.abs(video.currentTime - targetVideoTime) > 0.25) {
                            video.currentTime = targetVideoTime;
                        }
                    }
                }
            }
        }

        // Draw Video Frame
        const transform = getTransformForSegment(currentSegment);
        
        if (isHook && hStyle === 'media' && hookMediaRef.current) {
            const media = hookMediaRef.current;
            drawVideoWithTransform(ctx, media, canvas.width, canvas.height, transform);
        } else {
            // Normal segment or non-media hook
            // We draw the main video if it has dimensions, regardless of readyState to prevent flickering
            if (video.videoWidth > 0) {
                drawVideoWithTransform(ctx, video, canvas.width, canvas.height, transform);
            }
        }

        // Draw Subtitles
        const currentSubtitle = subtitles.find(s => drawTime >= s.start && drawTime <= s.end);
        if (currentSubtitle) {
            const { 
                fontFamily = 'Inter', 
                fontSize = 60, 
                primaryColor = '#FFFFFF', 
                secondaryColor = '#000000', 
                highlightColor = '#EAB308',
                strokeWidth = 8,
                placement = 'middle'
            } = subtitleStyle || {};

            ctx.font = `900 ${fontSize}px "${fontFamily}"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
            
            let x = canvas.width / 2;
            // placement is a number from 0 to 100 representing percentage from bottom
            let y = canvas.height * (1 - (typeof placement === 'number' ? placement : 15) / 100);

            const words = currentSubtitle.words;
            const textTransform = subtitleStyle?.textTransform || 'uppercase';
            const text = words.map((w: any) => {
                let t = w.text;
                if (textTransform === 'uppercase') t = t.toUpperCase();
                else if (textTransform === 'lowercase') t = t.toLowerCase();
                else if (textTransform === 'capitalize') t = t.replace(/\b\w/g, (l: string) => l.toUpperCase());
                return t;
            }).join(' ');
            
            // Draw shadow/stroke
            ctx.strokeStyle = secondaryColor;
            ctx.strokeText(text, x, y);
            
            // Draw main text with highlight
            let currentX = x - ctx.measureText(text).width / 2;
            words.forEach((w: any, i: number) => {
                let wordText = w.text;
                if (textTransform === 'uppercase') wordText = wordText.toUpperCase();
                else if (textTransform === 'lowercase') wordText = wordText.toLowerCase();
                else if (textTransform === 'capitalize') wordText = wordText.replace(/\b\w/g, (l: string) => l.toUpperCase());
                
                wordText += (i < words.length - 1 ? ' ' : '');
                const wordWidth = ctx.measureText(wordText).width;
                
                const isActive = drawTime >= w.start && drawTime < w.end;
                ctx.fillStyle = isActive ? highlightColor : primaryColor;
                
                ctx.fillText(wordText, currentX + wordWidth / 2, y);
                currentX += wordWidth;
            });
        }

        requestRef.current = requestAnimationFrame(render);
    };

    useEffect(() => {
        lastTimestampRef.current = 0;
        requestRef.current = requestAnimationFrame(render);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, currentTime, segmentTimings, subtitles, subtitleStyle, hookStyle, hookMediaLoaded, backgroundType]);

    // Resize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (aspectRatio === '9:16') {
            canvas.width = 1080;
            canvas.height = 1920;
        } else {
            canvas.width = 1920;
            canvas.height = 1080;
        }
    }, [aspectRatio]);

    let videoScreenStyle: React.CSSProperties = { left: 0, top: 0, width: '100%', height: '100%' };
    if (videoRef.current && containerRect.width > 0) {
        const cw = aspectRatio === '9:16' ? 1080 : 1920;
        const ch = aspectRatio === '9:16' ? 1920 : 1080;
        const vw = videoRef.current.videoWidth || cw;
        const vh = videoRef.current.videoHeight || ch;
        
        const scaleX = containerRect.width / cw;
        const scaleY = containerRect.height / ch;
        
        const t = videoTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
        const scX = t.scaleX !== undefined ? t.scaleX : (t.scale || 1);
        const scY = t.scaleY !== undefined ? t.scaleY : (t.scale || 1);

        const fitScale = Math.min(cw / vw, ch / vh);
        const actualScaleX = fitScale * scX;
        const actualScaleY = fitScale * scY;

        const scaledW = vw * actualScaleX;
        const scaledH = vh * actualScaleY;

        const centerX = cw / 2 + (t.x || 0);
        const centerY = ch / 2 + (t.y || 0);

        const drawX = centerX - scaledW / 2;
        const drawY = centerY - scaledH / 2;

        const dX = drawX + scaledW * (t.cropLeft || 0);
        const dY = drawY + scaledH * (t.cropTop || 0);
        const dW = scaledW * (1 - (t.cropLeft || 0) - (t.cropRight || 0));
        const dH = scaledH * (1 - (t.cropTop || 0) - (t.cropBottom || 0));

        videoScreenStyle = {
            left: dX * scaleX,
            top: dY * scaleY,
            width: dW * scaleX,
            height: dH * scaleY
        };
    }

    const currentMediaWidth = isHook 
        ? (hookMediaRef.current instanceof HTMLVideoElement ? hookMediaRef.current.videoWidth : (hookMediaRef.current instanceof HTMLImageElement ? hookMediaRef.current.naturalWidth : 1920))
        : (videoRef.current?.videoWidth || 1920);
    const currentMediaHeight = isHook 
        ? (hookMediaRef.current instanceof HTMLVideoElement ? hookMediaRef.current.videoHeight : (hookMediaRef.current instanceof HTMLImageElement ? hookMediaRef.current.naturalHeight : 1080))
        : (videoRef.current?.videoHeight || 1080);

    return (
        <div 
            className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-900"
            onPointerDown={() => setIsSelected(false)}
        >
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative min-h-0">
                <div 
                    ref={containerRef}
                    className="relative shadow-2xl overflow-hidden bg-white flex items-center justify-center shrink-0"
                    style={{ 
                        aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                        maxHeight: '80%',
                        maxWidth: '80%'
                    }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <canvas 
                        ref={canvasRef} 
                        className="w-full h-full object-contain"
                        onPointerDown={() => setIsSelected(false)}
                    />
                    
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="hidden"
                        muted
                        playsInline
                        onLoadedMetadata={() => setIsLoaded(true)}
                    />

                    {/* Crop Overlay */}
                    {onVideoTransformChange && videoRef.current && canvasRef.current && containerRect.width > 0 && (
                        <div className="absolute inset-0 z-40 pointer-events-none">
                            <CropOverlay 
                                transform={getCurrentTransform()}
                                onChange={handleTransformChange}
                                onChangeEnd={handleTransformChangeEnd}
                                canvasWidth={canvasRef.current.width}
                                canvasHeight={canvasRef.current.height}
                                videoWidth={currentMediaWidth}
                                videoHeight={currentMediaHeight}
                                containerWidth={containerRect.width}
                                containerHeight={containerRect.height}
                                isSelected={isSelected}
                                onSelect={() => setIsSelected(true)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* General Play Button Section Under Canvas */}
            <div 
                className="h-20 bg-zinc-950 border-t border-white/10 flex items-center px-6 gap-6 shrink-0 z-50"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <button 
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-all transform hover:scale-105 shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlayPause();
                    }}
                >
                    {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                    ) : (
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>

                <div className="flex-1 flex items-center gap-4">
                    <span className="text-zinc-400 text-sm font-mono w-12 text-right">
                        {formatTime(currentTime)}
                    </span>
                    <input 
                        type="range" 
                        min={0} 
                        max={totalDuration || 100} 
                        step={0.01}
                        value={currentTime}
                        onChange={(e) => {
                            const time = parseFloat(e.target.value);
                            onTimeUpdate(time);
                            if (audioRef.current) audioRef.current.currentTime = time;
                        }}
                        onMouseDown={() => { setIsSeeking(true); isSeekingRef.current = true; }}
                        onMouseUp={() => { setIsSeeking(false); isSeekingRef.current = false; }}
                        className="flex-1 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 transition-all"
                    />
                    <span className="text-zinc-400 text-sm font-mono w-12">
                        {formatTime(totalDuration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};
