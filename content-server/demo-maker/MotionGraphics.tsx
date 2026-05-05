import React, { useState, useEffect } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate, delayRender, continueRender } from 'remotion';

export interface Chunk {
    start: number;
    end: number;
    text: string;
    type: string;
    duration: number;
}

export interface MotionGraphicsProps {
    chunks: Chunk[];
    videoDuration: number;
}

export const MotionGraphics: React.FC<MotionGraphicsProps> = ({ chunks, videoDuration }) => {
    const { fps, width, height } = useVideoConfig();
    const frame = useCurrentFrame();
    const currentTime = frame / fps;
    const [handle] = useState(() => delayRender("Loading Fonts"));

    useEffect(() => {
        const loadFonts = async () => {
            const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@800;900&family=Montserrat:wght@900&display=swap";
            const link = document.createElement("link");
            link.href = fontUrl;
            link.rel = "stylesheet";
            document.head.appendChild(link);
            
            await document.fonts.ready;
            continueRender(handle);
        };
        loadFonts();
    }, [handle]);

    return (
        <AbsoluteFill style={{ backgroundColor: '#00FF00' }}>
            {chunks.map((chunk, index) => {
                const isActive = currentTime >= chunk.start && currentTime <= chunk.end; // Linger removed
                if (!isActive) return null;

                const tOffset = currentTime - chunk.start;

                if (chunk.type === 'base') {
                    // One word at a time on screen
                    const words = chunk.text.trim().split(/\s+/).filter(Boolean);
                    const wordDuration = chunk.duration / words.length;
                    
                    // Find active word
                    const activeWIdx = Math.floor(tOffset / wordDuration);
                    if (activeWIdx < 0 || activeWIdx >= words.length) return null;
                    
                    const word = words[activeWIdx];
                    const wordStartTime = activeWIdx * wordDuration;
                    const wordFrame = Math.max(0, (tOffset - wordStartTime) * fps);
                    
                    const scale = spring({
                        fps,
                        frame: wordFrame,
                        config: { damping: 12 }
                    });

                    return (
                        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }} key={index}>
                            <div style={{ position: 'relative', transform: `scale(${scale})`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {/* Stroke layer map to Canvas strokeText + shadow */}
                                <h1 style={{ 
                                    fontFamily: '"Inter", "Helvetica", sans-serif', 
                                    fontWeight: 800, 
                                    fontSize: 130,
                                    color: 'transparent',
                                    WebkitTextStroke: '20px black',
                                    textShadow: '0px 10px 20px rgba(0,0,0,0.8)',
                                    textAlign: 'center',
                                    margin: 0,
                                    position: 'absolute',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {word}
                                </h1>
                                {/* Fill layer map to Canvas fillText */}
                                <h1 style={{ 
                                    fontFamily: '"Inter", "Helvetica", sans-serif', 
                                    fontWeight: 800, 
                                    fontSize: 130,
                                    color: 'white',
                                    textAlign: 'center',
                                    margin: 0,
                                    position: 'relative',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {word}
                                </h1>
                            </div>
                        </AbsoluteFill>
                    );
                }

                if (chunk.type === 'emphasis') {
                    // Pop in all at once
                    const scale = spring({
                        fps,
                        frame: Math.max(0, tOffset * fps),
                        config: { damping: 12 }
                    });

                    return (
                        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }} key={index}>
                            <h1 style={{ 
                                fontFamily: '"Inter", "Helvetica", sans-serif', 
                                fontWeight: 900, 
                                fontSize: 150,
                                color: '#EF4444',
                                textShadow: '8px 8px 20px rgba(0,0,0,0.8)',
                                textAlign: 'center',
                                transform: `scale(${scale})`,
                                maxWidth: '90%',
                                lineHeight: '1.2',
                                margin: 0,
                                wordWrap: 'break-word'
                            }}>
                                {chunk.text.trim()}
                            </h1>
                        </AbsoluteFill>
                    );
                }

                if (chunk.type === 'list-marker') {
                    const slideUp = spring({
                        fps,
                        frame: Math.max(0, tOffset * fps),
                        config: { damping: 14 }
                    });
                    
                    const yOffset = interpolate(slideUp, [0, 1], [height, 0]);
                    
                    // Word by word reveal
                    const words = chunk.text.trim().split(/\s+/).filter(Boolean);
                    const wordRevealDurs = 0.2; // 0.2s between words

                    return (
                        <AbsoluteFill style={{ overflow: 'hidden' }} key={index}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#18181b', // dark gray
                                borderTop: '40px solid #a855f7', // purple
                                boxShadow: '0 -20px 80px rgba(168, 85, 247, 0.5)',
                                transform: `translateY(${yOffset}px)`,
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignContent: 'center',
                                padding: '100px',
                                gap: '30px 40px'
                            }}>
                                {words.map((word, wIdx) => {
                                    const wordOffset = (tOffset - (wIdx * wordRevealDurs)) * fps;
                                    const wordSlide = spring({
                                        fps,
                                        frame: Math.max(0, wordOffset),
                                        config: { damping: 12 }
                                    });
                                    const wordY = interpolate(wordSlide, [0, 1], [50, 0]);

                                    return (
                                        <h1 key={wIdx} style={{ 
                                            fontFamily: '"Inter", "Helvetica", sans-serif', 
                                            fontWeight: 800, 
                                            fontSize: 160,
                                            color: 'white',
                                            margin: 0,
                                            transform: `translateY(${wordY}px)`,
                                            opacity: wordSlide,
                                            lineHeight: '1.2'
                                        }}>
                                            {word}
                                        </h1>
                                    );
                                })}
                            </div>
                        </AbsoluteFill>
                    );
                }

                if (chunk.type === 'intro-number') {
                    const inProgress = Math.min(1, tOffset / 0.15);
                    const outProgress = tOffset > chunk.duration ? Math.min(1, (tOffset - chunk.duration) / 0.2) : 0;
                    
                    let scale = 1;
                    if (tOffset <= 0.15) {
                        scale = 3 - (2 * inProgress);
                    } else if (tOffset > chunk.duration) {
                        scale = 1 + (9 * outProgress);
                    }

                    return (
                        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }} key={index}>
                            <div style={{ 
                                position: 'relative', 
                                transform: `scale(${scale})`, 
                                opacity: tOffset <= 0.15 ? inProgress : 1,
                                maxWidth: '90%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <h1 style={{ 
                                    fontFamily: '"Montserrat", "Impact", sans-serif', 
                                    fontWeight: 900, 
                                    fontSize: 300,
                                    color: 'transparent',
                                    WebkitTextStroke: '10px black',
                                    textShadow: '0px 10px 20px rgba(0,0,0,0.5)',
                                    textAlign: 'center',
                                    margin: 0,
                                    lineHeight: '1.2',
                                    wordWrap: 'break-word',
                                    position: 'absolute',
                                    width: '100%'
                                }}>
                                    {chunk.text.trim()}
                                </h1>
                                <h1 style={{ 
                                    fontFamily: '"Montserrat", "Impact", sans-serif', 
                                    fontWeight: 900, 
                                    fontSize: 300,
                                    color: 'white',
                                    textAlign: 'center',
                                    margin: 0,
                                    lineHeight: '1.2',
                                    wordWrap: 'break-word',
                                    position: 'relative'
                                }}>
                                    {chunk.text.trim()}
                                </h1>
                            </div>
                        </AbsoluteFill>
                    );
                }

                return null;
            })}
        </AbsoluteFill>
    );
};
