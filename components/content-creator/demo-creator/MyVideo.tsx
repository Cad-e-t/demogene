import React, { useMemo } from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { BackgroundFX } from './BackgroundFX';
import { ImageFrame } from './ImageFrame';
import { Avatar } from './Avatar';
import { VideoClip } from './VideoClip';
import { AI } from './AI';
import { SmartCaptions } from './SmartCaptions';

export interface MyVideoProps {
  audioUrl: string | null;
  filesData: any[];
  transcription: any;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
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

export const MyVideo: React.FC<MyVideoProps> = ({ 
  audioUrl, 
  filesData, 
  transcription, 
  fps, 
  width, 
  height, 
  durationInFrames 
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
      
      <SmartCaptions filesData={filesData} transcription={transcription} fps={fps} width={width} height={height} />
      <VideoClip visualClips={visualClips} />
      <ImageFrame visualClips={visualClips} />
      <Avatar visualClips={visualClips} />
    </>
  );

  return (
    <AbsoluteFill>
      <BackgroundFX />
      
      {isPortrait ? (
        <PhoneMockup width={width} height={height}>
          {content}
        </PhoneMockup>
      ) : (
        content
      )}
      
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
