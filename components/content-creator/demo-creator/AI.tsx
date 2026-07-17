import React from "react";
import { AbsoluteFill } from "remotion";

export interface AIProps {
  filesData: any[];
  transcription: any;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}

export const AI: React.FC<AIProps> = ({ filesData, transcription, fps, width, height, durationInFrames }) => {
  return (
    <AbsoluteFill>
      {/* AI Generated Motion Graphics go here */}
    </AbsoluteFill>
  );
};
