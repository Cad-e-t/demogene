import React, { useEffect, useState } from "react"; 
import { Img, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender } from "remotion"; 

interface SingleAvatarProps { 
  src: string; 
  startFrame: number; 
  endFrame: number; 
  maxWidth?: number; 
  maxHeight?: number; 
}

// Avatars fill this fraction of the composition's width/height, so they 
// automatically fill the frame correctly whatever aspect ratio (9:16, 16:9, etc.) 
// the composition is set to in Root.tsx. 
const FRAME_FILL_RATIO = 0.94;

const fitWithinBounds = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) => { 
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight); 
  return { width: naturalWidth * scale, height: naturalHeight * scale }; 
};

const SingleAvatar: React.FC<SingleAvatarProps> = ({ src, startFrame, endFrame, maxWidth, maxHeight }) => { 
  const frame = useCurrentFrame(); 
  const { fps, width: compWidth, height: compHeight } = useVideoConfig();

  // Fall back to a ratio of the composition size so this adapts to any aspect ratio 
  const isPortrait = compWidth < compHeight;
  const boundsWidth = isPortrait ? compWidth : maxWidth ?? compWidth * FRAME_FILL_RATIO; 
  const boundsHeight = isPortrait ? compHeight : maxHeight ?? compHeight * FRAME_FILL_RATIO;

  const [handle] = useState(() => delayRender(`Fetching avatar metadata for ${src}`)); 
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => { 
    const img = new Image(); 
    img.src = src; 
    img.onload = () => { 
      setDimensions({ width: img.width, height: img.height }); 
      continueRender(handle); 
    }; 
    img.onerror = () => { 
      console.error(`Failed to load avatar metadata for ${src}`); 
      setDimensions({ width: 1080, height: 1080 }); 
      continueRender(handle); 
    }; 
  }, [src, handle]);

  if (!dimensions) return null; 

  const local = frame - startFrame; 
  const duration = endFrame - startFrame;

  // Only visible for the avatar's own window — hard cut, no outro animation 
  if (local < 0 || local > duration) return null;

  const { width, height } = fitWithinBounds(dimensions.width, dimensions.height, boundsWidth, boundsHeight); 

  // --- fast pop-up animation --- 
  const popSpring = spring({ frame: local, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } }); 
  const scale = interpolate(popSpring, [0, 1], [0.6, 1]); 
  const opacity = interpolate(local, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return ( 
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${scale})`, opacity, width, height }}> 
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />  
    </div>
  ); 
};

// Wrapper Component 
export const Avatar: React.FC<{ visualClips: any[] }> = ({ visualClips }) => {
  const avatarClips = visualClips.filter(clip => clip.type === 'avatar');

  return (
    <>
      {avatarClips.map((clip, i) => (
        <SingleAvatar 
          key={i} 
          src={clip.file_url || clip.url} 
          startFrame={clip.start} 
          endFrame={clip.end} 
        />
      ))}
    </>
  );
};
