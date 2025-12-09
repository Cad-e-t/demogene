
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
           // Move logic omitted for now to keep it simple, same as before
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
      
      {/* Video Canvas Area */}
      <div className="flex-1 bg-black/5 overflow-hidden select-none relative flex items-center justify-center">
        {/* We keep aspect-video only as a fallback or user preference, 
            but for flat layout it's better to fit logic. 
            However, maintaining old crop logic relies on containerRef bounding box.
            We'll make the container fit the video. */}
        <div className="relative h-full w-full flex items-center justify-center p-4" ref={containerRef}>
            <video 
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full object-contain pointer-events-none"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            muted
            playsInline
            />

            {/* Crop Overlay */}
            {/* Note: This overlay is absolute to the container. If video is smaller than container due to aspect ratio, 
                this overlay might go over empty space. 
                Optimally, we should match overlay to video dimensions, but that requires complex JS.
                For now, relying on 'max-w-full' often mitigates huge gaps if container is tight.
            */}
            <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            >
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

                    {/* Resize Handles - Minimal Dots */}
                    <div onMouseDown={(e) => handleCropMouseDown('NW', e)} className="absolute top-0 left-0 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white cursor-nw-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('NE', e)} className="absolute top-0 right-0 w-2 h-2 translate-x-1/2 -translate-y-1/2 bg-white cursor-ne-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('SW', e)} className="absolute bottom-0 left-0 w-2 h-2 -translate-x-1/2 translate-y-1/2 bg-white cursor-sw-resize z-20" />
                    <div onMouseDown={(e) => handleCropMouseDown('SE', e)} className="absolute bottom-0 right-0 w-2 h-2 translate-x-1/2 translate-y-1/2 bg-white cursor-se-resize z-20" />
                    
                    <div onMouseDown={(e) => handleCropMouseDown('N', e)} className="absolute top-0 left-1/2 w-4 h-1 -translate-x-1/2 -translate-y-1/2 bg-white cursor-n-resize z-10" />
                    <div onMouseDown={(e) => handleCropMouseDown('S', e)} className="absolute bottom-0 left-1/2 w-4 h-1 -translate-x-1/2 translate-y-1/2 bg-white cursor-s-resize z-10" />
                    <div onMouseDown={(e) => handleCropMouseDown('W', e)} className="absolute left-0 top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 bg-white cursor-w-resize z-10" />
                    <div onMouseDown={(e) => handleCropMouseDown('E', e)} className="absolute right-0 top-1/2 h-4 w-1 translate-x-1/2 -translate-y-1/2 bg-white cursor-e-resize z-10" />
                </div>
            </div>
        </div>
      </div>

      {/* Trimming Controls */}
      <div className="select-none bg-gray-950 border-t border-gray-800 p-4">
        
        {/* Time Info */}
        <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
            <div><span className="text-gray-400">{trim.start.toFixed(1)}s</span></div>
            <div><span className="text-white">{currentTime.toFixed(1)}s</span></div>
            <div><span className="text-gray-400">{trim.end.toFixed(1)}s</span></div>
        </div>

        {/* Timeline Container */}
        <div 
            ref={timelineRef}
            className="relative h-8 w-full cursor-pointer group"
            onClick={(e) => {
                if(!isDraggingTrim && videoRef.current && timelineRef.current) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    const t = pct * duration;
                    videoRef.current.currentTime = Math.max(0, Math.min(duration, t));
                }
            }}
        >
            {/* Background Track */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-800 -translate-y-1/2" />

            {/* Active Region */}
            <div 
                className="absolute top-1/2 h-1 bg-indigo-500 -translate-y-1/2 pointer-events-none"
                style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`
                }}
            />

            {/* Left Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('start', e)}
                className="absolute top-1/2 w-3 h-4 bg-indigo-500 rounded-sm -translate-y-1/2 cursor-ew-resize z-20 hover:scale-125 transition-transform"
                style={{ left: `${startPct}%`, transform: 'translate(-50%, -50%)' }}
            />

            {/* Right Handle */}
            <div
                onMouseDown={(e) => handleTrimMouseDown('end', e)}
                className="absolute top-1/2 w-3 h-4 bg-indigo-500 rounded-sm -translate-y-1/2 cursor-ew-resize z-20 hover:scale-125 transition-transform"
                style={{ left: `${endPct}%`, transform: 'translate(-50%, -50%)' }}
            />

             {/* Playhead */}
             <div 
                className="absolute top-0 bottom-0 w-px bg-white z-10 pointer-events-none" 
                style={{ left: `${currentPct}%` }}
            />
        </div>
      </div>
    </div>
  );
};
