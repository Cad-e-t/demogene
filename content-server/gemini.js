
import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview"; // Using Gemini 3 Pro for reasoning
const IMAGE_MODEL = "gemini-2.5-flash-image"; // Nano Banana for images (Ultra quality per mapping)
const FAST_IMAGE_MODEL = "imagen-4.0-fast-generate-001"; // Fast quality per mapping
const ULTIMATE_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const STYLE_OPENINGS = {
    'Realistic': 'A realistic depiction of',
    'Cinematic': 'A cinematic shot of',
    'Anime': 'An anime illustration of',
    'Cyberpunk': 'A cyberpunk digital art of',
    'Watercolor': 'A watercolor painting of',
    'Oil Painting': 'An oil painting of',
    'Minimalist': 'A minimalist illustration of',
    'Pixar 3D': 'A Pixar 3D render of',
    'Vintage Film': 'A vintage film style illustration of',
    'Sketch': 'A pencil sketch of',
    '3D Render': 'A 3D render of',
    'Silhouette': 'A flat minimal editorial illustration of',
    'Comic Book': 'A comic book illustration of',
    'Pixel Art': 'A pixel art of',
    'Surrealism': 'A surrealist painting of',
    'Pop Art': 'A pop art illustration of',
    'Gothic': 'A gothic style illustration of',
    'Steampunk': 'A steampunk digital art of',
    'Vaporwave': 'A vaporwave style digital art of',
    'Ukiyo-e': 'An ukiyo-e style woodblock print of',
    'Retro': 'A retro style illustration of',
    'Futuristic': 'A futuristic digital art of',
    'Abstract': 'An abstract painting of',
    'Fantasy': 'A fantasy illustration of',
    'Sci-Fi': 'A sci-fi digital art of',
    'Horror': 'A horror style illustration of',
};

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const opening = STYLE_OPENINGS[style] || `A ${style} style image of`;

    const isSilhouette = style === 'Silhouette';
    const visualIdentityBlock = isSilhouette ? `

Every image is a flat minimal editorial illustration. Pure white background. Flat matte black silhouette figures. All props and environment rendered as flat matte black outlines. No color, no shading, no lighting, no texture anywhere. Mood is communicated through posture, body language, and composition only.
` : `

Before writing any image prompt, analyze the script and visual style to define and lock the following. Derive each value entirely from the script's tone, subject matter, and the selected visual style — do not use placeholder or example values:
- One specific color palette
- One lighting style
- One mood
- One recurring environment or background world
Once defined, these values are fixed for the entire video. Repeat them naturally in every image prompt without variation.
`;

    const systemPrompt = `
You are an expert visual director and prompt engineer.
Your task is to analyze a user's script, define a locked visual identity, and split the script into segments with hyper-specific, consistent image prompts.

INPUTS:
- Script: ${prompt}
- Aspect Ratio: ${aspect}
- Visual Style: ${style}
- Visual Density: ${visualDensity}

SCRIPT HANDLING:
1. Use the user's text EXACTLY as provided.
2. You may ONLY fix obvious spelling or punctuation errors.
3. Optimize the script for natural narration flow.

SEGMENTATION LOGIC:
- Count total sentences in the script.
- 'Rich': Final segment count MUST equal total sentences (1 sentences per segment).
- 'Balanced': Final segment count MUST equal half of total sentences, rounded to nearest whole number (2 sentences per segment).
- 'Low': Final segment count MUST equal one third of total sentences, rounded to nearest whole number (3 sentences per segment).
- You may break sentences between segments ONLY if it creates a more significant visual moment.

VISUAL IDENTITY LOCK:
${visualIdentityBlock}

IMAGE PROMPT RULES:
1. Start every prompt with exactly this opening: "${opening}"
2. Describe ONE focal subject with surgical precision — specify exact material (e.g. worn leather, brushed steel, cracked concrete), surface texture, dominant and secondary colors, size relative to frame, and exact position in frame (e.g. centered foreground, lower left third, filling upper half)
3. Describe the environment with equal specificity — name the setting, what surrounds the subject, what is visible in the background, and what is absent or empty. Leave nothing to assumption
4. Every prompt must include the lighting direction and quality, mood, color palette, and environment established in the Visual Identity Lock
5. Vary camera angles across segments — cycle through: wide establishing, close-up, macro, aerial, eye-level, low angle
6. When human presence is needed, always depict figures from behind, from the side, at a distance, or with faces naturally obscured by angle, shadow, or framing — never generate visible facial features or identifiable faces
7. Format composition for ${aspect === "9:16" ? "9:16 portrait, tall vertical frame" : "16:9 landscape, wide horizontal frame"}
8. Maximum 100 words per prompt. Use every word to add specificity — no filler, no vague descriptors, no abstract concepts that cannot be seen

OUTPUT FORMAT:
Return ONLY a raw JSON array. No markdown, no preamble, no explanation.
[
  { "narration": "...", "image_prompt": "..." },
  ...
]
    `;

    console.log("--- GEMINI INPUT (generateStorySegments) ---");
    console.log(systemPrompt);
    console.log("-------------------------------------------");

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemPrompt,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 2000 }
        }
    });

    console.log("--- GEMINI RESPONSE (generateStorySegments) ---");
    console.log(response.text);
    console.log("----------------------------------------------");

    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse Gemini response", response.text);
        throw new Error("AI Generation failed to produce valid JSON");
    }
}

export async function generateImage(prompt, aspect, quality = 'Fast') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert aspect ratio string to simplified ratio for config if needed, 
    // but nano-banana (gemini-2.5-flash-image) usually takes standard aspect ratios.
    // However, the SDK documentation for generateContent with image models is simpler.
    // We will use generateContent with text prompt to get an image.
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

    // Model Selection based on Quality Mapping:
    // Fast -> imagen-4.0-fast-generate-001
    // Ultra -> gemini-2.5-flash-image
    // Ultimate -> gemini-3.1-flash-image-preview
    
    let model = FAST_IMAGE_MODEL;
    if (quality === 'Ultra') {
        model = IMAGE_MODEL;
    } else if (quality === 'Ultimate') {
        model = ULTIMATE_IMAGE_MODEL;
    }

    if (model === ULTIMATE_IMAGE_MODEL) {
        // Gemini 3.1 Flash Image Flow
        const response = await ai.models.generateContent({
            model: ULTIMATE_IMAGE_MODEL,
            contents: prompt,
            config: {
                imageConfig: {
                    aspectRatio: ar,
                    imageSize: "2K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    } else if (model === IMAGE_MODEL) {
        // Nano Banana (Gemini Image) Flow
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: ar
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    } else {
        // Imagen 4.0 Flow (Using generateImages)
        const response = await ai.models.generateImages({
            model: FAST_IMAGE_MODEL,
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: ar,
                outputMimeType: 'image/png'
            }
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
    }

    throw new Error("No image data generated");
}

export async function editImage(originalImageBase64, editPrompt) {
     if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: IMAGE_MODEL, // Always use gemini-2.5-flash-image for editing
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: originalImageBase64 } },
                { text: editPrompt }
            ]
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Failed to edit image");
}

export async function generateFullVoiceover(text, voiceName, stylePrompt) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Google recommends adding style prompt to the text to control the tone
    // Defaulting to "Charisma Dynamo" style if none provided
    const instruction = stylePrompt || "Read aloud in a lively, confident, and magnetic tone";
    const textToSpeak = `${instruction}: ${text}`;

    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' }
                }
            }
        }
    });

    if (response.usageMetadata) {
        console.log(`[Gemini TTS] Audio generated tokens (candidatesTokenCount): ${response.usageMetadata.candidatesTokenCount}`);
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    return Buffer.from(base64Audio, 'base64');
}
