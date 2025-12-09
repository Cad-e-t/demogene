
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
      // Loop trim preview
      if (videoRef.current.currentTime >= trim.end) {
        videoRef.current.currentTime = trim.start;
      }
    }
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
           // Simplified move: calculate delta if we stored start pos, 
           // but for now relying on center-based or just not supporting move (only resize) 
           // as per previous implementation style, but sticking to resize handles usually suffices.
           // To properly implement move, we'd need to track start X/Y. 
           // For this snippet, assuming 'move' isn't triggered by handles but by the box itself.
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto bg-gray-900 p-6 rounded-xl border border-gray-800">
      
      {/* Video Canvas Area */}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden select-none border border-gray-800" ref={containerRef}>
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain pointer-events-none"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          muted
          playsInline
        />

        {/* Crop Overlay */}
        <div 
          className="absolute border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
          style={{
            left: toPct(crop.x),
            top: toPct(crop.y),
            width: toPct(crop.width),
            height: toPct(crop.height),
          }}
        >
           {/* Grid Lines */}
           <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
             <div className="border-r border-indigo-500 h-full col-start-2"></div>
             <div className="border-r border-indigo-500 h-full col-start-3"></div>
             <div className="border-b border-indigo-500 w-full row-start-2 col-span-3 absolute top-0"></div>
             <div className="border-b border-indigo-500 w-full row-start-3 col-span-3 absolute top-0"></div>
           </div>

           {/* Resize Handles */}
           <div onMouseDown={(e) => handleCropMouseDown('NW', e)} className="absolute top-0 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-white border border-indigo-600 rounded-full cursor-nw-resize z-20" />
           <div onMouseDown={(e) => handleCropMouseDown('NE', e)} className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2 bg-white border border-indigo-600 rounded-full cursor-ne-resize z-20" />
           <div onMouseDown={(e) => handleCropMouseDown('SW', e)} className="absolute bottom-0 left-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-white border border-indigo-600 rounded-full cursor-sw-resize z-20" />
           <div onMouseDown={(e) => handleCropMouseDown('SE', e)} className="absolute bottom-0 right-0 w-3 h-3 translate-x-1/2 translate-y-1/2 bg-white border border-indigo-600 rounded-full cursor-se-resize z-20" />
           
           <div onMouseDown={(e) => handleCropMouseDown('N', e)} className="absolute top-0 left-1/2 w-8 h-2 -translate-x-1/2 -translate-y-1/2 bg-white/50 border border-indigo-600 rounded-full cursor-n-resize z-10" />
           <div onMouseDown={(e) => handleCropMouseDown('S', e)} className="absolute bottom-0 left-1/2 w-8 h-2 -translate-x-1/2 translate-y-1/2 bg-white/50 border border-indigo-600 rounded-full cursor-s-resize z-10" />
           <div onMouseDown={(e) => handleCropMouseDown('W', e)} className="absolute left-0 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 bg-white/50 border border-indigo-600 rounded-full cursor-w-resize z-10" />
           <div onMouseDown={(e) => handleCropMouseDown('E', e)} className="absolute right-0 top-1/2 h-8 w-2 translate-x-1/2 -translate-y-1/2 bg-white/50 border border-indigo-600 rounded-full cursor-e-resize z-10" />
        </div>
      </div>

      {/* Trimming Controls */}
      <div className="select-none">
        
        {/* Time Info */}
        <div className="flex justify-between text-sm font-mono text-gray-400 mb-2">
            <div>Start: <span className="text-white font-bold">{trim.start.toFixed(1)}s</span></div>
            <div><span className="text-indigo-400">{currentTime.toFixed(1)}s</span></div>
            <div>End: <span className="text-white font-bold">{trim.end.toFixed(1)}s</span></div>
        </div>

        {/* Timeline Container */}
        <div 
            ref={timelineRef}
            className="relative h-14 w-full mt-2 cursor-pointer group"
            onClick={(e) => {
                // Seek logic (only if not dragging)
                if(!isDraggingTrim && videoRef.current && timelineRef.current) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    const t = pct * duration;
                    videoRef.current.currentTime = Math.max(0, Math.min(duration, t));
                }
            }}
        >
            {/* Background Track (Inactive Area) */}
            <div className="absolute top-1/2 left-0 right-0 h-4 bg-gray-800 rounded-full -translate-y-1/2 overflow-hidden" />

            {/* Active Region (Selected Trim) */}
            <div 
                className="absolute top-1/2 h-4 bg-indigo-500/30 -translate-y-1/2 pointer-events-none"
                style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`
                }}
            />
            
            {/* Active Region Borders (Visual Connection) */}
            <div 
                className="absolute top-1/2 h-4 border-t-2 border-b-2 border-indigo-500 -translate-y-1/2 pointer-events-none"
                style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`
                }}
            />

            {/* Left Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('start', e)}
                className="absolute top-1/2 w-6 h-10 bg-indigo-500 hover:bg-indigo-400 rounded-md -translate-y-1/2 shadow-lg cursor-ew-resize z-20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ left: `calc(${startPct}% - 12px)` }}
            >
                <div className="w-0.5 h-4 bg-white/50 rounded-full mx-[1px]" />
                <div className="w-0.5 h-4 bg-white/50 rounded-full mx-[1px]" />
            </div>

            {/* Right Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('end', e)}
                className="absolute top-1/2 w-6 h-10 bg-indigo-500 hover:bg-indigo-400 rounded-md -translate-y-1/2 shadow-lg cursor-ew-resize z-20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ left: `calc(${endPct}% - 12px)` }}
            >
                <div className="w-0.5 h-4 bg-white/50 rounded-full mx-[1px]" />
                <div className="w-0.5 h-4 bg-white/50 rounded-full mx-[1px]" />
            </div>

             {/* Playhead (Active) */}
             <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                style={{ left: `${currentPct}%` }}
            >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
            </div>

        </div>

        <p className="text-center text-xs text-gray-500 mt-2">
          Drag handles to set the start and end points of your video.
        </p>
      </div>
    </div>
  );
};
