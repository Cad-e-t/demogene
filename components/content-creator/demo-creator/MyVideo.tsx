import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BackgroundFX } from './BackgroundFX';
import { ImageFrame } from './ImageFrame';
import { Avatar } from './Avatar';
import { VideoClip } from './VideoClip';
import { AI } from './AI';
import { SmartCaptions } from './SmartCaptions';

export type MyVideoProps = {
  audioUrl: string | null;
  filesData: any[];
  transcription: any;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  highlightedWords?: any;
}

const PhoneMockup: React.FC<{children: React.ReactNode, width: number, height: number}> = ({ children, width, height }) => {
  const scale = 0.82;
  const bezelWidth = 36;
  const notchWidth = width * scale * 0.4;
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: width * scale,
      height: height * scale,
      transform: 'translate(-50%, -50%)',
      borderRadius: '65px',
      border: `${bezelWidth}px solid #111`,
      boxSizing: 'content-box',
      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 0 0 4px #333',
      backgroundColor: '#000',
      overflow: 'hidden',
      zIndex: 10
    }}>
      {/* Notch */}
      <div style={{
        position: 'absolute',
        top: -2,
        left: '50%',
        transform: 'translateX(-50%)',
        width: notchWidth,
        height: '45px',
        backgroundColor: '#111',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        zIndex: 100
      }}>
        {/* Camera dot */}
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '25%',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#0a0a0a',
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.2)'
        }} />
        <div style={{
          position: 'absolute',
          top: '19px',
          left: '30%',
          width: '30%',
          height: '4px',
          borderRadius: '4px',
          backgroundColor: '#222',
        }} />
      </div>
      
      {/* Scaled Inner Container */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        backgroundColor: 'transparent',
      }}>
        {children}
      </div>
    </div>
  );
};

const MIN_GAP_FRAMES = 20; // Match with SmartCaptions.tsx

const PhoneMockupWrapper: React.FC<{
  children: React.ReactNode;
  width: number;
  height: number;
  filesData: any[];
  transcription: any;
}> = ({ children, width, height, filesData, transcription }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const validGaps = useMemo(() => {
    if (!filesData || filesData.length === 0) return [{ start: 0, end: Infinity }];
    
    const intervals = filesData.map((f: any) => ({ start: f.start || 0, end: f.end || 0 }));
    intervals.sort((a, b) => a.start - b.start);
    
    const merged: {start: number, end: number}[] = [];
    for (const curr of intervals) {
      if (merged.length === 0) {
        merged.push({ ...curr });
      } else {
        const last = merged[merged.length - 1];
        if (curr.start <= last.end) {
          last.end = Math.max(last.end, curr.end);
        } else {
          merged.push({ ...curr });
        }
      }
    }
    
    const gapsList: {start: number, end: number}[] = [];
    if (merged[0].start > 0) {
      gapsList.push({ start: 0, end: merged[0].start });
    }
    for (let i = 0; i < merged.length - 1; i++) {
      gapsList.push({ start: merged[i].end, end: merged[i + 1].start });
    }
    gapsList.push({ start: merged[merged.length - 1].end, end: Infinity });
    
    return gapsList.filter(g => {
      if (!transcription || !transcription.words) return g.end - g.start >= MIN_GAP_FRAMES;
      
      const wordsInGap = transcription.words.filter((w: any) => w.start >= g.start && w.start < g.end);
      return wordsInGap.length >= 2;
    });
  }, [filesData, transcription]);

  const bRollClips = useMemo(() => {
    return filesData.filter((f: any) => {
       const url = (f.file_url || f.url || '').toLowerCase();
       return url.includes('b-roll');
    });
  }, [filesData]);

  const mockupSegments = useMemo(() => {
    const points = new Set<number>([0, Infinity]);
    
    validGaps.forEach(g => {
      points.add(g.start);
      points.add(g.end);
    });
    
    bRollClips.forEach(c => {
      points.add(c.start || 0);
      points.add(c.end || 0);
    });
    
    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    
    const segments = [];
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      if (start === end) continue;
      
      const mid = start + 0.1;
      const isBigCap = validGaps.some(g => mid >= g.start && mid < g.end);
      const isBRoll = bRollClips.some(c => mid >= (c.start || 0) && mid <= (c.end || 0));
      
      if (!isBigCap && !isBRoll) {
        segments.push({ start, end });
      }
    }
    return segments;
  }, [validGaps, bRollClips]);

  const currentMockupSegment = mockupSegments.find(s => frame >= s.start && frame < s.end);
  const showPhoneMockup = !!currentMockupSegment;

  if (!showPhoneMockup || !currentMockupSegment) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const slideIn = spring({
    frame: frame - currentMockupSegment.start,
    fps,
    config: {
      damping: 12,
      stiffness: 150,
      mass: 0.5,
    }
  });

  const translateX = interpolate(slideIn, [0, 1], [width, 0]);

  return (
    <AbsoluteFill style={{ transform: `translateX(${translateX}px)` }}>
      <PhoneMockup width={width} height={height}>
        {children}
      </PhoneMockup>
    </AbsoluteFill>
  );
};

export const MyVideo: React.FC<MyVideoProps> = ({ 
  audioUrl, 
  filesData, 
  transcription, 
  fps, 
  width, 
  height, 
  durationInFrames,
  highlightedWords
}) => {
  
  const visualClips = useMemo(() => {
    return filesData.map(visual => {
        const cleanUrl = (visual.file_url || '').split('?')[0].split('#')[0].toLowerCase();
        const fileName = cleanUrl.split('/').pop() || '';
        
        let type = 'unknown';
        
        if (/\.(mp4|mov|webm|avi|mkv|wmv)$/.test(fileName)) {
          type = 'video';
        } 
        else if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(fileName)) {
          type = fileName.includes('avatar') ? 'avatar' : 'image';
        }

        return {
          ...visual,
          type,
        };
    });
  }, [filesData]);

  const isPortrait = width < height;

  const content = (
    <>
      <AI 
        filesData={filesData} 
        transcription={transcription} 
        fps={fps} 
        width={width} 
        height={height} 
        durationInFrames={durationInFrames} 
      />
      
      <SmartCaptions filesData={filesData} transcription={transcription} fps={fps} width={width} height={height} highlightedWords={highlightedWords} />
      <VideoClip visualClips={visualClips} />
      <ImageFrame visualClips={visualClips} />
      <Avatar visualClips={visualClips} />
    </>
  );

  return (
    <AbsoluteFill>
      <BackgroundFX />
      
      {isPortrait ? (
        <PhoneMockupWrapper width={width} height={height} filesData={filesData} transcription={transcription}>
          {content}
        </PhoneMockupWrapper>
      ) : (
        content
      )}
      
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
