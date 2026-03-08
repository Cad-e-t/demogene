
export interface SubtitleConfiguration {
    enabled: boolean;
    placement: 'top' | 'middle' | 'bottom';
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
    secondaryColor: string;
    highlightColor: string;
    strokeWidth: number;
    letterSpacing: number;
    textTransform: 'uppercase' | 'none' | 'capitalize';
    animationType: 'pulse_bold' | 'glow_focus' | 'impact_pop';
}

export const DEFAULT_SUBTITLE_CONFIG: SubtitleConfiguration = {
    enabled: true,
    placement: 'middle',
    fontFamily: 'Arimo',
    fontSize: 24,
    primaryColor: '#ffffff',
    secondaryColor: '#0f0f0f',
    highlightColor: '#FFFF00',
    strokeWidth: 4,
    letterSpacing: 3,
    textTransform: 'capitalize',
    animationType: 'pulse_bold'
};

export interface ContentProject {
    id: string;
    title: string;
    aspect_ratio: '9:16' | '16:9';
    image_style: string;
    picture_quality?: 'Fast' | 'Ultra' | 'Ultimate';
    voice_id: string;
    narration_style?: string;
    effect: string;
    subtitles?: SubtitleConfiguration | null;
    voice_file_path?: string | null;
    subtitle_file_path?: string | null;
    segment_durations?: number[];
    render_status?: string;
    status: 'draft' | 'generating' | 'completed' | 'failed';
    created_at: string;
}

export interface ContentSegment {
    id: string;
    project_id: string;
    narration: string;
    image_prompt: string;
    image_url: string;
    order_index: number;
}

export interface ContentStory {
    id: string;
    video_url: string;
    thumbnail_url: string;
    status: 'generating' | 'rendering' | 'completed' | 'failed';
    created_at: string;
}

export const IMAGE_STYLES = [
    "Realistic", "Cinematic", "Anime", "Cyberpunk", "Watercolor", 
    "Oil Painting", "Minimalist", "Pixar 3D", "Vintage Film", "Sketch"
];

export const VISUAL_DENSITIES = [
    { id: 'Rich', name: 'Rich', description: 'High retention (~1 img / 1 sentence)' },
    { id: 'Balanced', name: 'Balanced', description: 'Clean storytelling (~1 img / 2 sentences)' },
    { id: 'Low', name: 'Low', description: 'Minimalist (~1 img / 3 sentences)' }
];

export const PICTURE_QUALITY_OPTIONS = [
    { id: 'Fast', name: 'Fast', description: 'Quick, affordable clarity' },
    { id: 'Ultra', name: 'Ultra', description: 'Cinematic detail, premium look' },
    { id: 'Ultimate', name: 'Ultimate', description: 'Highest resolution, 2K detail' }
];

export const EFFECT_PRESETS = [
    { id: 'zoom_pulse', name: 'Zoom Pulse', description: 'Aggressive alternating zooms (High Energy)' },
    { id: 'slide_flow', name: 'Slide Flow', description: 'Smooth lateral sliding (Dynamic)' },
    { id: 'cinematic', name: 'Cinematic Pan', description: 'Slow, dramatic push-ins (Storytelling)' },
    { id: 'chaos', name: 'Chaos Mode', description: 'Random mix of zooms and slides (Viral)' },
    { id: 'handheld_walk', name: 'Handheld Walk', description: 'Natural walking camera motion (Vlog Style)' }
];

export const SUBTITLE_PRESETS = [
    { id: 'none', name: 'None', description: 'No subtitles' },
    { id: 'pulse_bold', name: 'Pulse Bold', description: 'High retention, TikTok style' },
    { id: 'glow_focus', name: 'Typewriter Glow', description: 'Words appear as read, premium look' },
    { id: 'impact_pop', name: 'Rapid Pop', description: 'One word at a time, high energy' },
    { id: 'comic_burst', name: 'Comic Burst', description: 'White text, black outline, punchy' }
];

export const NARRATION_STYLES = [
    { id: 10, name: "Charisma Dynamo", prompt: "Read in a confident, magnetic tone with dynamic pacing", description: "confident, magnetic" },
    { id: 1, name: "Shadow Puppeteer", prompt: "Read in a deep, mysterious tone with brisk, continuous delivery", description: "deep, mysterious" },
    { id: 2, name: "Firebrand", prompt: "Read in a fiery, energetic tone with brisk, continuous delivery", description: "fiery, energetic" },
    { id: 3, name: "Whispering Wind", prompt: "Read in a soft, soothing tone with flowing pacing", description: "soft, soothing" },
    { id: 4, name: "Siren's Call", prompt: "Read in a smooth, seductive tone with brisk, continuous delivery", description: "smooth, seductive" },
    { id: 5, name: "Thunder King", prompt: "Read in a bold, commanding tone with brisk, continuous delivery", description: "bold, commanding" },
    { id: 6, name: "Trickster Fox", prompt: "Read in a playful, mischievous tone with lively pacing", description: "playful, mischievous" },
    { id: 7, name: "Midnight Oracle", prompt: "Read in a deep, mystical tone with brisk, continuous delivery", description: "deep, mystical" },
    { id: 8, name: "Lightning Spark", prompt: "Read in an energetic, punchy tone with brisk, continuous delivery", description: "energetic, punchy" },
    { id: 9, name: "Iron Sage", prompt: "Read in a calm, deliberate tone with brisk, continuous delivery", description: "calm, deliberate" },
    { id: 11, name: "Gravel Titan", prompt: "Read in a gravelly, commanding tone with brisk, continuous delivery", description: "gravelly, commanding" },
    { id: 11, name: "Rumble King", prompt: "Read aloud in a raspy, powerful tone with brisk, continuous delivery", description: "raspy, powerful" },

];