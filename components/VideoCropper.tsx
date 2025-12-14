
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CropData, TrimData, TimeRange } from '../types';

interface VideoCropperProps {
  videoUrl: string;
  onCropChange: (crop: CropData) => void;
  onTrimChange: (trim: TrimData) => void;
  onAdvancedEdit: () => void;
  hideTimeline?: boolean;
  segments?: TimeRange[]; // New prop for gapless playback support
}

export const VideoCropper: React.FC<VideoCropperProps> = ({ 
    videoUrl, 
    onCropChange, 
    onTrimChange, 
    onAdvancedEdit,
    hideTimeline = false,
    segments
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  
  // Crop State (Normalized 0-1)
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 1, height: 1 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<string | null>(null);

  // Trim State (Seconds) - Only used if segments are NOT provided
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const dur = video.duration;
    const w = video.videoWidth;
    const h = video.videoHeight;

    setDuration(dur);
    
    if (w && h) {
        setAspectRatio(w / h);
    }

    if (trim.end === 0) {
      setTrim({ start: 0, end: dur });
      onTrimChange({ start: 0, end: dur });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      
      // Playback Logic
      if (segments && segments.length > 0) {
          // Gapless playback for edited segments
          const activeSeg = segments.find(s => t >= s.start && t < s.end);
          if (!activeSeg) {
              // We are in a gap or at end
              const nextSeg = segments.find(s => s.start > t);
              if (nextSeg) {
                  videoRef.current.currentTime = nextSeg.start;
              } else if (isPlaying) {
                  // End of all segments, loop to first
                  videoRef.current.currentTime = segments[0].start;
                  if (videoRef.current.paused) videoRef.current.play().catch(() => {});
              }
          }
      } else {
          // Standard single-trim loop logic
          if (t >= trim.end && trim.end > 0) {
             if (isPlaying) {
                 videoRef.current.currentTime = trim.start;
                 if (videoRef.current.paused) videoRef.current.play().catch(() => {});
             }
          }
      }
    }
  };

  // Play/Pause Toggle
  const togglePlay = useCallback(() => {
      if (!videoRef.current) return;
      
      if (videoRef.current.paused) {
          // Check start position
          if (segments && segments.length > 0) {
             // If outside any segment, jump to first valid
             const t = videoRef.current.currentTime;
             const inSeg = segments.some(s => t >= s.start && t < s.end);
             if (!inSeg) {
                 videoRef.current.currentTime = segments[0].start;
             }
          } else {
             if (videoRef.current.currentTime >= trim.end) {
                 videoRef.current.currentTime = trim.start;
             }
          }
          videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  }, [trim, segments]);

  // Handle Video Ended (Natural End)
  const handleEnded = () => {
      // Loop
      if (segments && segments.length > 0) {
           if(videoRef.current) {
               videoRef.current.currentTime = segments[0].start;
               videoRef.current.play();
           }
      } else {
           if(videoRef.current) {
               videoRef.current.currentTime = trim.start;
               videoRef.current.play();
           }
      }
  };

  // --- Input Handlers (Crop) ---
  
  const handleCropStart = (type: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingCrop(type);
  };

  const processMove = useCallback((clientX: number, clientY: number) => {
    // Crop Dragging
    if (isDraggingCrop && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (clientX - rect.left) / rect.width;
      const mouseY = (clientY - rect.top) / rect.height;

      setCrop(prev => {
        let { x, y, width, height } = prev;
        const right = x + width;
        const bottom = y + height;

        const clampedX = Math.max(0, Math.min(1, mouseX));
        const clampedY = Math.max(0, Math.min(1, mouseY));
        const minSize = 0.1;

        if (isDraggingCrop === 'move') {
           // Move logic omitted
        } else {
            if (isDraggingCrop.includes('W')) {
                const newW = right - clampedX;
                if (newW >= minSize) { x = clampedX; width = newW; }
            }
            if (isDraggingCrop.includes('E')) {
                const newW = clampedX - x;
                if (newW >= minSize) width = newW;
            }
            if (isDraggingCrop.includes('N')) {
                const newH = bottom - clampedY;
                if (newH >= minSize) { y = clampedY; height = newH; }
            }
            if (isDraggingCrop.includes('S')) {
                const newH = clampedY - y;
                if (newH >= minSize) height = newH;
            }
        }
        
        const newCrop = { x, y, width, height };
        onCropChange(newCrop);
        return newCrop;
      });
    }

    // Trim Dragging (Only if timeline visible)
    if (!hideTimeline && isDraggingTrim && timelineRef.current && duration > 0) {
        const rect = timelineRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const timeVal = pct * duration;
        
        setTrim(prev => {
            let { start, end } = prev;
            const minDuration = 1.0; 
            
            if (isDraggingTrim === 'start') {
                const newStart = Math.min(timeVal, end - minDuration);
                start = Math.max(0, newStart);
            } else {
                const newEnd = Math.max(timeVal, start + minDuration);
                end = Math.min(duration, newEnd);
            }

            const newTrim = { start, end };
            onTrimChange(newTrim);
            
            if (videoRef.current) {
                videoRef.current.currentTime = isDraggingTrim === 'start' ? start : end;
            }
            
            return newTrim;
        });
    }
  }, [isDraggingCrop, isDraggingTrim, onCropChange, onTrimChange, duration, hideTimeline]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => processMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            e.preventDefault(); 
            processMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };
    
    const onEnd = () => {
      setIsDraggingCrop(null);
      setIsDraggingTrim(null);
    };

    if (isDraggingCrop || isDraggingTrim) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [processMove, isDraggingCrop, isDraggingTrim]);

  // --- Visual Helpers ---
  const toPct = (n: number) => `${n * 100}%`;
  
  const startPct = duration ? (trim.start / duration) * 100 : 0;
  const endPct = duration ? (trim.end / duration) * 100 : 100;
  const widthPct = endPct - startPct;
  const currentPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col w-full h-full">
      
      {/* Video Canvas Area */}
      <div className="flex-1 bg-black/5 overflow-hidden select-none flex items-center justify-center p-8 md:p-12 relative">
        
        {/* Play/Pause Overlay for No-Timeline Mode */}
        {hideTimeline && (
             <button 
                onClick={togglePlay}
                className="absolute z-30 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white p-4 rounded-full transition-all hover:scale-105 shadow-xl border border-white/10 group"
             >
                 {isPlaying ? (
                    <svg className="w-8 h-8 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                 ) : (
                    <svg className="w-8 h-8 ml-1 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 )}
             </button>
        )}

        {/* Constraint Wrapper */}
        <div 
            className="relative shadow-2xl bg-black inline-flex items-center justify-center"
            ref={containerRef}
            style={{ 
                maxHeight: '90%', 
                maxWidth: '90%', 
                aspectRatio: aspectRatio 
            }}
        >
            <video 
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full object-contain pointer-events-none block"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                muted // Muted for preview usually
                playsInline
            />

            {/* Crop Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                <div 
                    className="absolute border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] pointer-events-auto"
                    style={{
                        left: toPct(crop.x),
                        top: toPct(crop.y),
                        width: toPct(crop.width),
                        height: toPct(crop.height),
                    }}
                >
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border-r border-white h-full col-start-2"></div>
                        <div className="border-r border-white h-full col-start-3"></div>
                        <div className="border-b border-white w-full row-start-2 col-span-3 absolute top-0"></div>
                        <div className="border-b border-white w-full row-start-3 col-span-3 absolute top-0"></div>
                    </div>

                    {/* Resize Handles */}
                    <div onMouseDown={(e) => handleCropStart('NW', e)} onTouchStart={(e) => handleCropStart('NW', e)} className="absolute top-0 left-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-nw-resize z-20"><div className="w-3 h-3 bg-white shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('NE', e)} onTouchStart={(e) => handleCropStart('NE', e)} className="absolute top-0 right-0 w-6 h-6 translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-ne-resize z-20"><div className="w-3 h-3 bg-white shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('SW', e)} onTouchStart={(e) => handleCropStart('SW', e)} className="absolute bottom-0 left-0 w-6 h-6 -translate-x-1/2 translate-y-1/2 flex items-center justify-center cursor-sw-resize z-20"><div className="w-3 h-3 bg-white shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('SE', e)} onTouchStart={(e) => handleCropStart('SE', e)} className="absolute bottom-0 right-0 w-6 h-6 translate-x-1/2 translate-y-1/2 flex items-center justify-center cursor-se-resize z-20"><div className="w-3 h-3 bg-white shadow-sm"></div></div>
                    
                    <div onMouseDown={(e) => handleCropStart('N', e)} onTouchStart={(e) => handleCropStart('N', e)} className="absolute top-0 left-1/2 w-8 h-4 -translate-x-1/2 -translate-y-1/2 cursor-n-resize z-10 flex items-center justify-center"><div className="w-8 h-1.5 bg-white rounded-full shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('S', e)} onTouchStart={(e) => handleCropStart('S', e)} className="absolute bottom-0 left-1/2 w-8 h-4 -translate-x-1/2 translate-y-1/2 cursor-s-resize z-10 flex items-center justify-center"><div className="w-8 h-1.5 bg-white rounded-full shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('W', e)} onTouchStart={(e) => handleCropStart('W', e)} className="absolute left-0 top-1/2 h-8 w-4 -translate-x-1/2 -translate-y-1/2 cursor-w-resize z-10 flex items-center justify-center"><div className="h-8 w-1.5 bg-white rounded-full shadow-sm"></div></div>
                    <div onMouseDown={(e) => handleCropStart('E', e)} onTouchStart={(e) => handleCropStart('E', e)} className="absolute right-0 top-1/2 h-8 w-4 translate-x-1/2 -translate-y-1/2 cursor-e-resize z-10 flex items-center justify-center"><div className="h-8 w-1.5 bg-white rounded-full shadow-sm"></div></div>
                </div>
            </div>
        </div>
      </div>

      {/* Conditional Timeline Rendering */}
      {!hideTimeline && (
          <div className="select-none bg-gray-950 border-t border-gray-800 p-4 pb-6 md:pb-4 flex flex-col gap-3 z-10 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={togglePlay}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>
                </div>

                <div className="flex gap-4 text-xs font-mono">
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Start</span>
                        <span className="text-gray-300">{trim.start.toFixed(1)}s</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">Current</span>
                        <span className="text-white font-bold">{currentTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-[10px] uppercase">End</span>
                        <span className="text-gray-300">{trim.end.toFixed(1)}s</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div 
                    ref={timelineRef}
                    className="relative h-10 flex-1 cursor-pointer group flex items-center touch-none"
                    onClick={(e) => {
                        if(!isDraggingTrim && videoRef.current && timelineRef.current) {
                            const rect = timelineRef.current.getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            const t = pct * duration;
                            videoRef.current.currentTime = Math.max(0, Math.min(duration, t));
                        }
                    }}
                    onMouseDown={(e) => isDraggingTrim ? null : setIsDraggingTrim('start') /* Fake handler to init click if needed */}
                >
                    <div className="absolute left-0 right-0 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-700" style={{ width: currentPct + '%' }} />
                    </div>

                    <div 
                        className="absolute h-1.5 bg-indigo-500/50 pointer-events-none"
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    />
                    <div 
                        className="absolute top-1 bottom-1 border-t-2 border-b-2 border-indigo-500 opacity-30 pointer-events-none"
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    />

                    <div
                        onMouseDown={(e) => { e.stopPropagation(); setIsDraggingTrim('start'); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDraggingTrim('start'); }}
                        className="absolute w-6 h-8 -top-1 bg-transparent cursor-ew-resize z-20 flex items-center justify-center group/handle"
                        style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
                    >
                        <div className="w-4 h-6 bg-indigo-500 rounded-sm shadow border border-white/20 flex items-center justify-center group-hover/handle:scale-110 transition-transform">
                            <div className="w-0.5 h-3 bg-white/50"></div>
                        </div>
                    </div>

                    <div
                        onMouseDown={(e) => { e.stopPropagation(); setIsDraggingTrim('end'); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDraggingTrim('end'); }}
                        className="absolute w-6 h-8 -top-1 bg-transparent cursor-ew-resize z-20 flex items-center justify-center group/handle"
                        style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
                    >
                        <div className="w-4 h-6 bg-indigo-500 rounded-sm shadow border border-white/20 flex items-center justify-center group-hover/handle:scale-110 transition-transform">
                            <div className="w-0.5 h-3 bg-white/50"></div>
                        </div>
                    </div>

                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                        style={{ left: `${currentPct}%` }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
                    </div>
                </div>

                <button 
                    onClick={onAdvancedEdit}
                    className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                    title="Advanced Cut & Split"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" />
                    </svg>
                </button>
            </div>
          </div>
      )}
    </div>
  );
};
