
export interface SubtitleConfiguration {
    enabled: boolean;
    placement: number;
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
    secondaryColor: string;
    highlightColor: string;
    strokeWidth: number;
    letterSpacing: number;
    textTransform: 'uppercase' | 'none' | 'capitalize';
    animationType: 'pulse_bold' | 'glow_focus' | 'impact_pop';
    maxWords?: number;
}

export const DEFAULT_SUBTITLE_CONFIG: SubtitleConfiguration = {
    enabled: true,
    placement: 35,
    fontFamily: 'Arimo',
    fontSize: 54,
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
    voice_id: string;
    narration_style?: string;
    effect: string | string[];
    subtitles?: SubtitleConfiguration | null;
    subtitle_state?: 'enabled' | 'disabled';
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
    "Realistic", "Anime", "Horror", 'SoftCartoon', 'Exaggerated2D', "Sketch", "Stickman", 'FlatCartoon'
];

export const EFFECT_PRESETS = [
    { id: 'chaos', name: 'Chaos Mode', description: 'Random mix of zooms and slides (Viral)' },
    { id: 'zoom_pulse', name: 'Zoom Pulse', description: 'Aggressive alternating zooms (High Energy)' },
    { id: 'slide_flow', name: 'Slide Flow', description: 'Smooth lateral sliding (Dynamic)' },
    { id: 'cinematic', name: 'Cinematic Pan', description: 'Slow, dramatic push-ins (Storytelling)' },
    { id: 'handheld_walk', name: 'Handheld Walk', description: 'Natural walking camera motion (Vlog Style)' }
];

export const LONG_FORM_PRESETS = [
    { id: 'documentary', name: 'Documentary', description: 'Subtle pushes and slow drifts (Professional)' },
    { id: 'immersive', name: 'Immersive', description: 'Organic floating and slow reveals (Cinematic)' },
    { id: 'storyteller', name: 'Storyteller', description: 'Slow dolly moves and breathing camera (Engaging)' },
    { id: 'minimalist', name: 'Minimalist', description: 'Static frames with very subtle motion (Clean)' }
];

export const SUBTITLE_PRESETS = [
    { id: 'none', name: 'None', description: 'No subtitles' },
    { id: 'pulse_bold', name: 'Pulse Bold', description: 'High retention, TikTok style' },
    { id: 'glow_focus', name: 'Typewriter Glow', description: 'Words appear as read, premium look' },
    { id: 'impact_pop', name: 'Rapid Pop', description: 'One word at a time, high energy' },
    { id: 'comic_burst', name: 'Comic Burst', description: 'White text, black outline, punchy' }
];

export const NARRATION_STYLES = [
    { id: 1, name: "Charismatic", prompt: "Read aloud in a calm, deliberate tone with brisk continuous delivery", description: "confident, magnetic", sampleUrl: "https://assets.productcam.site/audio-assets/charismatic.wav" },
    { id: 2, name: "High-energy", prompt: "Read in a fiery, energetic tone with brisk, continuous delivery", description: "fiery, energetic", sampleUrl: "https://assets.productcam.site/audio-assets/high-energy.wav" },
    { id: 3, name: "Gentle", prompt: "Read briskly in a soft tone", description: "soft, soothing", sampleUrl: "https://assets.productcam.site/audio-assets/gentle.mp3" },
    { id: 4, name: "Cheeky", prompt: "Read in a playful, mischievous tone with lively pacing", description: "playful, mischievous", sampleUrl: "https://assets.productcam.site/audio-assets/cheeky.wav" },
    { id: 5, name: "Intense", prompt: "Read aloud in a raspy, powerful tone with brisk, continuous delivery", description: "raspy, powerful", sampleUrl: "https://assets.productcam.site/audio-assets/confident.wav" },
];