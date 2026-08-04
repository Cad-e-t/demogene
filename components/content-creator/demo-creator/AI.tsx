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

export const AI = ({ filesData, transcription, fps, width, height, durationInFrames }: AIProps) => {
  return (
    <AbsoluteFill>
      {/* AI Generated Motion Graphics go here */}
    </AbsoluteFill>
  );
};
