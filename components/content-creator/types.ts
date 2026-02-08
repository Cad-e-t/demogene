



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
    { id: 'Rich', name: 'Rich', description: 'Fast paced (~1 img / 1 sentence)' }
];

export const EFFECT_PRESETS = [
    { id: 'zoom_pulse', name: 'Zoom Pulse', description: 'Aggressive alternating zooms (High Energy)' },
    { id: 'slide_flow', name: 'Slide Flow', description: 'Smooth lateral sliding (Dynamic)' },
    { id: 'cinematic', name: 'Cinematic Pan', description: 'Slow, dramatic push-ins (Storytelling)' },
    { id: 'chaos', name: 'Chaos Mode', description: 'Random mix of zooms and slides (Viral)' },
    { id: 'handheld_walk', name: 'Handheld Walk', description: 'Natural walking camera motion (Vlog Style)' }
];

export const NARRATION_STYLES = [
    { id: 10, name: "Charisma Dynamo", prompt: "Read aloud in a lively, confident, and magnetic tone", description: "lively, confident, magnetic" },
    { id: 1, name: "Shadow Puppeteer", prompt: "Read aloud in a deep, slow, and mysterious tone", description: "Suspense, drama, dark storytelling" },
    { id: 2, name: "Firebrand", prompt: "Read aloud in a fiery, energetic, and confident tone", description: "Action, announcements, hype" },
    { id: 3, name: "Whispering Wind", prompt: "Read aloud in a soft, gentle, and soothing tone", description: "Emotional, reflective, calming" },
    { id: 4, name: "Siren’s Call", prompt: "Read aloud in a smooth, seductive, and captivating tone", description: "Narrative intrigue, product reveals" },
    { id: 5, name: "Thunder King", prompt: "Read aloud in a bold, powerful, and commanding tone", description: "Authority, motivational, epic" },
    { id: 6, name: "Trickster Fox", prompt: "Read aloud in a playful, witty, and mischievous tone", description: "Humor, quirky, lighthearted" },
    { id: 7, name: "Midnight Oracle", prompt: "Read aloud in a deep, slow, mystical tone", description: "Fantasy, mystery, immersive" },
    { id: 8, name: "Lightning Spark", prompt: "Read aloud in a fast, energetic, punchy tone", description: "High-energy shorts, tutorials" },
    { id: 9, name: "Iron Sage", prompt: "Read aloud in a calm, wise, and deliberate tone", description: "Educational, tips & advice" },
];