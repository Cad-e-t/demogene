import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CropData, TrimData } from '../types';

interface VideoCropperProps {
  videoUrl: string;
  onCropChange: (crop: CropData) => void;
  onTrimChange: (trim: TrimData) => void;
}

export const VideoCropper: React.FC<VideoCropperProps> = ({ videoUrl, onCropChange, onTrimChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Crop State (Normalized 0-1)
  const [crop, setCrop] = useState<CropData>({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<string | null>(null);

  // Trim State (Seconds)
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (trim.end === 0) {
        setTrim({ start: 0, end: dur });
        onTrimChange({ start: 0, end: dur });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Loop Logic
      if (videoRef.current.currentTime >= trim.end && trim.end > 0) {
        // If playing, loop back to start
        if (isPlaying) {
             videoRef.current.currentTime = trim.start;
             videoRef.current.play();
        } else {
             // If not playing (scrubbing), just clamp
             // videoRef.current.currentTime = trim.end; // This feels sticky when scrubbing
        }
      }
    }
  };

  // Play/Pause Toggle
  const togglePlay = useCallback(() => {
      if (!videoRef.current) return;
      
      if (videoRef.current.paused) {
          // If at end, reset to start before playing
          if (videoRef.current.currentTime >= trim.end) {
              videoRef.current.currentTime = trim.start;
          }
          videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  }, [trim]);

  // Handle Video Ended (Natural End)
  const handleEnded = () => {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.currentTime = trim.start;
  };

  // --- Crop Logic ---
  
  const handleCropMouseDown = (type: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCrop(type);
  };

  // --- Trim Logic ---

  const handleTrimMouseDown = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTrim(type);
  };

  // --- Global Mouse Handlers ---

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // 1. Crop Dragging
    if (isDraggingCrop && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      setCrop(prev => {
        let { x, y, width, height } = prev;
        const right = x + width;
        const bottom = y + height;

        // Constrain values 0-1
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

    // 2. Trim Dragging
    if (isDraggingTrim && timelineRef.current && duration > 0) {
        const rect = timelineRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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
            
            // Sync video
            if (videoRef.current) {
                videoRef.current.currentTime = isDraggingTrim === 'start' ? start : end;
            }
            
            return newTrim;
        });
    }
  }, [isDraggingCrop, isDraggingTrim, onCropChange, onTrimChange, duration]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingCrop(null);
    setIsDraggingTrim(null);
  }, []);

  useEffect(() => {
    if (isDraggingCrop || isDraggingTrim) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDraggingCrop, isDraggingTrim]);

  // --- Visual Helpers ---
  const toPct = (n: number) => `${n * 100}%`;
  
  const startPct = duration ? (trim.start / duration) * 100 : 0;
  const endPct = duration ? (trim.end / duration) * 100 : 100;
  const widthPct = endPct - startPct;
  const currentPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col w-full h-full">
      
      {/* 
         Video Canvas Area 
         - Uses flex center to position.
         - Wrapper div is relative and inline-flex to shrink-wrap the video.
         - Video has max constraints.
         - Overlay is absolute to wrapper.
      */}
      <div className="flex-1 bg-black/5 overflow-hidden select-none flex items-center justify-center p-4">
        
        {/* Constraint Wrapper: This div matches the Video's rendered size exactly because Video is block and Wrapper is inline-block/relative */}
        <div 
            className="relative shadow-2xl bg-black inline-flex items-center justify-center"
            ref={containerRef}
            style={{ maxHeight: '100%', maxWidth: '100%' }}
        >
            <video 
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full object-contain pointer-events-none block"
                // Important: Limit max height to viewport calculation if needed, but flex parent handles it mostly.
                // We add a specific style to ensure it doesn't push the controls off screen on small mobile devices.
                style={{ maxHeight: 'calc(100vh - 180px)' }}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                // Removed 'muted' prop to allow sound if desired, but user can add later. Sticking to muted for crop/trim usually.
                muted 
                playsInline
            />

            {/* Crop Overlay - Absolute to the Wrapper */}
            <div className="absolute inset-0 pointer-events-none">
               {/* Actual crop box */}
                <div 
                    className="absolute border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] pointer-events-auto"
                    style={{
                        left: toPct(crop.x),
                        top: toPct(crop.y),
                        width: toPct(crop.width),
                        height: toPct(crop.height),
                    }}
                >
                    {/* Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border-r border-white h-full col-start-2"></div>
                        <div className="border-r border-white h-full col-start-3"></div>
                        <div className="border-b border-white w-full row-start-2 col-span-3 absolute top-0"></div>
                        <div className="border-b border-white w-full row-start-3 col-span-3 absolute top-0"></div>
                    </div>

                    {/* Resize Handles */}
                    <div onMouseDown={(e) => handleCropMouseDown('NW', e)} className="absolute top-0 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-white cursor-nw-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('NE', e)} className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2 bg-white cursor-ne-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('SW', e)} className="absolute bottom-0 left-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-white cursor-sw-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('SE', e)} className="absolute bottom-0 right-0 w-3 h-3 translate-x-1/2 translate-y-1/2 bg-white cursor-se-resize z-20" />
                    
                    <div onMouseDown={(e) => handleCropMouseDown('N', e)} className="absolute top-0 left-1/2 w-8 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-white cursor-n-resize z-10 rounded-full" />
                    <div onMouseDown={(e) => handleCropMouseDown('S', e)} className="absolute bottom-0 left-1/2 w-8 h-1.5 -translate-x-1/2 translate-y-1/2 bg-white cursor-s-resize z-10 rounded-full" />
                    <div onMouseDown={(e) => handleCropMouseDown('W', e)} className="absolute left-0 top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-white cursor-w-resize z-10 rounded-full" />
                    <div onMouseDown={(e) => handleCropMouseDown('E', e)} className="absolute right-0 top-1/2 h-8 w-1.5 translate-x-1/2 -translate-y-1/2 bg-white cursor-e-resize z-10 rounded-full" />
                </div>
            </div>
        </div>
      </div>

      {/* Trimming & Playback Controls */}
      <div className="select-none bg-gray-950 border-t border-gray-800 p-4 pb-6 md:pb-4 flex flex-col gap-3 z-10 relative">
        
        {/* Controls Row */}
        <div className="flex items-center justify-between">
            <button 
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                title={isPlaying ? "Pause" : "Play Loop"}
            >
                {isPlaying ? (
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                     <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
            </button>

            {/* Time Info */}
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

        {/* Timeline Container */}
        <div 
            ref={timelineRef}
            className="relative h-10 w-full cursor-pointer group flex items-center"
            onClick={(e) => {
                // Seek on click
                if(!isDraggingTrim && videoRef.current && timelineRef.current) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    const t = pct * duration;
                    videoRef.current.currentTime = Math.max(0, Math.min(duration, t));
                }
            }}
        >
            {/* Background Track */}
            <div className="absolute left-0 right-0 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                {/* Visual Progress Bar (Background) */}
                 <div 
                    className="h-full bg-gray-700" 
                    style={{ width: currentPct + '%' }}
                />
            </div>

            {/* Active Region (Trim Selection) */}
            <div 
                className="absolute h-1.5 bg-indigo-500/50 pointer-events-none"
                style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`
                }}
            />

            {/* Active Region Border (Top/Bottom visual) */}
            <div 
                 className="absolute top-1 bottom-1 border-t-2 border-b-2 border-indigo-500 opacity-30 pointer-events-none"
                 style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`
                }}
            />

            {/* Left Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('start', e)}
                className="absolute w-4 h-6 bg-indigo-500 rounded-sm cursor-ew-resize z-20 hover:scale-110 transition-transform shadow flex items-center justify-center group/handle"
                style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
            >
                <div className="w-0.5 h-3 bg-white/50"></div>
            </div>

            {/* Right Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('end', e)}
                className="absolute w-4 h-6 bg-indigo-500 rounded-sm cursor-ew-resize z-20 hover:scale-110 transition-transform shadow flex items-center justify-center group/handle"
                style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
            >
                 <div className="w-0.5 h-3 bg-white/50"></div>
            </div>

             {/* Playhead */}
             <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                style={{ left: `${currentPct}%` }}
            >
                 <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
            </div>
        </div>
      </div>
    </div>
  );
};