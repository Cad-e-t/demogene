import React, { useEffect, useState } from "react"; 
import { Video, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender } from "remotion"; 
import { getVideoMetadata } from "@remotion/media-utils"; 
import { theme } from "./theme";

interface SingleVideoClipProps { 
  src: string; 
  startFrame: number; 
  endFrame: number; 
  caption?: string; 
  muted?: boolean;
  maxWidth?: number;
  maxHeight?: number; 
}

const INTRO_FRAMES = 12;

const fitWithinBounds = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) => { 
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight); 
  return { width: naturalWidth * scale, height: naturalHeight * scale }; 
};

interface InnerClipProps {
  src: string;
  duration: number;
  metadata: { duration: number; width: number; height: number };
  fps: number;
  boundsWidth: number;
  boundsHeight: number;
  caption?: string;
  muted: boolean;
}

const InnerClip: React.FC<InnerClipProps> = ({
  src,
  duration = 1,
  metadata,
  fps,
  boundsWidth,
  boundsHeight,
  caption,
  muted,
}) => {
  const local = useCurrentFrame();

  const sourceDurationInFrames = metadata.duration * fps; 
  const safeDuration = Math.max(duration, 1);
  const rawPlaybackRate = sourceDurationInFrames / safeDuration; 
  const playbackRate = Math.min(Math.max(rawPlaybackRate, 0.0625), 16);

  const introSpring = spring({ frame: local, fps, config: { damping: 16, stiffness: 140 } }); 
  const introScale = interpolate(introSpring, [0, 1], [0.94, 1]); 
  const finalOpacity = interpolate(local, [0, INTRO_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const scale = introScale;

  const { width, height } = fitWithinBounds(metadata.width, metadata.height, boundsWidth, boundsHeight);
  const isPortrait = boundsWidth <= boundsHeight;
  const radius = isPortrait ? 0 : 20;

  return ( 
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${scale})`, opacity: finalOpacity, width, height }}> 
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}> 
        <Video
          src={src}
          muted={muted}
          startFrom={0}
          playbackRate={playbackRate}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {caption && ( 
        <div style={{ position: "absolute", bottom: -44, left: 0, fontFamily: theme.font.family, fontWeight: 600, fontSize: 26, color: theme.colors.yellow, opacity: finalOpacity }}> 
          {caption}  
        </div>
      )}  
    </div>
  ); 
};

const SingleVideoClip: React.FC<SingleVideoClipProps> = ({ src, startFrame, endFrame, caption, muted = true, maxWidth, maxHeight }) => { 
  const { fps, width: compWidth, height: compHeight } = useVideoConfig();

  const boundsWidth = maxWidth ?? compWidth; 
  const boundsHeight = maxHeight ?? compHeight;

  const duration = endFrame - startFrame;

  const [handle] = useState(() => delayRender(`Fetching video metadata for ${src}`)); 
  const [metadata, setMetadata] = useState<{ duration: number; width: number; height: number } | null>(null);

  useEffect(() => { 
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const meta = await getVideoMetadata(src);
        if (!cancelled && meta && meta.durationInSeconds && !isNaN(meta.durationInSeconds) && meta.durationInSeconds > 0) {
          setMetadata({
            duration: meta.durationInSeconds,
            width: meta.width || 1080,
            height: meta.height || 1080,
          });
          continueRender(handle);
          return;
        }
      } catch (err) {
        console.warn("getVideoMetadata failed, trying HTML5 video element fallback", err);
      }

      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = src;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = (e) => reject(e || new Error("Video failed to load metadata"));
        });

        if (!cancelled) {
          if (video.duration && video.duration !== Infinity && !isNaN(video.duration)) {
            setMetadata({
              duration: video.duration,
              width: video.videoWidth || 1080,
              height: video.videoHeight || 1080,
            });
            continueRender(handle);
            return;
          }
        }
      } catch (fallbackErr) {
        console.warn("HTML5 video metadata load failed, using fallback defaults", fallbackErr);
      }

      if (!cancelled) {
        setMetadata({
          duration: 10,
          width: 1080,
          height: 1080,
        });
        continueRender(handle);
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [src, handle]);

  if (metadata === null) return null; 

  return (
    <Sequence from={startFrame} durationInFrames={duration} layout="none">
      <InnerClip
        src={src}
        duration={duration}
        metadata={metadata}
        fps={fps}
        boundsWidth={boundsWidth}
        boundsHeight={boundsHeight}
        caption={caption}
        muted={muted}
      />
    </Sequence>
  );
};

export const VideoClip: React.FC<{ visualClips: any[] }> = ({ visualClips }) => {
  const videoClips = visualClips.filter(clip => clip.type === 'video');

  return (
    <>
      {videoClips.map((clip, i) => (
        <SingleVideoClip 
          key={i} 
          src={clip.file_url || clip.url} 
          startFrame={clip.start} 
          endFrame={clip.end} 
        />
      ))}
    </>
  );
};
