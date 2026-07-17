import React, { useMemo } from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { theme } from './theme';

export interface SmartCaptionsProps {
  filesData: any[]; // Used to determine when visual media is playing
  transcription: any;
  fps: number;
  width?: number;
  height?: number;
}

const MIN_GAP_FRAMES = 45; // 1.5 seconds at 30fps

export const SmartCaptions: React.FC<SmartCaptionsProps> = ({ filesData, transcription, fps, width, height }) => {
  const frame = useCurrentFrame();

  // 1. Calculate valid empty gaps (duration >= MIN_GAP_FRAMES)
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
    
    return gapsList.filter(g => g.end - g.start >= MIN_GAP_FRAMES);
  }, [filesData]);

  // 2. Check if current frame falls within a valid gap
  const currentGap = validGaps.find(g => frame >= g.start && frame < g.end);
  const isPortrait = width && height ? width < height : true;
  const isBigCaptionMode = !!currentGap;

  if (!isBigCaptionMode && !isPortrait) {
      return null;
  }

  if (!transcription || !transcription.words) {
      return null;
  }

  // 3. Filter words
  const wordsToSearch = isBigCaptionMode 
    ? transcription.words.filter((w: any) => w.start >= currentGap.start && w.start < currentGap.end)
    : transcription.words.filter((w: any) => {
        // Only show subtitle if the word is relatively close to the frame so it doesn't linger forever
        // but it's simpler to just filter out words that fall in a gap, or just use all words.
        return true;
      });

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
  if (!isBigCaptionMode && activeWord.end && frame > activeWord.end + 15) {
      return null;
  }

  // 5. Dynamic word limits based on aspect ratio
  const maxWords = isPortrait ? 1 : 5;

  const chunkIdx = Math.floor(activeIdx / maxWords);
  const startIndex = chunkIdx * maxWords;
  const currentWords = wordsToSearch.slice(startIndex, startIndex + maxWords);

  // Calculate dynamic scale pop for the active word in portrait mode
  let scale = 1;
  if (isPortrait && activeWord) {
    const popProgress = (frame - (activeWord.start || 0)) / 5;
    if (popProgress >= 0 && popProgress <= 1) {
      scale = 1 + 0.25 * Math.sin(popProgress * Math.PI);
    }
  }

  const renderWordText = (text: string) => {
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

    return chars.map((char: string, index: number) => {
      const isDigit = /[0-9]/.test(char);
      const isCurrency = /[$€£¥₩₹]/.test(char);
      
      let isCommaOrDecimalInNumber = false;
      if ((char === ',' || char === '.') && hasDigits) {
        isCommaOrDecimalInNumber = true;
      }

      let color = '#FFFFFF';
      if (isDigit || isCommaOrDecimalInNumber) {
        color = '#FF3B30'; // elegant red
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

  const containerStyle: React.CSSProperties = isBigCaptionMode 
    ? {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        maxWidth: '85%',
      }
    : {
        position: 'absolute',
        bottom: '28%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        maxWidth: '85%',
        width: '100%',
      };

  const fontSize = isBigCaptionMode ? (isPortrait ? 140 : 55) : 65;
  const textShadow = isBigCaptionMode && isPortrait ? `
    -5px -5px 0 #000000,  
     5px -5px 0 #000000,
    -5px  5px 0 #000000,
     5px  5px 0 #000000,
    -5px  0px 0 #000000,
     5px  0px 0 #000000,
     0px -5px 0 #000000,
     0px  5px 0 #000000,
     0px  16px 32px rgba(0,0,0,0.8)
  ` : `
    -6px -6px 0 #000000,  
     6px -6px 0 #000000,
    -6px  6px 0 #000000,
     6px  6px 0 #000000,
    -6px  0px 0 #000000,
     6px  0px 0 #000000,
     0px -6px 0 #000000,
     0px  6px 0 #000000,
     0px  12px 24px rgba(0,0,0,0.8)
  `;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');
        .smart-caption-text {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
      `}} />
      <div style={containerStyle}>
        <div
          className="smart-caption-text"
          style={{
            fontSize: fontSize,
            letterSpacing: isPortrait ? '-0.05em' : '-0.03em',
            color: '#FFFFFF',
            textAlign: 'center',
            textTransform: 'uppercase',
            textShadow: textShadow,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            lineHeight: isPortrait ? '1.1' : '1.4',
          }}
        >
          {currentWords.map((w: any, idx: number) => {
            const globalIdx = startIndex + idx;
            return (
              <span
                key={globalIdx}
                style={{
                  display: 'inline-block',
                  margin: isPortrait ? '0 12px' : '0 8px',
                  transform: isPortrait ? `scale(${scale})` : 'none',
                }}
              >
                {renderWordText(w.text)}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
