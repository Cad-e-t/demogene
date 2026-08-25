import React, { useEffect, useState } from "react"; 
import { Img, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender, Easing } from "remotion"; 
import { theme } from "./theme";

interface SingleImageFrameProps { 
  src: string; 
  startFrame: number; 
  endFrame: number; 
  caption?: string; 
  maxWidth?: number; 
  maxHeight?: number; 
  isSegmentImage?: boolean;
  filesData?: any[];
}

const INTRO_FRAMES = 6;
const fitWithinBounds = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) => { 
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight); 
  return { width: naturalWidth * scale, height: naturalHeight * scale }; 
};

const SingleImageFrame: React.FC<SingleImageFrameProps> = ({ src, startFrame, endFrame, caption, maxWidth, maxHeight, isSegmentImage, filesData }) => { 
  const frame = useCurrentFrame(); 
  const { fps, width: compWidth, height: compHeight } = useVideoConfig();

  // Fall back to the composition size so this adapts to any aspect ratio 
  const boundsWidth = maxWidth ?? compWidth; 
  const boundsHeight = maxHeight ?? compHeight;

  const [handle] = useState(() => delayRender(`Fetching image metadata for ${src}`)); 
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => { 
    const img = new Image(); 
    img.src = src; 
    img.onload = () => { 
      setDimensions({ width: img.width, height: img.height }); 
      continueRender(handle); 
    }; 
    img.onerror = () => { 
      console.error(`Failed to load image metadata for ${src}`); 
      setDimensions({ width: 1080, height: 1080 }); 
      continueRender(handle); 
    }; 
  }, [src, handle]);

  if (!dimensions) return null; 

  const local = frame - startFrame; 
  const duration = endFrame - startFrame;

  // Only visible for the image's own window — hard cut, no outro animation 
  if (local < 0 || local > duration) return null;

  if (isSegmentImage && filesData) {
    const manualActive = filesData.some((f: any) => {
      return frame >= (f.start || 0) && frame < (f.end || 0);
    });
    if (manualActive) return null;
  }

  const { width, height } = isSegmentImage 
    ? { width: compWidth, height: compHeight } 
    : fitWithinBounds(dimensions.width, dimensions.height, boundsWidth, boundsHeight);
  const isPortraitSize = isSegmentImage || boundsWidth <= boundsHeight;
  const radius = isPortraitSize ? 0 : 20;

  // --- basic intro: quick fade in --- 
  const finalOpacity = interpolate(local, [0, INTRO_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const scale = isSegmentImage 
    ? interpolate(local, [0, duration], [1, 1.1], { extrapolateRight: "clamp" })
    : 1;

  return ( 
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${scale})`, opacity: finalOpacity, width, height }}> 
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}> 
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />  
      </div>
      {caption && ( 
        <div style={{ position: "absolute", bottom: -44, left: 0, fontFamily: theme.font.family, fontWeight: 600, fontSize: 26, color: theme.colors.yellow, opacity: finalOpacity }}> 
          {caption}  
        </div>
      )}  
    </div>
  ); 
};

// Wrapper Component 
export const ImageFrame: React.FC<{ visualClips: any[], filesData?: any[] }> = ({ visualClips, filesData }) => {
  const imageClips = visualClips.filter(clip => clip.type === 'image');
  
  return (
    <>
      {imageClips.map((clip, i) => (
        <SingleImageFrame 
          key={i} 
          src={clip.file_url || clip.url} 
          startFrame={clip.start} 
          endFrame={clip.end} 
          isSegmentImage={clip.isSegmentImage}
          filesData={filesData}
        />
      ))}
    </>
  );
};
