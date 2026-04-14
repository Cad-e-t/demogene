import React, { useState, useRef, useEffect } from 'react';

export interface VideoTransform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    scale?: number; // Fallback for old data
    cropTop: number;
    cropBottom: number;
    cropLeft: number;
    cropRight: number;
}

interface CropOverlayProps {
    transform: VideoTransform;
    onChange: (t: VideoTransform) => void;
    onChangeEnd?: (t: VideoTransform) => void;
    canvasWidth: number;
    canvasHeight: number;
    videoWidth: number;
    videoHeight: number;
    containerWidth: number;
    containerHeight: number;
    isSelected: boolean;
    onSelect: () => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
    transform,
    onChange,
    onChangeEnd,
    canvasWidth,
    canvasHeight,
    videoWidth,
    videoHeight,
    containerWidth,
    containerHeight,
    isSelected,
    onSelect
}) => {
    const [isDragging, setIsDragging] = useState<string | null>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const startTransform = useRef<VideoTransform>(transform);
    const currentTransformRef = useRef<VideoTransform>(transform);

    // Update ref whenever transform changes from outside
    useEffect(() => {
        currentTransformRef.current = transform;
    }, [transform]);

    // Scale from canvas coordinates to screen coordinates
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;

    const fitScale = Math.min(canvasWidth / videoWidth, canvasHeight / videoHeight);
    const scX = transform.scaleX !== undefined ? transform.scaleX : (transform.scale || 1);
    const scY = transform.scaleY !== undefined ? transform.scaleY : (transform.scale || 1);
    
    const actualScaleX = fitScale * scX;
    const actualScaleY = fitScale * scY;

    const scaledW = videoWidth * actualScaleX;
    const scaledH = videoHeight * actualScaleY;

    const centerX = canvasWidth / 2 + transform.x;
    const centerY = canvasHeight / 2 + transform.y;

    const drawX = centerX - scaledW / 2;
    const drawY = centerY - scaledH / 2;

    const dX = drawX + scaledW * transform.cropLeft;
    const dY = drawY + scaledH * transform.cropTop;
    const dW = scaledW * (1 - transform.cropLeft - transform.cropRight);
    const dH = scaledH * (1 - transform.cropTop - transform.cropBottom);

    const screenX = dX * scaleX;
    const screenY = dY * scaleY;
    const screenW = dW * scaleX;
    const screenH = dH * scaleY;

    const handlePointerDown = (e: React.PointerEvent, action: string) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(action);
        startPos.current = { x: e.clientX, y: e.clientY };
        startTransform.current = { ...transform };
        
        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = (moveEvent.clientX - startPos.current.x) / scaleX;
            const dy = (moveEvent.clientY - startPos.current.y) / scaleY;
            
            let newT = { ...startTransform.current };
            
            if (action === 'move') {
                newT.x += dx;
                newT.y += dy;
            } else if (action.includes('resize-')) {
                const side = action.replace('resize-', '');
                
                if (side.length === 2) {
                    // Corners: Proportional resize
                    const currentScaleX = startTransform.current.scaleX !== undefined ? startTransform.current.scaleX : (startTransform.current.scale || 1);
                    const currentScaleY = startTransform.current.scaleY !== undefined ? startTransform.current.scaleY : (startTransform.current.scale || 1);
                    
                    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
                    const factor = side.includes('r') || side.includes('b') ? 1 : -1;
                    const scaleDelta = (delta * factor) / (videoHeight * fitScale);
                    newT.scaleX = Math.max(0.1, currentScaleX + scaleDelta);
                    newT.scaleY = Math.max(0.1, currentScaleY + scaleDelta);
                    
                    // Adjust position to keep opposite corner fixed
                    if (side.includes('t')) newT.y += dy / 2;
                    if (side.includes('b')) newT.y += dy / 2;
                    if (side.includes('l')) newT.x += dx / 2;
                    if (side.includes('r')) newT.x += dx / 2;
                } else if (side.length === 1) {
                    // Edges: Crop logic
                    if (side === 't') {
                        const deltaCrop = dy / scaledH;
                        newT.cropTop = Math.max(0, Math.min(1 - newT.cropBottom - 0.05, newT.cropTop + deltaCrop));
                    }
                    if (side === 'b') {
                        const deltaCrop = -dy / scaledH;
                        newT.cropBottom = Math.max(0, Math.min(1 - newT.cropTop - 0.05, newT.cropBottom + deltaCrop));
                    }
                    if (side === 'l') {
                        const deltaCrop = dx / scaledW;
                        newT.cropLeft = Math.max(0, Math.min(1 - newT.cropRight - 0.05, newT.cropLeft + deltaCrop));
                    }
                    if (side === 'r') {
                        const deltaCrop = -dx / scaledW;
                        newT.cropRight = Math.max(0, Math.min(1 - newT.cropLeft - 0.05, newT.cropRight + deltaCrop));
                    }
                }
            }
            
            currentTransformRef.current = newT;
            onChange(newT);
        };
        
        const handlePointerUp = () => {
            setIsDragging(null);
            if (onChangeEnd) {
                onChangeEnd(currentTransformRef.current);
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
        
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            <div 
                className={`absolute pointer-events-auto group ${isSelected ? 'border-2 border-yellow-500' : ''}`}
                style={{
                    left: screenX,
                    top: screenY,
                    width: screenW,
                    height: screenH,
                    cursor: isDragging === 'move' ? 'grabbing' : (isSelected ? 'grab' : 'pointer')
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!isSelected) onSelect();
                    handlePointerDown(e, 'move');
                }}
            >
                {isSelected && (
                    <>
                        {/* Grid lines */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity">
                            <div className="border-r border-b border-white/50"></div>
                            <div className="border-r border-b border-white/50"></div>
                            <div className="border-b border-white/50"></div>
                            <div className="border-r border-b border-white/50"></div>
                            <div className="border-r border-b border-white/50"></div>
                            <div className="border-b border-white/50"></div>
                            <div className="border-r border-white/50"></div>
                            <div className="border-r border-white/50"></div>
                            <div></div>
                        </div>

                        {/* 8 Handles: N, S, E, W, NE, NW, SE, SW */}
                        {/* Edges */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-ns-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-t')}>
                            <div className="w-8 h-2 bg-white border border-zinc-400 rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-ns-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-b')}>
                            <div className="w-8 h-2 bg-white border border-zinc-400 rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-ew-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-l')}>
                            <div className="w-2 h-8 bg-white border border-zinc-400 rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-ew-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-r')}>
                            <div className="w-2 h-8 bg-white border border-zinc-400 rounded-full shadow-md pointer-events-none" />
                        </div>

                        {/* Corners */}
                        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-nwse-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-tl')}>
                            <div className="w-4 h-4 bg-yellow-500 border border-white rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-nesw-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-tr')}>
                            <div className="w-4 h-4 bg-yellow-500 border border-white rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-nesw-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-bl')}>
                            <div className="w-4 h-4 bg-yellow-500 border border-white rounded-full shadow-md pointer-events-none" />
                        </div>
                        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-nwse-resize" onPointerDown={(e) => handlePointerDown(e, 'resize-br')}>
                            <div className="w-4 h-4 bg-yellow-500 border border-white rounded-full shadow-md pointer-events-none" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
