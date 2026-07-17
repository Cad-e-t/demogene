import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MyVideo, MyVideoProps } from '../../components/content-creator/demo-creator/MyVideo';

export const RemotionRoot = () => {
    return (
        <Composition
            id="MyVideo"
            component={MyVideo as React.FC<any>}
            durationInFrames={300} // Dynamic override at render time
            fps={30}
            width={1080}
            height={1920}
            defaultProps={{
                audioUrl: null,
                filesData: [],
                transcription: null,
                fps: 30,
                width: 1080,
                height: 1920,
                durationInFrames: 300
            } as MyVideoProps}
        />
    );
};

registerRoot(RemotionRoot);
