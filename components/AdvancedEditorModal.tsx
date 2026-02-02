import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TimeRange } from '../types';

interface AdvancedEditorModalProps {
  videoUrl: string;
  initialSegments: TimeRange[] | null;
  duration: number;
  onSave: (segments: TimeRange[]) => void;
  onClose: () => void;
}

const MIN_SEGMENT_DURATION = 0.5;

export const AdvancedEditorModal: React.FC<AdvancedEditorModalProps> = ({ 
  videoUrl, 
  initialSegments, 
  duration, 
  onSave, 
  onClose 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  
  // History
  const [history, setHistory] = useState<TimeRange[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // State
  const [segments, setSegments] = useState<TimeRange[]>([]);
  const [currentTime, setCurrentTime] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  
  // Dragging State
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragState, setDragState] = useState<{ 
      segmentId: string, 
      type: 'start' | 'end', 
      startX: number, 
      initialStart: number, 
      initialEnd: number 
  } | null>(null);

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(60); // Default 60px/s

  // Initialize
  useEffect(() => {
    if (initialSegments && initialSegments.length > 0) {
      // Deep copy to avoid reference issues
      const deepCopy = JSON.parse(JSON.stringify(initialSegments));
      setSegments(deepCopy);
      pushHistory(deepCopy);
    } else {
      const initial = [{ id: uuidv4(), start: 0, end: duration }];
      setSegments(initial);
      pushHistory(initial);
    }
  }, [duration]);

  const pushHistory = (newSegments: TimeRange[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSegments);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateSegments = (newSegments: TimeRange[], addToHistory = true) => {
    setSegments(newSegments);
    if (addToHistory) pushHistory(newSegments);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSegments(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSegments(history[historyIndex + 1]);
    }
  };
  
  const handleReset = () => {
    const resetSegs = [{ id: uuidv4(), start: 0, end: duration }];
    updateSegments(resetSegs);
    setSelectedSegmentId(null);
  };

  // --- Playback Logic (Gap Skipping) ---
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationFrameId: number;

    const loop = () => {
      if (videoRef.current && !isDraggingPlayhead) {
          const t = videoRef.current.currentTime;
          setCurrentTime(t);

          if (segments.length > 0) {
             const sortedSegments = [...segments].sort((a,b) => a.start - b.start);
             
             // Check if we are inside a valid segment (with small buffer at end to trigger skip early)
             const currentSeg = sortedSegments.find(s => t >= s.start && t < s.end - 0.05);

             if (!currentSeg) {
               // We are in a gap or at end of segment
               const nextSeg = sortedSegments.find(s => s.start > t);
               if (nextSeg) {
                   // Only seek if we are far enough away (prevent jitter loop)
                   if (Math.abs(videoRef.current.currentTime - nextSeg.start) > 0.1) {
                       videoRef.current.currentTime = nextSeg.start;
                   }
               } else {
                   // End of timeline
                   // Check if we are past the last segment's end
                   const lastSeg = sortedSegments[sortedSegments.length - 1];
                   if (t >= lastSeg.end - 0.1) {
                        setIsPlaying(false);
                        videoRef.current.pause();
                        videoRef.current.currentTime = sortedSegments[0].start;
                   }
               }
             }
          }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDraggingPlayhead, segments]);

  // --- Actions ---

  const handleSplit = () => {
    if (!videoRef.current) return;
    const splitTime = videoRef.current.currentTime;
    
    // Find segment containing splitTime
    const segIndex = segments.findIndex(s => splitTime > s.start + 0.1 && splitTime < s.end - 0.1);
    if (segIndex === -1) return; 

    const seg = segments[segIndex];
    const left: TimeRange = { id: uuidv4(), start: seg.start, end: splitTime };
    const right: TimeRange = { id: uuidv4(), start: splitTime, end: seg.end };

    const newSegments = [...segments];
    newSegments.splice(segIndex, 1, left, right);
    updateSegments(newSegments);
    setSelectedSegmentId(right.id);
  };

  const handleDelete = () => {
    if (!selectedSegmentId) return;
    const newSegments = segments.filter(s => s.id !== selectedSegmentId);
    updateSegments(newSegments);
    setSelectedSegmentId(null);
    
    // If we deleted the current segment, try to jump to a valid spot
    if (videoRef.current && newSegments.length > 0) {
        const t = videoRef.current.currentTime;
        const sorted = [...newSegments].sort((a,b) => a.start - b.start);
        const inSeg = sorted.some(s => t >= s.start && t < s.end);
        if (!inSeg) {
            const next = sorted.find(s => s.start > t) || sorted[0];
            videoRef.current.currentTime = next.start;
            setCurrentTime(next.start);
        }
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const t = videoRef.current.currentTime;
      const sorted = [...segments].sort((a,b) => a.start - b.start);
      // If start from gap, jump to next
      if (sorted.length > 0) {
          const inSeg = sorted.some(s => t >= s.start && t < s.end - 0.05);
          if (!inSeg) {
              const next = sorted.find(s => s.start > t) || sorted[0];
              videoRef.current.currentTime = next.start;
          }
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 20));

  // --- Layout Calculation (Memoized) ---
  const layout = useMemo(() => {
      let currentPixelX = 0;
      // Sort segments for display consistency
      const sortedSegments = [...segments].sort((a,b) => a.start - b.start);
      
      const layoutItems: Array<{ 
          segment: TimeRange, 
          left: number, 
          width: number 
      }> = [];

      sortedSegments.forEach(seg => {
          const segDuration = seg.end - seg.start;
          const segWidth = segDuration * zoomLevel;
          
          let visualLeft = currentPixelX;
          
          // Gap Simulation during drag
          if (dragState && dragState.segmentId === seg.id && dragState.type === 'start') {
             const deltaSeconds = seg.start - dragState.initialStart;
             if (deltaSeconds > 0) {
                 const gapWidth = deltaSeconds * zoomLevel;
                 visualLeft += gapWidth;
                 currentPixelX += gapWidth;
             }
          }

          layoutItems.push({
              segment: seg,
              left: visualLeft,
              width: segWidth
          });
          
          currentPixelX += segWidth;
      });

      return { items: layoutItems, totalWidth: currentPixelX };
  }, [segments, zoomLevel, dragState]);

  // --- Playhead Drag & Scroll ---
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPlayhead(true);
      if (isPlaying) {
          setIsPlaying(false);
          videoRef.current?.pause();
      }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
       if (isDraggingPlayhead && timelineContentRef.current && timelineScrollRef.current) {
           const contentRect = timelineContentRef.current.getBoundingClientRect();
           const scrollRect = timelineScrollRef.current.getBoundingClientRect();
           
           // Auto-scroll logic
           const EDGE_THRESHOLD = 50;
           const SCROLL_SPEED = 15;

           if (e.clientX < scrollRect.left + EDGE_THRESHOLD) {
               timelineScrollRef.current.scrollLeft -= SCROLL_SPEED;
           } else if (e.clientX > scrollRect.right - EDGE_THRESHOLD) {
               timelineScrollRef.current.scrollLeft += SCROLL_SPEED;
           }

           // Time Calculation
           const clickX = e.clientX - contentRect.left;
           
           let foundTime = -1;
           
           // Handle scrubbing before/after visible timeline
           if (layout.items.length > 0 && clickX < layout.items[0].left) {
               foundTime = layout.items[0].segment.start;
           } else if (layout.items.length > 0 && clickX > layout.totalWidth) {
               foundTime = layout.items[layout.items.length - 1].segment.end;
           } else {
               // Hit test segments
               for(const item of layout.items) {
                  if (clickX >= item.left && clickX <= item.left + item.width) {
                      const offsetPixels = clickX - item.left;
                      const offsetSeconds = offsetPixels / zoomLevel;
                      foundTime = item.segment.start + offsetSeconds;
                      break;
                  }
               }
           }
           
           if (foundTime !== -1) {
               if (videoRef.current) {
                   videoRef.current.currentTime = foundTime;
               }
               setCurrentTime(foundTime);
           }
       }
    };

    const onUp = () => {
        setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingPlayhead, layout, zoomLevel]);

  // --- Trimming Interaction ---
  const handleTrimStart = (e: React.MouseEvent, segmentId: string, type: 'start' | 'end') => {
      e.preventDefault();
      e.stopPropagation();
      const seg = segments.find(s => s.id === segmentId);
      if(!seg) return;
      
      setDragState({
          segmentId,
          type,
          startX: e.clientX,
          initialStart: seg.start,
          initialEnd: seg.end
      });
      setSelectedSegmentId(segmentId);
  };

  useEffect(() => {
      const onMove = (e: MouseEvent) => {
          if (!dragState) return;
          
          const deltaPixels = e.clientX - dragState.startX;
          const deltaSeconds = deltaPixels / zoomLevel;
          
          setSegments(prev => prev.map(s => {
              if (s.id !== dragState.segmentId) return s;
              
              if (dragState.type === 'start') {
                  let newStart = dragState.initialStart + deltaSeconds;
                  newStart = Math.max(0, Math.min(newStart, s.end - MIN_SEGMENT_DURATION));
                  if (videoRef.current && Math.abs(videoRef.current.currentTime - newStart) > 0.1) {
                      videoRef.current.currentTime = newStart;
                      setCurrentTime(newStart);
                  }
                  return { ...s, start: newStart };
              } else {
                  let newEnd = dragState.initialEnd + deltaSeconds;
                  newEnd = Math.max(s.start + MIN_SEGMENT_DURATION, Math.min(newEnd, duration));
                  if (videoRef.current && Math.abs(videoRef.current.currentTime - newEnd) > 0.1) {
                    videoRef.current.currentTime = newEnd; 
                    setCurrentTime(newEnd);
                }
                  return { ...s, end: newEnd };
              }
          }));
      };
      
      const onUp = () => {
          if(dragState) {
              pushHistory(segments);
              setDragState(null);
          }
      };
      
      if(dragState) {
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
      }
      return () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
      };
  }, [dragState, duration, segments, zoomLevel]);

  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragState || isDraggingPlayhead) return;
      const contentRect = timelineContentRef.current?.getBoundingClientRect();
      if(!contentRect) return;
      const clickX = e.clientX - contentRect.left;
      
      let foundTime = -1;
      for(const item of layout.items) {
          if (clickX >= item.left && clickX <= item.left + item.width) {
              const offsetPixels = clickX - item.left;
              const offsetSeconds = offsetPixels / zoomLevel;
              foundTime = item.segment.start + offsetSeconds;
              break;
          }
      }

      if(foundTime !== -1 && videoRef.current) {
          videoRef.current.currentTime = foundTime;
          setCurrentTime(foundTime);
      }
  };

  let playheadPixelPos = 0;
  // Determine playhead position relative to layout
  const sortedSegs = [...segments].sort((a,b) => a.start - b.start);
  const activeLayoutItem = layout.items.find(item => 
      currentTime >= item.segment.start && currentTime <= item.segment.end
  );
  
  if (activeLayoutItem) {
      const offsetSec = currentTime - activeLayoutItem.segment.start;
      playheadPixelPos = activeLayoutItem.left + (offsetSec * zoomLevel);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 shrink-0">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" /></svg>
                Advanced Editor
            </h2>
            <div className="flex items-center gap-3">
                 <button onClick={handleReset} className="px-3 py-1.5 text-xs text-red-400 border border-red-900/50 bg-red-900/10 rounded hover:bg-red-900/30 transition mr-2">Reset</button>
                 
                 <div className="flex bg-gray-800 rounded-lg p-1 mr-2">
                    <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                    </button>
                 </div>
                 <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
                 <button 
                    onClick={() => onSave(segments)}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-green-500/20"
                >
                    Save Changes
                 </button>
            </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-black/50">
             {/* Preview Area */}
             <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[300px] overflow-hidden relative">
                {/* Replaced canvas with direct video for performance */}
                <div 
                    className="relative shadow-2xl border border-gray-800 rounded-lg overflow-hidden bg-black flex items-center justify-center" 
                    style={{ 
                        width: '800px', 
                        height: '450px', 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        aspectRatio: '16/9' 
                    }}
                >
                    <video 
                        ref={videoRef} 
                        src={videoUrl} 
                        className="w-full h-full object-contain" 
                        muted 
                        playsInline
                        preload="auto"
                        onClick={handlePlayPause}
                    />
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-white/20">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>

        {/* Timeline Panel */}
        <div className="h-60 bg-gray-900 border-t border-gray-800 flex flex-col shrink-0 relative z-10 shadow-2xl">
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
                <div className="flex items-center gap-4">
                    <button onClick={handlePlayPause} className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:bg-gray-200 transition">
                        {isPlaying ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                             <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>
                    <div className="h-4 w-px bg-gray-700"></div>
                    <button 
                        onClick={handleSplit}
                        className="flex items-center gap-2 text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" /></svg>
                         <span className="text-xs font-medium">Split</span>
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={!selectedSegmentId}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         <span className="text-xs font-medium">Delete</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleZoomOut} className="p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <span className="text-[10px] text-gray-500 font-mono w-12 text-center">{zoomLevel}px/s</span>
                    <button onClick={handleZoomIn} className="p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>

            <div 
                ref={timelineScrollRef}
                className="flex-1 relative overflow-x-auto overflow-y-hidden bg-gray-950 select-none custom-scrollbar"
            >
                <div 
                    ref={timelineContentRef}
                    className="h-full relative"
                    style={{ minWidth: '100%', width: Math.max(layout.totalWidth + 500, 1000) }}
                    onClick={handleTimelineSeek}
                >
                    {/* Time Ruler */}
                    <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-800 flex items-end pointer-events-none opacity-50">
                        {Array.from({ length: Math.ceil((layout.totalWidth + 500) / (zoomLevel * 5)) }).map((_, i) => (
                            <div key={i} className="absolute text-[10px] text-gray-500 border-l border-gray-700 pl-1 h-3" 
                                 style={{ left: i * zoomLevel * 5 }}>
                                {i * 5}s
                            </div>
                        ))}
                    </div>

                    {/* Clips Layer */}
                    <div className="absolute bottom-4 h-24 left-0 right-0"> 
                         {/* Playhead Line */}
                         <div 
                            className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex flex-col items-center group/playhead transition-transform duration-75 ${isDraggingPlayhead ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
                            style={{ left: playheadPixelPos }}
                            onMouseDown={handlePlayheadMouseDown}
                        >
                             <div className="absolute -top-3 w-4 h-4 bg-red-500 rotate-45 rounded-sm flex items-center justify-center transform hover:scale-125 transition">
                                 <div className="w-1 h-1 bg-white rounded-full"></div>
                             </div>
                             {/* Brush Area for easier grabbing */}
                             <div className="w-4 h-full bg-transparent absolute top-0 cursor-grab"></div>
                        </div>

                         {layout.items.map((item) => (
                             <div
                                key={item.segment.id}
                                style={{ 
                                    left: item.left, 
                                    width: item.width,
                                    transition: (dragState?.segmentId === item.segment.id) || isDraggingPlayhead ? 'none' : 'left 0.2s cubic-bezier(0.25, 1, 0.5, 1)' 
                                }}
                                className={`absolute bottom-0 top-2 rounded-md overflow-visible group/segment border-2 cursor-pointer
                                    ${selectedSegmentId === item.segment.id 
                                        ? 'bg-green-600/80 border-white z-20 shadow-lg' 
                                        : 'bg-green-900/40 border-green-500/30 hover:bg-green-800/60 z-10'
                                    }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSegmentId(item.segment.id);
                                }}
                            >
                                {/* Thumbnail Strips */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none flex overflow-hidden">
                                     {Array.from({ length: Math.ceil(item.width / 80) }).map((_, i) => (
                                         <div key={i} className="w-20 h-full border-r border-black/30 bg-white/10"></div>
                                     ))}
                                </div>
                                
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-mono text-white/70 bg-black/50 px-1 rounded backdrop-blur-sm">
                                        {(item.segment.end - item.segment.start).toFixed(1)}s
                                    </span>
                                </div>

                                {/* Drag Handles */}
                                <div 
                                    className="absolute -left-1.5 top-0 bottom-0 w-4 cursor-ew-resize z-30 group-hover/segment:flex hidden items-center justify-center hover:scale-110 transition-transform"
                                    onMouseDown={(e) => handleTrimStart(e, item.segment.id, 'start')}
                                >
                                    <div className="w-1.5 h-8 bg-white rounded-full shadow-md"></div>
                                </div>
                                
                                <div 
                                    className="absolute -right-1.5 top-0 bottom-0 w-4 cursor-ew-resize z-30 group-hover/segment:flex hidden items-center justify-center hover:scale-110 transition-transform"
                                    onMouseDown={(e) => handleTrimStart(e, item.segment.id, 'end')}
                                >
                                    <div className="w-1.5 h-8 bg-white rounded-full shadow-md"></div>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            </div>
            
            <div className="h-6 bg-gray-950 border-t border-gray-800 flex items-center justify-between px-4 text-[10px] text-gray-500 font-mono uppercase">
                <span>Total Duration: {(layout.totalWidth / zoomLevel).toFixed(1)}s</span>
                <span>Zoom: {zoomLevel}px/s</span>
            </div>
        </div>
    </div>
  );
};