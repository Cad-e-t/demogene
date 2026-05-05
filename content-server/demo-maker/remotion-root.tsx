import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MotionGraphics, MotionGraphicsProps } from './MotionGraphics';

export const RemotionRoot = () => {
    return (
        <Composition
            id="MotionGraphics"
            component={MotionGraphics as React.FC<any>}
            durationInFrames={3000} // Dynamic override at render time
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
                chunks: [],
                videoDuration: 10
            } as MotionGraphicsProps}
        />
    );
};

registerRoot(RemotionRoot);
