import React, { useEffect, useRef, useState, useMemo } from 'react';

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
    onTimeUpdate
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
                
                if (gap > threshold || (currentLineLength + w.text.length > maxCharsPerLine)) {
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

    // Render Loop
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
            drawTime = visualTimeRef.current;
        } else {
            drawTime = currentTime;
            visualTimeRef.current = drawTime;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentSegment = segmentTimings.find(s => drawTime >= s.audioStart && drawTime <= s.audioEnd);
        const isHook = currentSegment?.isHook;
        const hStyle = typeof hookStyle === 'string' ? hookStyle : (hookStyle?.style || 'blurred');

        // Video Sync Logic
        if (currentSegment) {
            if (isHook) {
                if (!video.paused) video.pause();
                if (Math.abs(video.currentTime - currentSegment.videoStart) > 0.1) {
                    video.currentTime = currentSegment.videoStart;
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
        if (isHook) {
            if (hStyle === 'white') {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (hStyle === 'black') {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (hStyle === 'media' && hookMediaRef.current) {
                const media = hookMediaRef.current;
                if (media instanceof HTMLVideoElement) {
                    // Sync hook video
                    const audioDuration = currentSegment.audioDuration;
                    const videoDuration = media.duration || 0;
                    
                    // Adjust speed to match segment duration exactly
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

                    // Draw video
                    const vw = media.videoWidth;
                    const vh = media.videoHeight;
                    const cw = canvas.width;
                    const ch = canvas.height;
                    if (vw > 0 && vh > 0) {
                        const scale = Math.max(cw / vw, ch / vh);
                        const x = (cw - vw * scale) / 2;
                        const y = (ch - vh * scale) / 2;
                        ctx.drawImage(media, x, y, vw * scale, vh * scale);
                    }
                } else {
                    // Draw image
                    const img = media as HTMLImageElement;
                    const vw = img.naturalWidth;
                    const vh = img.naturalHeight;
                    const cw = canvas.width;
                    const ch = canvas.height;
                    if (vw > 0 && vh > 0) {
                        const baseScale = Math.max(cw / vw, ch / vh);
                        
                        // Animation logic
                        const segmentTime = drawTime - currentSegment.audioStart;
                        const duration = currentSegment.audioDuration;
                        const progress = Math.min(segmentTime / duration, 1);
                        
                        let scale = 1;
                        let offsetX = 0;
                        let offsetY = 0;
                        
                        const iw_visible = cw / baseScale;
                        const ih_visible = ch / baseScale;
                        
                        const animation = hookStyle?.animation || 'none';
                        
                        switch (animation) {
                            case 'zoom_in':
                                scale = 1.0 + (progress * 0.5);
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                            case 'zoom_out':
                                scale = 1.8 - (progress * 0.5);
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                            case 'slow_zoom_in':
                                scale = 1.0 + (progress * 0.4);
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                            case 'slide_left':
                                scale = 1.15;
                                offsetX = (1 - progress) * (vw - iw_visible / scale);
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                            case 'slide_right':
                                scale = 1.15;
                                offsetX = progress * (vw - iw_visible / scale);
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                            case 'slide_up':
                                scale = 1.2;
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = (1 - progress) * (vh - ih_visible / scale);
                                break;
                            case 'slide_down':
                                scale = 1.2;
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = progress * (vh - ih_visible / scale);
                                break;
                            case 'slide_up_left':
                                scale = 1.2;
                                offsetX = (1 - progress) * (vw - iw_visible / scale);
                                offsetY = (1 - progress) * (vh - ih_visible / scale);
                                break;
                            case 'slide_up_right':
                                scale = 1.2;
                                offsetX = progress * (vw - iw_visible / scale);
                                offsetY = (1 - progress) * (vh - ih_visible / scale);
                                break;
                            case 'slide_down_left':
                                scale = 1.2;
                                offsetX = (1 - progress) * (vw - iw_visible / scale);
                                offsetY = progress * (vh - ih_visible / scale);
                                break;
                            case 'slide_down_right':
                                scale = 1.2;
                                offsetX = progress * (vw - iw_visible / scale);
                                offsetY = progress * (vh - ih_visible / scale);
                                break;
                            case 'handheld_walk':
                                scale = 1.1;
                                offsetX = ((vw - iw_visible / scale) / 2) + Math.sin(progress * Math.PI * 8) * 20;
                                offsetY = ((vh - ih_visible / scale) / 2) + Math.cos(progress * Math.PI * 16) * 10;
                                break;
                            default: // 'none'
                                scale = 1;
                                offsetX = (vw - iw_visible / scale) / 2;
                                offsetY = (vh - ih_visible / scale) / 2;
                                break;
                        }
                        
                        const finalScale = baseScale * scale;
                        const drawX = (cw - vw * finalScale) / 2 + (offsetX * finalScale) - (offsetX * baseScale);
                        const drawY = (ch - vh * finalScale) / 2 + (offsetY * finalScale) - (offsetY * baseScale);

                        ctx.drawImage(img, drawX, drawY, vw * finalScale, vh * finalScale);
                    }
                }
            } else {
                // blur or default
                ctx.save();
                ctx.filter = 'blur(10px) brightness(0.5)';
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                const cw = canvas.width;
                const ch = canvas.height;
                if (vw > 0 && vh > 0) {
                    const scale = Math.max(cw / vw, ch / vh);
                    const x = (cw - vw * scale) / 2;
                    const y = (ch - vh * scale) / 2;
                    ctx.drawImage(video, x, y, vw * scale, vh * scale);
                }
                ctx.restore();
            }
        } else {
            // Normal segment
            ctx.save();
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cw = canvas.width;
            const ch = canvas.height;
            
            if (vw > 0 && vh > 0) {
                const scale = Math.max(cw / vw, ch / vh);
                const x = (cw - vw * scale) / 2;
                const y = (ch - vh * scale) / 2;
                ctx.drawImage(video, x, y, vw * scale, vh * scale);
            }
            ctx.restore();
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
                ctx.fillStyle = isActive ? highlightColor : (isHook && hStyle === 'white' ? '#000000' : primaryColor);
                
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
    }, [isPlaying, currentTime, segmentTimings, subtitles, subtitleStyle, hookStyle, hookMediaLoaded]);

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

    return (
        <div className="w-full h-full flex items-center justify-center relative bg-zinc-950">
            <div 
                ref={containerRef}
                className="relative shadow-2xl overflow-hidden bg-black flex items-center justify-center cursor-pointer"
                style={{ 
                    aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                    maxHeight: '90%',
                    maxWidth: '90%'
                }}
                onClick={() => setShowControls(true)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-full object-contain"
                />
                
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="hidden"
                    muted
                    playsInline
                    onLoadedMetadata={() => setIsLoaded(true)}
                />

                {/* Controls Overlay */}
                <div 
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex flex-col justify-end z-30
                        ${(showControls || isHovering || !isPlaying) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button 
                            className="pointer-events-auto w-20 h-20 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all transform hover:scale-105"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPlayPause();
                            }}
                        >
                            {isPlaying ? (
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                            ) : (
                                <svg className="w-10 h-10 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                    </div>

                    <div className="p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
                        <div className="flex items-center gap-4">
                            <span className="text-white text-sm font-mono">
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
                                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-yellow-500"
                            />
                            <span className="text-white text-sm font-mono">
                                {formatTime(totalDuration)}
                            </span>
                        </div>
                    </div>
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
