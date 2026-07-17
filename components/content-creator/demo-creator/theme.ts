export const theme = {
  colors: {
    bg: "#08080a",       // near-black base
    bgDeep: "#000000",   // pure black for vignette edges
    yellow: "#F4C430",   // primary accent — highlights, glows
    yellowBright: "#FFE066", // hotter yellow for glow cores
    white: "#F5F3EE",    // off-white for body captions (not pure white — reads more cinematic)
  },
  font: {
    // Default is a safe system font. For a more cinematic feel, swap in a
    // condensed/display face via @remotion/google-fonts, e.g.:
    //   import { loadFont } from "@remotion/google-fonts/BebasNeue";
    //   const { fontFamily } = loadFont();
    family: "Inter, system-ui, sans-serif",
  },
};
