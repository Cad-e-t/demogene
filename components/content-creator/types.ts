




export interface ContentProject {
    id: string;
    title: string;
    aspect_ratio: '9:16' | '16:9';
    image_style: string;
    voice_id: string;
    narration_style?: string;
    effect: string;
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
    { id: 'Balanced', name: 'Balanced', description: 'Clean storytelling (~1 img / 2 sentences)' },
    { id: 'Rich', name: 'Rich', description: 'Fast paced (~1 img / 1 sentence)' },
    { id: 'Low', name: 'Low', description: 'Minimalist (~1 img / 3 sentences)' }
];

export const EFFECT_PRESETS = [
    { id: 'zoom_pulse', name: 'Zoom Pulse', description: 'Aggressive alternating zooms (High Energy)' },
    { id: 'slide_flow', name: 'Slide Flow', description: 'Smooth lateral sliding (Dynamic)' },
    { id: 'cinematic', name: 'Cinematic Pan', description: 'Slow, dramatic push-ins (Storytelling)' },
    { id: 'chaos', name: 'Chaos Mode', description: 'Random mix of zooms and slides (Viral)' },
    { id: 'handheld_walk', name: 'Handheld Walk', description: 'Natural walking camera motion (Vlog Style)' }
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