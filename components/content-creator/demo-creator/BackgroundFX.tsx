import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "./theme";

// Cinematic backdrop: dark base + a slow diagonal light sweep + vignette +
// subtle film grain + a barely-perceptible whole-scene drift (Ken Burns).
// This sits BEHIND everything else in MyVideo.tsx.

const LightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // One slow diagonal sweep across the entire duration — a beam of light
  // drifting through, cinematic-trailer style. Loops if you extend duration.
  const progress = (frame % durationInFrames) / durationInFrames;
  const x = interpolate(progress, [0, 1], [-60, 160]); // vw units, overshoots both edges

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: `${x}%`,
          width: "40%",
          height: "140%",
          background:
            `linear-gradient(100deg, transparent, ${theme.colors.yellow}22 45%, ${theme.colors.yellowBright}33 50%, ${theme.colors.yellow}22 55%, transparent)`,
          transform: "rotate(12deg)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
};

const Vignette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 50%, rgba(60, 50, 20, 0.35) 100%)`,
      pointerEvents: "none",
    }}
  />
);

// Static SVG noise texture for grain. Cheap (no per-frame recompute), just a
// low-opacity overlay that reads as "film" rather than "digital."
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  // Subtle opacity flicker so grain doesn't look like a static sticker.
  const opacity = interpolate(
    Math.sin(frame * 0.9),
    [-1, 1],
    [0.035, 0.07]
  );

  return (
    <svg
      style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "overlay" }}
      width="100%"
      height="100%"
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
};

export const BackgroundFX: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #302e92 0%, #373d96 100%)" }}>
      <LightSweep />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};

// Wrap any layer in this for a slow, near-imperceptible zoom over the whole
// video — the classic "faceless video" camera-isn't-static trick.
export const CameraDrift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.06]);

  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};
