import React, { useMemo } from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { theme } from './theme';
import { computeSegmentFrames } from './alignment-utils';

export type SmartCaptionsProps = {
  filesData: any[]; // Used to determine when visual media is playing
  transcription: any;
  fps: number;
  width?: number;
  height?: number;
  highlightedWords?: any;
  demoSegments?: any[];
  segmentDurations?: number[];
}

const MIN_GAP_FRAMES = 20; // 1.5 seconds at 30fps

export const SmartCaptions = ({ 
  filesData, 
  transcription, 
  fps, 
  width, 
  height, 
  highlightedWords,
  demoSegments,
  segmentDurations
}: SmartCaptionsProps) => {
  const frame = useCurrentFrame();

  // 1. Calculate valid empty gaps (contains >= 2 spoken words)
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

  // 2. Check if current frame falls within a valid gap
  const currentGap = validGaps.find(g => frame >= g.start && frame < g.end);
  const isPortrait = width && height ? width < height : true;

  const stickerShadowWidth = !isPortrait ? 8 : 16;
  const stickerShadows = useMemo(() => {
    let shadows = [];
    for (let angle = 0; angle < 360; angle += 3) {
      const x = (Math.cos((angle * Math.PI) / 180) * stickerShadowWidth).toFixed(2);
      const y = (Math.sin((angle * Math.PI) / 180) * stickerShadowWidth).toFixed(2);
      shadows.push(`${x}px ${y}px 0px #000000`);
    }
    shadows.push(`0px 10px 20px rgba(0,0,0,0.8)`);
    return shadows.join(', ');
  }, [stickerShadowWidth, isPortrait]);
  
  if (!isPortrait) {
    return null;
  }

  let activeMediaInterval: { start: number, end: number } | null = null;

  if (!isPortrait) {
    const activeManualMedia = filesData.find((f: any) => {
      const cleanUrl = (f.file_url || f.url || '').split('?')[0].split('#')[0].toLowerCase();
      const fileName = cleanUrl.split('/').pop() || '';
      const isMedia = /\.(jpg|jpeg|png|gif|webp|svg|mp4|mov|webm|avi|mkv|wmv)$/.test(fileName) && !fileName.includes('avatar');
      const isVideoOrImage = isMedia || f.type === 'video' || f.type === 'image';
      return isVideoOrImage && frame >= (f.start || 0) && frame < (f.end || 0);
    });

    let activeSegmentImage: { start: number, end: number } | null = null;
    if (!activeManualMedia) {
      const sorted = [...(demoSegments || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      
      const segmentFrames = computeSegmentFrames(sorted, transcription);
      
      if (segmentFrames.length > 0) {
        for (let idx = 0; idx < segmentFrames.length; idx++) {
          const seg = sorted[idx];
          const { start, end } = segmentFrames[idx];

          if (frame >= start && frame < end) {
            if (seg && seg.image_url) {
              activeSegmentImage = { start, end };
            }
            break;
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

          if (frame >= start && frame < end) {
            if (seg && seg.image_url) {
              activeSegmentImage = { start, end };
            }
            break;
          }
        }
      }
    }

    const activeMedia = activeManualMedia || activeSegmentImage;

    if (!activeMedia) {
      return null; // For 16:9, caption only visible when media is on screen
    }

    activeMediaInterval = {
      start: activeMedia.start || 0,
      end: activeMedia.end || 0
    };
  }

  if (!transcription || !transcription.words) {
      return null;
  }

  // 3. Filter words
  let wordsToSearch = transcription.words;
  if (!isPortrait) {
      if (activeMediaInterval) {
          wordsToSearch = transcription.words.filter((w: any) => w.start >= activeMediaInterval.start && w.start < activeMediaInterval.end);
      } else {
          return null;
      }
  } else {
      // In 9:16, we search all words up to current frame + buffer
      wordsToSearch = transcription.words.filter((w: any) => w.start <= frame + 30);
  }

  if (wordsToSearch.length === 0) {
      return null;
  }

  // 4. Find the active word (last word whose start is <= frame)
  let activeIdx = -1;
  for (let i = 0; i < wordsToSearch.length; i++) {
      if (wordsToSearch[i].start <= frame) {
          activeIdx = i;
      } else {
          break;
      }
  }

  if (activeIdx === -1) {
      return null; // No word spoken yet
  }
  
  const activeWord = wordsToSearch[activeIdx];
  // Don't show subtitle if the word ended more than 15 frames ago
  // Since it's always in big mode, we don't apply the 15-frame rule so it doesn't blink out between words rapidly, 
  // but let's apply it if it's too long ago? Actually it shouldn't matter since the next word will replace it.
  
  // 5. Dynamic word limits based on aspect ratio
  const maxWords = isPortrait ? 1 : 4;

  const chunkIdx = Math.floor(activeIdx / maxWords);
  const startIndex = chunkIdx * maxWords;
  const currentWords = wordsToSearch.slice(startIndex, startIndex + maxWords);

  // Calculate dynamic scale pop for the active word (only in portrait mode)
  let scale = 1;
  if (isPortrait && activeWord) {
    const popProgress = (frame - (activeWord.start || 0)) / 5;
    if (popProgress >= 0 && popProgress <= 1) {
      scale = 1 + 0.15 * Math.sin(popProgress * Math.PI);
    }
  }

  const renderWordText = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const isHighlighted = Array.isArray(highlightedWords) && highlightedWords.some((w: string) => 
        w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanText && cleanText.length > 0
    );

    if (isHighlighted) {
      return (
        <span style={{ color: '#34C759' }}>
          {text}
        </span>
      );
    }

    const chars = Array.from(text);
    const hasDigits = /[0-9]/.test(text);
    const hasDollar = text.includes('$');

    if (hasDollar) {
      return (
        <span style={{ color: '#34C759' }}>
          {text}
        </span>
      );
    }

    return chars.map((char, index) => {
      const isDigit = /[0-9]/.test(char);
      const isCurrency = /[$€£¥₩₹]/.test(char);
      
      let isCommaOrDecimalInNumber = false;
      if ((char === ',' || char === '.') && hasDigits) {
        isCommaOrDecimalInNumber = true;
      }

      let color = isPortrait ? '#FFDE00' : '#FFFFFF';
      if (isDigit || isCommaOrDecimalInNumber) {
        color = '#26cc4a'; // elegant red
      } else if (isCurrency) {
        color = '#34C759'; // elegant green
      }

      return (
        <span key={index} style={{ color }}>
          {char}
        </span>
      );
    });
  };

  const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: !isPortrait ? '12px' : '20px',
        maxWidth: !isPortrait ? '90%' : '85%',
        position: 'absolute',
        bottom: !isPortrait ? '5%' : '40%'
  };

  const fontSize = !isPortrait ? 39 : 48;
  
  const textShadow = !isPortrait
    ? `
      -1.5px -1.5px 0 #000000, 
       1.5px -1.5px 0 #000000,
      -1.5px  1.5px 0 #000000, 
       1.5px  1.5px 0 #000000,
      -1.5px  0px 0 #000000, 
       1.5px  0px 0 #000000, 
       0px -1.5px 0 #000000, 
       0px  1.5px 0 #000000, 
       0px  4px 8px rgba(0,0,0,0.8)
    `
    : `
      -2.5px -2.5px 0 #000000, 
       2.5px -2.5px 0 #000000,
      -2.5px  2.5px 0 #000000, 
       2.5px  2.5px 0 #000000,
      -2.5px  0px 0 #000000, 
       2.5px  0px 0 #000000, 
       0px -2.5px 0 #000000, 
       0px  2.5px 0 #000000, 
       0px  4px 8px rgba(0,0,0,0.8)
    `;

  const renderedWords = currentWords.map((w: any, idx: number) => {
    const globalIdx = startIndex + idx;
    return (
      <span
        key={globalIdx}
        style={{
          display: 'inline-block',
          margin: !isPortrait ? '0 5px' : '0 12px',
          transform: `scale(${scale})`,
        }}
      >
        {renderWordText(w.text)}
      </span>
    );
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap');
        .smart-caption-text {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 900;
        }
      `}} />
      <div style={containerStyle}>
        <div style={{ display: 'grid' }}>
          {/* Background thick stroke for the "sticker" effect */}
          <div
            className="smart-caption-text"
            style={{
              gridArea: '1 / 1',
              fontSize: fontSize,
              letterSpacing: !isPortrait ? '-0.02em' : '-0.05em',
              color: '#000000',
              textAlign: 'center',
              WebkitTextStroke: !isPortrait ? '14px #000000' : '32px #000000',
              textTransform: !isPortrait ? 'none' : 'uppercase',
              textShadow: stickerShadows,
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              lineHeight: !isPortrait ? '0.5' : '1.1',
              zIndex: 1,
            }}
          >
            {renderedWords}
          </div>
          
          {/* Foreground text */}
          <div
            className="smart-caption-text"
            style={{
              gridArea: '1 / 1',
              fontSize: fontSize,
              letterSpacing: !isPortrait ? '-0.02em' : '-0.05em',
              color: '#FFFFFF',
              textAlign: 'center',
              textTransform: !isPortrait ? 'none' : 'uppercase',
              textShadow: textShadow,
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              lineHeight: !isPortrait ? '0.5' : '1.1',
              zIndex: 2,
            }}
          >
            {renderedWords}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
