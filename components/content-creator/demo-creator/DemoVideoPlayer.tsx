import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { MyVideo } from './MyVideo';

interface DemoVideoPlayerProps {
    videoUrl: string;
    audioUrl: string | null;
    totalAudioDuration?: number;
    segments: any[];
    segmentDurations: number[];
    transcription: any | null;
    filesData?: any[];
    subtitleStyle: any;
    hookStyle: any;
    aspectRatio: '9:16' | '16:9';
    isPlaying: boolean;
    onPlayPause: () => void;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    videoTransform?: any;
    onVideoTransformChange?: (transform: any) => void;
    backgroundType: string;
    scriptBreakdown?: any[];
    motionGraphicsEnabled?: boolean;
}

export const DemoVideoPlayer: React.FC<DemoVideoPlayerProps> = ({
    audioUrl,
    totalAudioDuration,
    transcription,
    filesData = [],
    aspectRatio,
    subtitleStyle,
    isPlaying,
    onPlayPause,
    currentTime,
    onTimeUpdate
}) => {
    const playerRef = useRef<PlayerRef>(null);
    const fps = 30;
    
    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;

    const [audioDurationFrames, setAudioDurationFrames] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (audioUrl) {
            getAudioDurationInSeconds(audioUrl)
                .then((duration) => {
                    if (!cancelled && duration > 0) {
                        setAudioDurationFrames(Math.max(Math.round(duration * fps), 30));
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch audio duration", err);
                });
        }
        return () => { cancelled = true; };
    }, [audioUrl, fps]);

    const durationInFrames = useMemo(() => {
        if (audioUrl && audioDurationFrames !== null) {
            return audioDurationFrames;
        }
        if (totalAudioDuration && totalAudioDuration > 0) {
            return Math.max(Math.round(totalAudioDuration * fps), 30);
        }
        if (transcription && transcription.words && transcription.words.length > 0) {
            const lastWord = transcription.words[transcription.words.length - 1];
            return Math.max(lastWord.end + 30, 30);
        }
        return 300; 
     }, [totalAudioDuration, audioUrl, audioDurationFrames, transcription]);

    useEffect(() => {
        if (playerRef.current) {
            if (isPlaying) {
                try {
                    playerRef.current.play();
                } catch (e) {
                    console.warn('Play interrupted', e);
                }
            } else {
                playerRef.current.pause();
            }
        }
    }, [isPlaying]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-4 sm:p-6 md:p-8 overflow-hidden select-none">
            <div 
                className="relative rounded-xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center"
                style={{
                    aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: aspectRatio === '16:9' ? '100%' : 'auto',
                    height: aspectRatio === '9:16' ? '100%' : 'auto',
                }}
            >
                <Player
                    ref={playerRef}
                    component={MyVideo}
                    inputProps={{
                        audioUrl,
                        filesData,
                        transcription,
                        fps,
                        width,
                        height,
                        durationInFrames,
                        highlightedWords: subtitleStyle
                    }}
                    durationInFrames={durationInFrames}
                    fps={fps}
                    compositionWidth={width}
                    compositionHeight={height}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    controls
                />
            </div>
        </div>
    );
};
