import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame } from 'remotion';
import { BackgroundFX } from './BackgroundFX';
import { ImageFrame } from './ImageFrame';
import { Avatar } from './Avatar';
import { VideoClip } from './VideoClip';
import { AI } from './AI';
import { SmartCaptions } from './SmartCaptions';
import { computeSegmentFrames } from './alignment-utils';

export type MyVideoProps = {
  audioUrl: string | null;
  filesData: any[];
  transcription: any;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  highlightedWords?: any;
  demoSegments?: any[];
  segmentDurations?: number[];
}


export const MyVideo: React.FC<MyVideoProps> = ({ 
  audioUrl, 
  filesData, 
  transcription, 
  fps, 
  width, 
  height, 
  durationInFrames,
  highlightedWords,
  demoSegments = [],
  segmentDurations = []
}) => {
  const frame = useCurrentFrame();
  
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

  const hasActiveManualClip = useMemo(() => {
    return filesData.some((f: any) => {
      return frame >= (f.start || 0) && frame < (f.end || 0);
    });
  }, [filesData, frame]);

  const activeSegmentWithoutImage = useMemo(() => {
    if (hasActiveManualClip) return null;
    
    if (!demoSegments || demoSegments.length === 0) return null;

    const sorted = [...demoSegments].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const segmentFrames = computeSegmentFrames(sorted, transcription, (durationInFrames || 0) / 30);

    for (let idx = 0; idx < segmentFrames.length; idx++) {
      const seg = sorted[idx];
      const { start, end } = segmentFrames[idx];

      if (frame >= start && frame < end) {
        if (seg && !seg.image_url && seg.image_prompt) {
          return seg;
        }
      }
    }
    
    // Fallback to segmentDurations if exact alignment failed
    if (segmentFrames.length === 0) {
      let accumulatedSeconds = 0;
      const totalSegments = Math.max(sorted.length, (segmentDurations || []).length);
      for (let idx = 0; idx < totalSegments; idx++) {
        const seg = sorted.find(s => s.order_index === idx) || sorted[idx];
        const durationSeconds = segmentDurations?.[idx] || 0;
        const start = Math.round(accumulatedSeconds * 30);
        accumulatedSeconds += durationSeconds;
        const end = Math.round(accumulatedSeconds * 30);

        if (frame >= start && frame < end) {
          if (seg && !seg.image_url && seg.image_prompt) {
            return seg;
          }
        }
      }
    }
    
    return null;
  }, [demoSegments, segmentDurations, transcription, durationInFrames, frame, hasActiveManualClip]);

  const segmentClips = useMemo(() => {
    if (!demoSegments || demoSegments.length === 0) return [];

    const sorted = [...demoSegments].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const clips: any[] = [];
    const segmentFrames = computeSegmentFrames(sorted, transcription, (durationInFrames || 0) / 30);

    if (segmentFrames.length > 0) {
      for (let idx = 0; idx < segmentFrames.length; idx++) {
        const seg = sorted[idx];
        const { start, end } = segmentFrames[idx];

        if (seg && seg.image_url && end > start) {
          clips.push({
            file_url: seg.image_url,
            url: seg.image_url,
            start,
            end,
            type: 'image',
            isSegmentImage: true,
            segmentIndex: idx
          });
        }
      }
    } else {
      let accumulatedSeconds = 0;
      const totalSegments = Math.max(sorted.length, (segmentDurations || []).length);

      for (let idx = 0; idx < totalSegments; idx++) {
        const seg = sorted.find(s => s.order_index === idx) || sorted[idx];
        const durationSeconds = segmentDurations?.[idx] || 0;
        const start = Math.round(accumulatedSeconds * 30);
        accumulatedSeconds += durationSeconds;
        const end = Math.round(accumulatedSeconds * 30);

        if (seg && seg.image_url && end > start) {
          clips.push({
            file_url: seg.image_url,
            url: seg.image_url,
            start,
            end,
            type: 'image',
            isSegmentImage: true,
            segmentIndex: idx
          });
        }
      }
    }

    return clips;
  }, [demoSegments, segmentDurations, transcription, durationInFrames]);

  const allVisualClips = useMemo(() => {
    return [...visualClips, ...segmentClips];
  }, [visualClips, segmentClips]);

  return (
    <AbsoluteFill>
      <BackgroundFX />
      
      <AI 
        filesData={filesData} 
        transcription={transcription} 
        fps={fps} 
        width={width} 
        height={height} 
        durationInFrames={durationInFrames} 
      />
      
      <SmartCaptions 
        filesData={filesData} 
        transcription={transcription} 
        fps={fps} 
        width={width} 
        height={height} 
        highlightedWords={highlightedWords} 
        demoSegments={demoSegments}
        segmentDurations={segmentDurations}
      />
      
      <VideoClip visualClips={allVisualClips} />
      <ImageFrame visualClips={allVisualClips} filesData={filesData} />
      <Avatar visualClips={allVisualClips} />
      
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
