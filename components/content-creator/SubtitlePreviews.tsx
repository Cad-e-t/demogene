export const subtitlePresets = [
  // ==========================================
  // CATEGORY 1: HIGH-RETENTION & VIRAL (The "Hormozi" & "MrBeast" Meta)
  // ==========================================
  {
    id: "preset_01_retention_monster",
    name: "The Retention Monster",
    vibe: "Aggressive, high-retention, loud",
    font: { family: "Montserrat", weight: "900", transform: "uppercase", italic: true },
    colors: { text: "#FFD700", highlight: "none", inactive: "#FFFFFF" },
    style: { 
      stroke: { width: "12px", color: "#000000" }, 
      shadow: { blur: "15px", color: "rgba(0,0,0,0.9)", offset: "0px 8px" } 
    },
    layout: { alignment: "center", maxLines: 1, position: "bottom-80px", placement: 20 },
    animation: {
      type: "word-by-word",
      in: "pop-in-spring (scale 0 to 1 with overshoot)",
      emphasis: "scale-up 130% + color switch to highlight + slight tilt (-3deg)",
      out: "hard-cut",
      easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" // Bouncy
    }
  },
  {
    id: "preset_02_beast_mode",
    name: "Beast Mode",
    vibe: "High-energy, hyperactive, striking",
    font: { family: "Komika Axis", weight: "bold", transform: "uppercase", italic: false },
    colors: { text: "#00FFFF", highlight: "none", inactive: "#AAAAAA" },
    style: { 
      stroke: { width: "10px", color: "#000000" }, 
      shadow: null 
    },
    layout: { alignment: "center", maxLines: 1, position: "center", placement: 50 },
    animation: {
      type: "word-by-word",
      in: "slam-down (scale 300% to 100% fast)",
      emphasis: "screen-shake (x/y random jitter 2px) on active word",
      out: "zoom-out-fade",
      easing: "ease-in-out"
    }
  },
  {
    id: "preset_03_podcast_ghost",
    name: "Podcast Ghost",
    vibe: "Clean, professional, engaging",
    font: { family: "Inter", weight: "800", transform: "none", italic: false },
    colors: { text: "#E0E0E0", highlight: "#FFFFFF", inactive: "rgba(255,255,255,0.3)" },
    style: { 
      stroke: { width: "12px", color: "#000000" }, 
      shadow: { blur: "10px", color: "rgba(255,255,255,0.2)", offset: "0px 0px" } 
    },
    layout: { alignment: "left", maxLines: 3, position: "middle-left", placement: 40 },
    animation: {
      type: "line-by-line-with-word-highlight",
      in: "fade-in-up",
      emphasis: "opacity jumps to 100% + glow activates",
      out: "fade-out-up",
      easing: "ease"
    }
  },
  {
    id: "preset_04_karaoke_sweep",
    name: "Tiktok Karaoke",
    vibe: "Satisfying, continuous, musical",
    font: { family: "Proxima Nova", weight: "bold", transform: "none", italic: false },
    colors: { text: "#FFFFFF", highlight: "#FF0050", inactive: "#FFFFFF" },
    style: { 
      stroke: { width: "12px", color: "#000000" }, 
      background: { type: "pill", color: "rgba(0,0,0,0.5)", padding: "10px 20px" } 
    },
    layout: { alignment: "center", maxLines: 5, position: "bottom-100px", placement: 25 },
    animation: {
      type: "continuous-fill",
      in: "slide-up",
      emphasis: "color wipe from left to right synced to audio duration",
      out: "slide-down",
      easing: "linear"
    }
  },
  {
    id: "preset_05_impact_box",
    name: "The Interrogator",
    vibe: "Shocking, loud, dramatic",
    font: { family: "Impact", weight: "normal", transform: "uppercase", italic: true },
    colors: { text: "#FFFFFF", highlight: "none", inactive: "#FFFFFF" },
    style: { 
      background: { type: "box-per-word", color: "#E60000", padding: "5px" },
      stroke: { width: "12px", color: "#000000" } 
    },
    layout: { alignment: "center", maxLines: 1, position: "bottom-center", placement: 15 },
    animation: {
      type: "word-by-word",
      in: "skew-in (skewX -20deg to 0deg) + pop",
      emphasis: "background box expands slightly",
      out: "fade-out",
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
  },

  // ==========================================
  // CATEGORY 2: WEIRD & CREATIVE (The Gen Z / Brain-rot / Art Meta)
  // ==========================================
  {
    id: "preset_06_ransomware",
    name: "Ransom Note",
    vibe: "Chaotic, weird, unhinged",
    font: { family: "Combo", weight: "bold", transform: "uppercase", italic: false },
    colors: { text: "Randomized (Black/White)", highlight: "none", inactive: "none" },
    style: { 
      background: { type: "jagged-paper", color: "Randomized (Magazines colors)", padding: "8px" },
      rotation: "Randomized (-10deg to 10deg per word)",
      stroke: { width: "12px", color: "#000000" }
    },
    layout: { alignment: "center", maxLines: 1, position: "center", placement: 50 },
    animation: {
      type: "word-by-word",
      in: "stamp-in (scale 500% down to 100% instantly)",
      emphasis: "slight random rotation shift on spoken word",
      out: "crumple-out",
      easing: "step-end"
    }
  },
  {
    id: "preset_07_vhs_glitch",
    name: "VHS Throwback",
    vibe: "Nostalgic, eerie, retro",
    font: { family: "VCR OSD Mono", weight: "normal", transform: "uppercase", italic: false },
    colors: { text: "#FFFFFF", highlight: "#FFFFFF", inactive: "#FFFFFF" },
    style: { 
      stroke: { width: "12px", color: "#000000" },
      shadow:[
        { blur: "0px", color: "#FF0000", offset: "2px 0px" }, // RGB Split Red
        { blur: "0px", color: "#00FFFF", offset: "-2px 0px" }  // RGB Split Cyan
      ]
    },
    layout: { alignment: "left", maxLines: 2, position: "bottom-15%", placement: 15 },
    animation: {
      type: "line-by-line",
      in: "static-flicker-in",
      emphasis: "chromatic aberration intensifies on active word",
      out: "tv-turn-off-shrink",
      easing: "steps(4)"
    }
  },
  {
    id: "preset_08_elastic_bubble",
    name: "Y2K Bubblegum",
    vibe: "Pop, cute, weirdly satisfying",
    font: { family: "Chewy", weight: "normal", transform: "lowercase", italic: false },
    colors: { text: "#FFB6C1", highlight: "#FF1493", inactive: "#FFB6C1" },
    style: { 
      stroke: { width: "5px", color: "#000000" },
      shadow: { blur: "0px", color: "#FF69B4", offset: "3px 3px" } 
    },
    layout: { alignment: "center", maxLines: 6, position: "bottom-center", placement: 20 },
    animation: {
      type: "word-by-word",
      in: "bubble-pop (scale X & Y elasticity)",
      emphasis: "squash-and-stretch (scaleX 1.2, scaleY 0.8 -> scaleX 0.8, scaleY 1.2 -> normal)",
      out: "float-away-up",
      easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
    }
  },
  {
    id: "preset_09_neon_twitch",
    name: "Cyber Glitch",
    vibe: "Gamer, futuristic, high-bpm",
    font: { family: "SF Pro Display", weight: "900", transform: "uppercase", italic: true },
    colors: { text: "#39FF14", highlight: "none", inactive: "#555555" }, // Lime green text, no highlight since it's word-by-word
    style: { 
      stroke: { width: "12px", color: "#000000" },
      shadow: { blur: "20px", color: "#39FF14", offset: "0px 0px" } // Neon glow
    },
    layout: { alignment: "center", maxLines: 1, position: "bottom-20%", placement: 20 },
    animation: {
      type: "word-by-word",
      in: "digital-decode (random characters shuffling into the real word)",
      emphasis: "color shift to green + heavy glow pulse",
      out: "pixelate-out",
      easing: "linear"
    }
  },
  {
    id: "preset_10_echo_chamber",
    name: "Trippy Echo",
    vibe: "Psychedelic, weird, cinematic",
    font: { family: "Helvetica Neue", weight: "100", transform: "uppercase", italic: false },
    colors: { text: "#FFFFFF", highlight: "none", inactive: "#FFFFFF" },
    style: { stroke: { width: "12px", color: "#000000" }, shadow: null },
    layout: { alignment: "center", maxLines: 1, position: "center", placement: 50 },
    animation: {
      type: "word-by-word",
      in: "zoom-in-slow",
      emphasis: "word spawns 3 ghost copies behind it that scale up infinitely and fade to 0% opacity",
      out: "blur-out",
      easing: "ease-out"
    }
  },

  // ==========================================
  // CATEGORY 3: AESTHETIC & EASYGOING (Vlogs, Storytimes, Relaxing)
  // ==========================================
  {
    id: "preset_11_aesthetic_whisper",
    name: "Aesthetic Vlog",
    vibe: "Calm, minimal, elegant",
    font: { family: "Lora", weight: "normal", transform: "none", italic: true },
    colors: { text: "#FDFDFD", highlight: "#EADDCA", inactive: "#FDFDFD" }, // Almond highlight
    style: { 
        stroke: { width: "12px", color: "#000000" },
        shadow: { blur: "4px", color: "rgba(0,0,0,0.3)", offset: "1px 1px" } 
    },
    layout: { alignment: "center", maxLines: 5, position: "middle-bottom", placement: 35 },
    animation: {
      type: "line-by-line",
      in: "slow-fade-in-blur (blur 10px to 0px)",
      emphasis: "subtle scale up 105% on current word without changing color drastically",
      out: "slow-fade-out",
      easing: "ease-in-out"
    }
  },
  {
    id: "preset_12_typewriter_pro",
    name: "Noir Typewriter",
    vibe: "Storytelling, true crime, historical",
    font: { family: "Courier New", weight: "bold", transform: "none", italic: false },
    colors: { text: "#FFFFFF", highlight: "#FFFFFF", inactive: "#FFFFFF" },
    style: { 
        stroke: { width: "12px", color: "#000000" },
        background: { type: "full-line", color: "rgba(0,0,0,0.8)", padding: "2px" } 
    },
    layout: { alignment: "left", maxLines: 4, position: "bottom-10%", placement: 10 },
    animation: {
      type: "letter-by-letter",
      in: "typewriter (hard cuts, no fading)",
      emphasis: "none (relies on the typing speed matching the voice)",
      out: "cut-to-black",
      easing: "step-end"
    }
  },
  {
    id: "preset_13_floating_poetry",
    name: "Floating Poetry",
    vibe: "Easygoing, dreamy, sad/emotional",
    font: { family: "Cormorant Garamond", weight: "300", transform: "none", italic: false },
    colors: { text: "#FFFFFF", highlight: "#FFFFFF", inactive: "#888888" },
    style: { stroke: { width: "3px", color: "#000000" } },
    layout: { alignment: "center", maxLines: 4, position: "center", placement: 50 },
    animation: {
      type: "word-by-word-accumulate", // Words stay on screen
      in: "drift-up-fade (Y+20px to 0px)",
      emphasis: "opacity 100%",
      out: "dissolve-smoke",
      easing: "ease-out"
    }
  },
  {
    id: "preset_14_minimalist_apple",
    name: "Tech Keynote",
    vibe: "Premium, Apple-style, easygoing",
    font: { family: "SF Pro Display", weight: "600", transform: "none", italic: false },
    colors: { text: "#000000", highlight: "#0071E3", inactive: "#000000" }, // Apple blue
    style: { 
      stroke: { width: "12px", color: "#FFFFFF" },
      background: { type: "rounded-box", color: "rgba(255,255,255,0.9)", blur: "backdrop-blur 10px" } 
    },
    layout: { alignment: "center", maxLines: 6, position: "bottom-15%", placement: 15 },
    animation: {
      type: "line-by-line",
      in: "smooth-slide-up-fade",
      emphasis: "color transition only (smooth crossfade to blue)",
      out: "smooth-slide-down-fade",
      easing: "cubic-bezier(0.25, 1, 0.5, 1)"
    }
  },
  {
    id: "preset_15_handwritten_diary",
    name: "Journal Entry",
    vibe: "Personal, intimate, lifestyle",
    font: { family: "Caveat", weight: "bold", transform: "none", italic: false },
    colors: { text: "#2A2A2A", highlight: "#D9534F", inactive: "#2A2A2A" },
    style: { 
        stroke: { width: "10px", color: "#FFFFFF" },
        background: { type: "paper-texture", color: "#F9F6EE" } 
    },
    layout: { alignment: "left", maxLines: 3, position: "center-right", placement: 50 },
    animation: {
      type: "continuous-draw", // SVG path drawing animation
      in: "ink-bleed-in",
      emphasis: "slight jiggle (handheld camera effect)",
      out: "fade-out",
      easing: "ease"
    }
  },

  // ==========================================
  // CATEGORY 4: ADVANCED/3D MULTIMEDIA (High Production Value)
  // ==========================================
  {
    id: "preset_16_3d_slam",
    name: "Blockbuster 3D",
    vibe: "Cinematic, heavy, extreme retention",
    font: { family: "Bebas Neue", weight: "normal", transform: "uppercase", italic: false },
    colors: { text: "#FF4500", highlight: "none", inactive: "#FFFFFF" },
    style: { 
      stroke: { width: "12px", color: "#000000" },
      extrusion: { depth: "10px", color: "#555555" }, // Simulated 3D
      shadow: { blur: "15px", color: "rgba(0,0,0,1)", offset: "0px 15px" }
    },
    layout: { alignment: "center", maxLines: 1, position: "center", placement: 50 },
    animation: {
      type: "word-by-word",
      in: "rotate-X-3D (flip down from 90deg to 0deg)",
      emphasis: "Z-axis push forward 20%",
      out: "drop-down-gravity",
      easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    }
  },
  {
    id: "preset_17_liquid_gradient",
    name: "Mesmerizing Flow",
    vibe: "Creative, high-retention, modern",
    font: { family: "Poppins", weight: "900", transform: "none", italic: false },
    colors: { text: "#00E5FF", highlight: "#ffffff", inactive: "#7A00FF" }, // Fallback colors for pure text renderer
    style: { 
      stroke: { width: "14px", color: "#000000" },
      backgroundClip: "text", // The text masks a background
      backgroundImage: "linear-gradient(45deg, #FF007A, #7A00FF, #00E5FF)",
      backgroundSize: "200% 200%" 
    },
    layout: { alignment: "center", maxLines: 2, position: "bottom-center", placement: 20 },
    animation: {
      type: "word-by-word",
      in: "fade-in",
      emphasis: "gradient-pan (background position animates infinitely) + soft scale",
      out: "fade-out",
      easing: "linear"
    }
  },
  {
    id: "preset_18_comic_pop",
    name: "Pop-Art Comic",
    vibe: "Fun, quirky, storytelling",
    font: { family: "Bangers", weight: "normal", transform: "uppercase", italic: false },
    colors: { text: "#000000", highlight: "#a6963a", inactive: "#000000" },
    style: { 
      background: { type: "speech-bubble", color: "#FFFFFF", tail: "bottom-left" },
      stroke: { width: "12px", color: "#000000" }
    },
    layout: { alignment: "center", maxLines: 5, position: "middle-right", placement: 50 },
    animation: {
      type: "line-by-line-with-word-highlight",
      in: "pop-up-from-bottom-left (origin point at speech bubble tail)",
      emphasis: "text color switches to yellow, action lines (sparks) appear around the word",
      out: "shrink-to-tail",
      easing: "cubic-bezier(0.5, 1.5, 0.8, 1)"
    }
  },
  {
    id: "preset_19_cinematic_gold",
    name: "Luxury Documentary",
    vibe: "Expensive, informative, serious",
    font: { family: "Cinzel", weight: "700", transform: "uppercase", italic: false },
    colors: { text: "#D4AF37", highlight: "#FFFFFF", inactive: "#D4AF37" }, // Gold
    style: { 
      stroke: { width: "12px", color: "#000000" },
      shadow: { blur: "20px", color: "rgba(212, 175, 55, 0.4)", offset: "0px 0px" },
      letterSpacing: "0.2em" // Wide tracking
    },
    layout: { alignment: "center", maxLines: 1, position: "bottom-25%", placement: 25 },
    animation: {
      type: "line-by-line",
      in: "tracking-in-expand (letter spacing goes from 0em to 0.2em while fading in)",
      emphasis: "flare-sweep (a lens flare sweeps across the word)",
      out: "fade-out",
      easing: "ease-out"
    }
  },
  {
    id: "preset_20_kinetic_slap",
    name: "The Apple Event",
    vibe: "Ultra-fast, typographic, overwhelming",
    font: { family: "Helvetica Neue", weight: "900", transform: "uppercase", italic: false },
    colors: { text: "#F5F5F7", highlight: "none", inactive: "#111111" },
    style: { 
      stroke: { width: "14px", color: "#111111" },
      background: { type: "solid-screen", color: "#F5F5F7" }, // Takes up whole screen
    },
    layout: { alignment: "center", maxLines: 1, position: "center", fontSize: "15vw", placement: 50 }, // Massive text
    animation: {
      type: "word-by-word", // One single word per frame
      in: "slide-in-right-extreme (translates from 100vw to 0 in 0.1s)",
      emphasis: "none (the speed is the emphasis)",
      out: "slide-out-left-extreme",
      easing: "cubic-bezier(0.075, 0.82, 0.165, 1)"
    }
  }
];
