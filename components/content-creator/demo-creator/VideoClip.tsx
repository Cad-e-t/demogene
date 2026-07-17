import React, { useEffect, useState, useMemo } from "react"; 
import { OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender, Easing } from "remotion"; 
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

const EDGE_MARGIN_RATIO = 0.1;

const fitWithinBounds = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) => { 
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight); 
  return { width: naturalWidth * scale, height: naturalHeight * scale }; 
};

// Cache buster logic intact
const bypassCache = (url: string, callerId: string) => {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("corsBypass", callerId); 
    return parsedUrl.toString();
  } catch (e) {
    return url;
  }
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
        <OffthreadVideo
          src={src}
          muted={muted}
          startFrom={0}
          playbackRate={playbackRate}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {!isPortrait && (
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: `0 0 24px 4px ${theme.colors.yellow}66, 0 0 0 1px ${theme.colors.yellow}aa`, pointerEvents: "none" }} /> 
      )}

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

  const edgeMargin = Math.min(compWidth, compHeight) * EDGE_MARGIN_RATIO;
  const isPortrait = compWidth < compHeight;
  const boundsWidth = isPortrait ? compWidth : maxWidth ?? compWidth - edgeMargin * 2; 
  const boundsHeight = isPortrait ? compHeight : maxHeight ?? compHeight - edgeMargin * 2;

  const duration = endFrame - startFrame;

  const [handle] = useState(() => delayRender(`Fetching video metadata for ${src}`)); 
  const [metadata, setMetadata] = useState<{ duration: number; width: number; height: number } | null>(null);

  const metaUrl = useMemo(() => bypassCache(src, "meta-call"), [src]);

  // IMPORTANT FIX: do NOT cache-bust playback URL
  const videoUrl = useMemo(() => src, [src]);

  useEffect(() => { 
    let cancelled = false;

    const preload = async () => {
      try {
        const meta = await getVideoMetadata(metaUrl);
        if (!cancelled) {
          setMetadata({
            duration: meta.durationInSeconds,
            width: meta.width,
            height: meta.height,
          });
          continueRender(handle);
        }
      } catch (err) {
        console.error("Failed to fetch video metadata via @remotion/media-utils", err);
        // Fallback to standard HTML video element
        try {
          const video = document.createElement("video");
          video.src = metaUrl; // Use metaUrl here just in case
          video.preload = "metadata";

          await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error("Video failed to load metadata"));
          });

          if (!cancelled) {
            setMetadata({
              duration: video.duration || 10,
              width: video.videoWidth || 1080,
              height: video.videoHeight || 1080,
            });
            continueRender(handle);
          }
        } catch (fallbackErr) {
          console.error("Fallback video metadata load failed", fallbackErr);
          if (!cancelled) {
            setMetadata({
              duration: 10,
              width: 1080,
              height: 1080,
            });
            continueRender(handle);
          }
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
    };
  }, [metaUrl, videoUrl, handle]);

  if (metadata === null) return null; 

  return (
    <Sequence from={startFrame} durationInFrames={duration} layout="none">
      <InnerClip
        src={videoUrl}
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
