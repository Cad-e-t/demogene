
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

export interface VoiceStyleConfig {
    style: string;
    pace: string;
    accent: string;
}

export interface ContentProject {
    id: string;
    title: string;
    aspect_ratio: '9:16' | '16:9';
    image_style: string;
    voice_id: string;
    narration_style?: VoiceStyleConfig;
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
    "Realistic", "Anime", "Horror", "Skeleton", "GameCinematic", 'CartoonHorror', 'SoftCartoon', 'Exaggerated2D', '3DCartoon', "Sketch", "Stickman", 'FlatCartoon'
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

export const VOICE_STYLES = [
    { id: 'deadpan', name: 'The Deadpan', description: 'Meme content, Reddit readings, Gen-Z humor', prompt: 'Flat, minimal pitch variation, dry, understated, and subtly sarcastic.' },

    { id: 'storyteller', name: 'Storyteller', description: 'TikTok storytelling, suspense, narrative hooks', prompt: 'Neutral, slightly tense, with anticipatory inflection, and a subtle edge that builds intrigue.'},

    { id: 'conversational', name: 'Conversational', description: 'Storytime, pop-culture gossip, vlogs', prompt: 'Natural, expressive, relaxed articulation, casual, and friendly.' },

    { id: 'authoritative', name: 'Authoritative', description: 'Stoicism, epic history lore, cinematic', prompt: 'Low pitch, firm articulation, confident, and commanding.' },

    { id: 'analytical', name: 'Analytical', description: 'Video essays, science, tech explainers', prompt: 'Clear, precise, neutral, objective, with subtle inquisitive inflection.' },

    { id: 'warm', name: 'Warm', description: 'Cozy vlogs, mindfulness, journaling', prompt: 'Soft, warm, gentle projection, and smooth.' },

    { id: 'whisper', name: 'Whisper', description: 'True crime, horror, internet mysteries', prompt: 'Very soft with subtle tension, and a faint ominous edge.' },

    { id: 'sophisticated', name: 'Sophisticated', description: 'Luxury showcases, art critique, high-end', prompt: 'Smooth, refined articulation, composed, and understated.' },

    { id: 'broadcaster', name: 'Broadcaster', description: 'Top 10 lists, trivia shorts, life hacks', prompt: 'Bright, clear, punchy consonants, dynamic, with rhythmic pitch variation.' }
];

export const VOICE_PACES = [
    { id: 'natural', name: 'Natural', prompt: 'Natural conversation pace' },
    { id: 'fast', name: 'Fast', prompt: 'Fast, energetic, no dead air' },
    { id: 'steady', name: 'Steady', prompt: 'Slow, liquid, zero urgency.' },
    { id: 'clipped', name: 'Clipped', prompt: 'Short, clipped sentences with distinct pauses between words.' }
];

export const VOICE_ACCENTS = [
    { id: 'american', name: 'American (Gen)', prompt: 'American (Gen)' },
    { id: 'british', name: 'British', prompt: 'British' }
];