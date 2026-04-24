import React, { useEffect, useRef, useState, useMemo } from 'react';

interface ContentVideoPlayerProps {
    segments: any[];
    audioUrl: string | null;
    transcription: any | null; 
    segmentDurations: number[];
    aspectRatio: '9:16' | '16:9';
    effect: any; // Video effect
    subtitleStyle: any;
    subtitleState?: 'enabled' | 'disabled';
    isPlaying: boolean;
    onPlayPause: () => void;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    onLoadComplete?: () => void;
}

export const EFFECT_TYPES = [
    { id: 'none', name: 'None', description: 'Static frame' },
    { id: 'zoom_in', name: 'Zoom In', description: 'Slow push in' },
    { id: 'zoom_out', name: 'Zoom Out', description: 'Slow pull out' },
    { id: 'slow_zoom_in', name: 'Cinematic Zoom', description: 'Very slow push in' },
    { id: 'slide_left', name: 'Pan Left', description: 'Slide camera left' },
    { id: 'slide_right', name: 'Pan Right', description: 'Slide camera right' },
    { id: 'slide_up', name: 'Pan Up', description: 'Slide camera up' },
    { id: 'slide_down', name: 'Pan Down', description: 'Slide camera down' },
    { id: 'slide_up_left', name: 'Pan Up Left', description: 'Slide camera up and left' },
    { id: 'slide_up_right', name: 'Pan Up Right', description: 'Slide camera up and right' },
    { id: 'slide_down_left', name: 'Pan Down Left', description: 'Slide camera down and left' },
    { id: 'slide_down_right', name: 'Pan Down Right', description: 'Slide camera down and right' },
    { id: 'handheld_walk', name: 'Handheld Walk', description: 'Natural walking motion' },
    { id: 'cinematic_drift', name: 'Cinematic Drift', description: 'Slow horizontal slider motion' },
    { id: 'doc_push', name: 'Documentary Push', description: 'Subtle cinematic push in' },
    { id: 'organic_float', name: 'Organic Float', description: 'Subtle breathing camera motion' },
    { id: 'dolly_reveal', name: 'Slow Dolly Reveal', description: 'Slow pull out reveal' }
];

export const EFFECT_SEQUENCES = {
    'none': ['none'],
    'zoom_pulse': ['zoom_in', 'zoom_out'],
    'slide_flow': ['slide_down', 'slide_right', 'slide_up', 'slide_left', 'slide_up_left', 'slide_up_right', 'slide_down_left', 'slide_down_right'],
    'cinematic': ['slow_zoom_in'],
    'chaos': ['zoom_in', 'slide_left', 'zoom_out', 'slide_right', 'slide_up'],
    'handheld_walk': ['handheld_walk'],
    'documentary': ['doc_push', 'cinematic_drift', 'none', 'doc_push'],
    'immersive': ['organic_float', 'dolly_reveal', 'organic_float'],
    'storyteller': ['dolly_reveal', 'doc_push', 'cinematic_drift'],
    'minimalist': ['none', 'doc_push', 'none']
};

export const ContentVideoPlayer: React.FC<ContentVideoPlayerProps> = ({
    segments,
    audioUrl,
    transcription,
    segmentDurations,
    aspectRatio,
    effect,
    subtitleStyle,
    subtitleState = 'enabled',
    isPlaying,
    onPlayPause,
    currentTime,
    onTimeUpdate,
    onLoadComplete
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const requestRef = useRef<number | null>(null);
    const [media, setMedia] = useState<(HTMLImageElement | HTMLVideoElement)[]>([]);
    const [subtitles, setSubtitles] = useState<any[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoadingMedia, setIsLoadingMedia] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentTimeRef = useRef(currentTime);
    const visualTimeRef = useRef(currentTime);
    const lastTimestampRef = useRef(0);
    const mediaCacheRef = useRef<Record<string, HTMLImageElement | HTMLVideoElement>>({});

    useEffect(() => {
        currentTimeRef.current = currentTime;
        if (!isPlaying) visualTimeRef.current = currentTime;
    }, [currentTime, isPlaying]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowControls(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onPlayPauseRef = useRef(onPlayPause);
    const isPlayingRef = useRef(isPlaying);

    useEffect(() => {
        onPlayPauseRef.current = onPlayPause;
        isPlayingRef.current = isPlaying;
    }, [onPlayPause, isPlaying]);

    // 1. Load Audio
    useEffect(() => {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.addEventListener('timeupdate', () => {
            onTimeUpdate(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
            // Only toggle if we are currently playing to avoid double-toggles
            if (isPlayingRef.current) {
                onPlayPauseRef.current();
            }
            setShowControls(true);
        });

        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl]);

    // 2. Play/Pause Control
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Play failed", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    // 3. Sync Time (Seek)
    useEffect(() => {
        if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 0.1) {
            audioRef.current.currentTime = currentTime;
        }
    }, [currentTime]);

    // 4. Load Media (Images or Videos)
    useEffect(() => {
        let isMounted = true;
        setIsLoadingMedia(true);
        const loadMedia = async () => {
            const loadedMedia = await Promise.all(segments.map(seg => {
                const url = seg.image_url || '';
                
                if (mediaCacheRef.current[url]) {
                    return Promise.resolve(mediaCacheRef.current[url]);
                }
                
                const isVideo = url.toLowerCase().includes('.mp4');

                return new Promise<HTMLImageElement | HTMLVideoElement>((resolve) => {
                    let videoElement: any;
                    let imgElement: any;

                    const fallbackTimeoutId = setTimeout(() => {
                        console.warn("Media load timeout fallback for:", url);
                        if (isVideo) {
                            mediaCacheRef.current[url] = videoElement;
                            resolve(videoElement);
                        } else {
                            mediaCacheRef.current[url] = imgElement;
                            resolve(imgElement);
                        }
                    }, 5000); // 5s timeout to prevent Editor hanging indefinitely

                    if (isVideo) {
                        const video = document.createElement('video');
                        videoElement = video;
                        video.preload = "auto";
                        video.muted = true;
                        video.playsInline = true;
                        
                        video.onloadeddata = () => {
                            clearTimeout(fallbackTimeoutId);
                            mediaCacheRef.current[url] = video;
                            resolve(video);
                        };
                        video.onerror = (e) => {
                            clearTimeout(fallbackTimeoutId);
                            console.error("Video load failed", url, e);
                            resolve(video);
                        };
                        
                        video.src = url;
                        video.load();
                    } else {
                        const img = new Image();
                        imgElement = img;
                        let resolved = false;
                        
                        const handleResolve = () => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(fallbackTimeoutId);
                                mediaCacheRef.current[url] = img;
                                resolve(img);
                            }
                        };
                        
                        img.onload = handleResolve;
                        img.onerror = handleResolve;
                        
                        img.src = url;
                        // Avoid blocking if image is already cached and complete
                        if (img.complete) {
                            handleResolve();
                        }
                    }
                });
            }));
            if (isMounted) {
                setMedia(loadedMedia);
                setIsLoadingMedia(false);
                
                // Cleanup old cached media to prevent memory leaks
                const currentUrls = new Set(segments.map(seg => seg.image_url || ''));
                Object.keys(mediaCacheRef.current).forEach(cachedUrl => {
                    if (!currentUrls.has(cachedUrl)) {
                        delete mediaCacheRef.current[cachedUrl];
                    }
                });
            }
        };
        loadMedia();
        return () => { isMounted = false; };
    }, [segments]);

    // 5. Parse Subtitles (Transcription -> JSON)
    useEffect(() => {
        if (!transcription || !transcription.words) return;
        
        const rawAnimationType = subtitleStyle?.animationType || 'pulse_bold';
        const animationType = rawAnimationType === 'pulse_bold' ? 'karaoke_block' : 
                             rawAnimationType === 'glow_focus' ? 'fade_group' : 
                             rawAnimationType === 'impact_pop' ? 'karaoke_bounce' : 
                             rawAnimationType;

        const isFade = animationType === 'fade_group';
        const threshold = isFade ? 800 : 300; // Slower pacing for fade
        const maxCharsPerLine = isFade 
            ? (aspectRatio === '16:9' ? 60 : 35) 
            : (aspectRatio === '16:9' ? 45 : 22);
        
        // Word count limits per style
        const defaultMaxWords = animationType === 'karaoke_block' ? 3 : (animationType === 'fade_group' ? 5 : (animationType === 'karaoke_bounce' ? 1 : 99));
        const maxWords = subtitleStyle?.maxWords !== undefined ? subtitleStyle.maxWords : defaultMaxWords;

        const lines: any[] = [];
        let group: any[] = [];

        transcription.words.forEach((word: any, i: number) => {
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
                
                if (gap > (threshold / 1000) || (currentLineLength + w.text.length > maxCharsPerLine) || group.length >= maxWords) {
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
        if (onLoadComplete) onLoadComplete();
        setIsLoaded(true);
    }, [transcription, subtitleStyle, aspectRatio]);

    // Helper: Parse ASS time (h:mm:ss.cc) to seconds
    const parseTime = (timeStr: string) => {
        const [h, m, s] = timeStr.split(':');
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    };

    // 6. Render Loop
    const render = (timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate smooth time
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const elapsed = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;

        let drawTime;
        if (isPlaying && audioRef.current) {
            const audioTime = audioRef.current.currentTime;
            // Smoothly advance visual time
            if (Math.abs(audioTime - visualTimeRef.current) > 0.15) {
                // Large discrepancy (seek or jump), snap
                visualTimeRef.current = audioTime;
            } else {
                // Advance by elapsed time
                visualTimeRef.current += elapsed;
                // Gently pull towards audio clock to prevent drift
                visualTimeRef.current += (audioTime - visualTimeRef.current) * 0.1;
            }
            drawTime = visualTimeRef.current;
        } else {
            drawTime = currentTimeRef.current;
            visualTimeRef.current = drawTime;
        }

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Determine current segment
        let accumulatedTime = 0;
        let currentSegmentIndex = 0;
        for (let i = 0; i < segmentDurations.length; i++) {
            if (drawTime >= accumulatedTime && drawTime < accumulatedTime + segmentDurations[i]) {
                currentSegmentIndex = i;
                break;
            }
            accumulatedTime += segmentDurations[i];
        }

        // Draw Media
        const med = media[currentSegmentIndex];
        const isVideo = med instanceof HTMLVideoElement;
        const isReady = med && (isVideo ? med.readyState >= 2 : (med as HTMLImageElement).complete);

        if (isReady) {
            const segmentTime = drawTime - accumulatedTime;
            const duration = segmentDurations[currentSegmentIndex];
            const progress = Math.min(segmentTime / duration, 1);
            const totalFrames = Math.ceil(duration * 30); // Use 30fps as base
            const currentFrame = Math.floor(segmentTime * 30);

            if (isVideo && med.duration) {
                // Calculate the required playback rate to perfectly match the segment duration.
                // If a 5s video needs to fit a 3s segment, play at 5/3 = 1.66x speed.
                const requiredPlaybackRate = med.duration / duration;
                
                if (isPlaying) {
                    if (med.paused) {
                        try {
                            med.play();
                        } catch (e) {
                            console.error("Video play error in render loop:", e);
                        }
                    }
                    if (Math.abs(med.playbackRate - requiredPlaybackRate) > 0.05) {
                        med.playbackRate = requiredPlaybackRate;
                    }
                    
                    // Only forcefully seek if the video has drifted significantly off the target time mapped to duration.
                    const expectedVideoTime = (segmentTime / duration) * med.duration;
                    if (Math.abs(med.currentTime - expectedVideoTime) > 0.3) {
                         med.currentTime = expectedVideoTime;
                    }
                } else {
                    if (!med.paused) {
                        med.pause();
                    }
                    // When scrubbed/paused, forcibly jump accurately
                    const targetVideoTime = progress * med.duration;
                    if (Math.abs(med.currentTime - targetVideoTime) > 0.05) {
                        med.currentTime = targetVideoTime;
                    }
                }
            }

            // Effect Logic matching video-assembler.js
            const effectPreset = (effect?.id || 'zoom_pulse') as keyof typeof EFFECT_SEQUENCES;
            let effectType;
            if (Array.isArray(effect)) {
                effectType = effect[currentSegmentIndex % effect.length];
            } else {
                const sequence = EFFECT_SEQUENCES[effectPreset] || EFFECT_SEQUENCES['zoom_pulse'];
                effectType = sequence[currentSegmentIndex % sequence.length];
            }

            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;

            const w = canvas.width;
            const h = canvas.height;
            const iw = isVideo ? (med as HTMLVideoElement).videoWidth : (med as HTMLImageElement).width;
            const ih = isVideo ? (med as HTMLVideoElement).videoHeight : (med as HTMLImageElement).height;

            // Base scale to cover canvas
            const baseScale = Math.max(w / iw, h / ih);

            // Use continuous frame count for smoother math at 60fps
            const continuousFrame = segmentTime * 30;

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
                    scale = 1.0 + (progress * 0.4);
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
                case 'handheld_walk':
                    scale = 1.1 + (progress * 0.2);
                    // Smooth, continuous circular drift (elliptical path)
                    // We use drawTime (global video time) to ensure the motion is seamless across segments
                    const globalFrame = drawTime * 30;
                    const driftFreq = 1 / 20; // Approx 4.2s period
                    const driftX = (iw_visible / scale / 30) * Math.sin(globalFrame * driftFreq);
                    const driftY = (ih_visible / scale / 40) * Math.cos(globalFrame * driftFreq);
                    
                    offsetX = (iw - iw_visible / scale) / 2 + driftX;
                    offsetY = (ih - ih_visible / scale) / 2 + driftY;
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
                case 'none':
                    scale = 1;
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
                    break;
                default:
                    scale = 1;
                    offsetX = (iw - iw_visible / scale) / 2;
                    offsetY = (ih - ih_visible / scale) / 2;
            }

            const dw = iw * baseScale * scale;
            const dh = ih * baseScale * scale;
            
            // dx/dy logic matching ffmpeg crop behavior
            const dx = -offsetX * baseScale * scale;
            const dy = -offsetY * baseScale * scale;

            ctx.drawImage(med, dx, dy, dw, dh);

            // Static Cinematic Vignette (Faint Shade)
            const intensity = 0.1; // Faint darkening at edges
            ctx.save();
            
            const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2;
            const nearestEdge = Math.min(canvas.width, canvas.height) / 2;
            
            // Radius logic: center stays untouched, only outer edges fade
            const innerRadius = nearestEdge * 1.1; 
            const outerRadius = diagonal * 1.2;

            const grad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, innerRadius,
                canvas.width / 2, canvas.height / 2, outerRadius
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${intensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        } else {
            // Placeholder
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Subtitles
        const currentSubtitle = subtitles.find(s => drawTime >= s.start && drawTime <= s.end);
        if (currentSubtitle && subtitleState === 'enabled') {
            const { 
                fontFamily = 'Arial', 
                fontSize = 40, 
                primaryColor = '#FFFFFF', 
                secondaryColor = '#000000', 
                highlightColor = '#FF0000',
                strokeWidth = 4, 
                letterSpacing = 0, 
                textTransform = 'none',
                placement = 'bottom',
                animationType: rawAnimationType = 'pulse_bold'
            } = subtitleStyle || {};

            const animationType = rawAnimationType === 'pulse_bold' ? 'karaoke_block' : 
                                 rawAnimationType === 'glow_focus' ? 'fade_group' : 
                                 rawAnimationType === 'impact_pop' ? 'karaoke_bounce' : 
                                 rawAnimationType;

            ctx.font = `bold ${fontSize}px "${fontFamily}"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
            
            // Letter Spacing (if supported)
            if ('letterSpacing' in ctx) {
                (ctx as any).letterSpacing = `${letterSpacing}px`;
            }

            let x = canvas.width / 2;
            // placement is a number from 0 to 100 representing percentage from bottom
            let y = canvas.height * (1 - (typeof placement === 'number' ? placement : 15) / 100);

            // Prepare text parts
            const words = currentSubtitle.words || [{ text: currentSubtitle.text, start: currentSubtitle.start, end: currentSubtitle.end }];
            
            // Calculate lines based on synchronized maxCharsPerLine and video width
            const lines: any[][] = [];
            let currentLine: any[] = [];
            let currentLineChars = 0;
            let currentLineWidth = 0;
            const maxWidth = canvas.width * 0.85;

            words.forEach((w: any, index: number) => {
                let t = w.text;
                if (textTransform === 'uppercase') t = t.toUpperCase();
                if (textTransform === 'capitalize') t = t.replace(/\b\w/g, (l: string) => l.toUpperCase());
                const display = index < words.length - 1 ? t + ' ' : t;
                const m = ctx.measureText(display);
                
                const isFade = animationType === 'fade_group';
                const maxChars = isFade 
                    ? (aspectRatio === '16:9' ? 60 : 35) 
                    : (aspectRatio === '16:9' ? 45 : 22);

                if ((currentLineChars + t.length > maxChars || currentLineWidth + m.width > maxWidth) && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = [{ ...w, width: m.width, display: display }];
                    currentLineChars = t.length;
                    currentLineWidth = m.width;
                } else {
                    currentLine.push({ ...w, width: m.width, display: display });
                    currentLineChars += t.length + 1; // +1 for space
                    currentLineWidth += m.width;
                }
            });
            if (currentLine.length > 0) lines.push(currentLine);

            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            
            // Anchor the bottom of the text block to 'y'
            let startY = y - (totalHeight - lineHeight);

            lines.forEach((lineWords) => {
                const lineWidth = lineWords.reduce((acc, lw) => acc + lw.width, 0);
                let currentX = x - (lineWidth / 2);

                lineWords.forEach((w: any) => {
                    // Determine color based on animation type and timing
                    let fillColor = primaryColor;
                    let scale = 1;

                    if (animationType === 'karaoke_block' || animationType === 'karaoke_bounce' || animationType === 'fade_group') {
                        // Pulse Bold (karaoke_block) and Typewriter Glow (fade_group) should only highlight the ACTIVE word
                        if (drawTime >= w.start && drawTime < w.end) {
                            fillColor = animationType === 'karaoke_bounce' ? primaryColor : (highlightColor || primaryColor);
                            if (animationType === 'karaoke_bounce') {
                                // Simulate Pop Bounce: Scale up to 120% then back
                                const progress = (drawTime - w.start) / (w.end - w.start);
                                if (progress < 0.5) {
                                    scale = 1 + (progress * 0.4); // 1.0 -> 1.2
                                } else {
                                    scale = 1.2 - ((progress - 0.5) * 0.4); // 1.2 -> 1.0
                                }
                            }
                        } else {
                            fillColor = primaryColor;
                        }
                    }

                    ctx.save();
                    
                    if (animationType === 'fade_group') {
                        // Typewriter style: only show if word has started
                        if (drawTime < w.start) {
                            ctx.globalAlpha = 0;
                        } else {
                            ctx.globalAlpha = 1;
                        }
                    }
                    
                    // Position for this word
                    const wordX = currentX + (w.width / 2);
                    
                    ctx.translate(wordX, startY);
                    if (scale !== 1) ctx.scale(scale, scale);
                    
                    ctx.fillStyle = fillColor;
                    ctx.strokeStyle = secondaryColor;

                    if (strokeWidth > 0) ctx.strokeText(w.display, 0, 0);
                    ctx.fillText(w.display, 0, 0);
                    
                    ctx.restore();

                    currentX += w.width;
                });
                startY += lineHeight;
            });
            ctx.globalAlpha = 1; // Reset alpha
        }

        requestRef.current = requestAnimationFrame(render);
    };

    useEffect(() => {
        lastTimestampRef.current = 0;
        requestRef.current = requestAnimationFrame(render);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, media, subtitles, effect, subtitleStyle, subtitleState, segmentDurations]);

    // Resize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Set resolution based on aspect ratio to match export (1080p)
        if (aspectRatio === '9:16') {
            canvas.width = 1080;
            canvas.height = 1920;
        } else {
            canvas.width = 1920;
            canvas.height = 1080;
        }
    }, [aspectRatio]);

    const totalDuration = segmentDurations.reduce((a, b) => a + b, 0) || 0;

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            {/* Aspect Ratio Container to keep controls within canvas bounds */}
            <div 
                ref={containerRef}
                className="relative shadow-2xl rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer"
                style={{ 
                    aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                    maxHeight: '100%',
                    maxWidth: '100%'
                }}
                onClick={() => setShowControls(true)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-contain transition-opacity duration-300 ${isLoadingMedia ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {isLoadingMedia && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm z-10">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Loading Visuals...</div>
                    </div>
                )}
                
                {/* Centered Play Button (Visible when showControls is true AND (paused OR hovering) AND NOT seeking) */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${showControls && (!isPlaying || isHovering) && !isSeeking ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlayPause();
                        }}
                        className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 hover:scale-110 transition-all shadow-2xl border border-white/20 pointer-events-auto"
                    >
                        {isPlaying ? (
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </button>
                </div>

                {/* Bottom Seeker Bar (Visible when showControls is true AND hovering) */}
                <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${showControls && isHovering ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex flex-col gap-1.5">
                        <input 
                            type="range"
                            min="0"
                            max={totalDuration}
                            step="0.01"
                            value={currentTime}
                            onChange={(e) => onTimeUpdate(parseFloat(e.target.value))}
                            onMouseDown={() => setIsSeeking(true)}
                            onMouseUp={() => setIsSeeking(false)}
                            onTouchStart={() => setIsSeeking(true)}
                            onTouchEnd={() => setIsSeeking(false)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-1 bg-zinc-900/30 rounded-lg appearance-none cursor-pointer accent-white hover:accent-yellow-500 transition-all"
                        />
                        <div className="flex justify-between items-center text-[9px] font-mono text-white font-bold tracking-widest drop-shadow-md">
                            <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                            <span>{new Date(totalDuration * 1000).toISOString().substr(14, 5)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
