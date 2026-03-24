
import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_NAME = "gemini-2.5-pro"; //gemini-3-flash-preview"; // Using Gemini 3 Pro for reasoning
const IMAGE_MODEL = "gemini-2.5-flash-image"; // Nano Banana for images (Ultra quality per mapping)
const ULTIMATE_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";


const STYLE_OPENINGS = {
    'Realistic': 'Photorealistic depiction',
    'Anime': '2D anime illustration',
    'Sketch': 'Pencil sketch illustration',
    'Stickman':'Minimalist stickman illustration',
    'Silhouette': 'Flat minimal editorial illustration',
    'Horror': 'Dark horror illustration',
};

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const opening = STYLE_OPENINGS[style] || `A ${style} style image of`;

    const predefinedVisualIdentityBlocks = {
        'Realistic': `Every image is a highly photorealistic depiction of the scene. Natural lighting only with soft shadows. Real-world textures, colors, and materials.`,
        'Stickman': `Every image is a line-based stickman-style illustration. Characters are drawn as simple stick figures with thin uniform lines. All objects and environments are represented using simplified line drawings and flat solid colors. Use clear, varied colors to distinguish elements in the scene. No shading, no gradients, no textures. A stickman character is present in every scene and uses posture and positioning to reflect the narration.`,
        'Anime': `Every image is a 2D anime-style depiction with clean, consistent line art. Colors are applied as flat or softly shaded fills with a consistent palette. Characters, objects, and environments are rendered in a cohesive anime style across all scenes. No photorealism.`,
        'Horror': `Every image is a dark, realistic illustration with low-key lighting and strong shadows. Scenes are dimly lit with high contrast between light and darkness. Colors are muted and desaturated with a dark overall tone. Subjects and environments are grounded and eerie. No bright colors, no flat lighting, no cartoon or stylized rendering.`,
        'Sketch': `Every image is a hand-drawn pencil sketch illustration. All characters, objects, and environments are drawn using visible pencil lines and light sketch strokes. Lines vary slightly in thickness with a natural hand-drawn feel. Minimal use of soft grayscale shading. No color, no digital clean lines, no solid fills or rendering.`,
        'Silhouette': `Every image is a flat minimal editorial illustration. Pure white background. Flat matte black silhouette figures. All props and environment rendered as flat matte black outlines. No color, no shading, no lighting, no texture anywhere. Mood is communicated through posture, body language, and composition only.`
    };

    const defaultVisualIdentityBlock = `

Before writing any image prompts, analyze the script and visual style to define and lock the following:

- One core visual environment or background world
- One consistent lighting style (if applicable to the chosen visual style)
- One cohesive color palette (if applicable to the chosen visual style)
- One overall visual mood

Once defined, these values are fixed across all scenes. Repeat them naturally in every image prompt without variation unless the script explicitly changes location.

If the selected visual style does not use lighting, color, or texture (e.g. silhouette or flat illustration), DO NOT invent them.

The purpose of this lock is to ensure all images feel like they belong to the same world, regardless of changes in subjects or scenes.
`;

    const visualIdentityBlock = predefinedVisualIdentityBlocks[style] ? `\n\n${predefinedVisualIdentityBlocks[style]}\n` : defaultVisualIdentityBlock;

    const systemPrompt = `
You are an expert visual director and prompt engineer.

Your task is to analyze a user's script, construct a coherent visual narrative, split the script into meaningful visual segments, and generate precise, hyper-specific, consistent image prompts that clearly represent the narration.

INPUTS:
- Script: ${prompt}
- Visual Style: ${style}

SCRIPT HANDLING:
1. Use the user's text EXACTLY as provided.
2. You may ONLY fix obvious spelling or punctuation errors.
3. Optimize the script for natural narration flow.

SEGMENTATION LOGIC:

Segment the script based on clear visual changes, not sentence structure.

First, create a segment for the hook (usually the first sentence).

Then, create a new segment only when the visual should change in a noticeable and meaningful way, including:


- a new action or event
- a new subject or focal point
- a change in environment or setting
- a visible cause → effect transformation
- a shift in concept that requires a different visual representation

EXPLANATORY OR ABSTRACT LINES:

If a line introduces a new idea that requires a different visual:
→ create a new segment

If a line only explains, extends, or clarifies the current idea:
→ keep it in the same segment
→ continue the current visual

CORE RULE, CRITICAL:

→ Only change segments when the visual needs to change
→ If the visual idea remains the same, do not create a new segment

VISUAL IDENTITY LOCK:
${visualIdentityBlock}

ANCHOR SYSTEM:

Before generating image prompts, define 1–3 VISUAL ANCHORS — recurring visual elements that persist across scenes (e.g. a specific character, object, or structure that appears repeatedly and helps maintain visual continuity).

Each anchor must have a canonical description focused on:
- shape
- structural form
- distinctive visual features

These anchor descriptions must be reused verbatim in every prompt where they appear.
Do not paraphrase or modify them.


ANCHOR USAGE RULES:

Anchors should persist across scenes where they remain relevant (e.g. same subject, environment, or ongoing scenario).

If the scene introduces a new subject, concept, or setting:
→ anchors may change
→ new anchors can be defined for that segment if needed

Anchors are tools for consistency, not constraints.

SCENE CONTINUITY:

Each image should feel like part of the same video.

Maintain consistency defined in Visual Identity Lock

Anchors should persist where appropriate:
- continuous scenarios → keep anchors
- multi-concept segments → allow changes
- narrative scenes → maintain character anchors where relevant


DIRECTOR MODE:

Think like a visual communicator, not just a stylist.

Each image must clearly represent the meaning of its narration.

Before writing the prompt, determine:
- What is the core idea being expressed?
- What is the most direct way to show it visually?

Guidelines:
- Prefer clear, physically understandable visuals over symbolic ones
- If the idea is abstract, translate it into something visible using:
  - scale
  - contrast
  - cause and effect
  - transformation

Do not rely on mood alone to carry meaning.
The viewer should understand the idea even without narration.

IMAGE PROMPT RULES:

1. Start every prompt with exactly this opening: "${opening}"

2. Describe ONE clear focal subject and what it is doing.

3. The subject must directly represent the narration’s core idea.

4. Describe the environment clearly:
- where the scene takes place
- what surrounds the subject
- what is visible in the background

5. Every prompt must reflect the Visual Identity Lock (environment, lighting, palette, mood).

6. When human presence is needed:
- show figures from behind, side, distance, or obscured
- never show visible facial features or identifiable faces
- never use vague terms like “a person” — always describe the subject with specific physical details even without showing the face

7. Maximum 150 words per prompt.
Every word must add visual clarity.
No filler. No vague or purely stylistic descriptions.

8. Repeat full subject and anchor descriptions verbatim in every prompt. Do not shorten, summarize, or replace them with terms like “the”, “this”, or pronouns—any deviation is incorrect.

9. Do not include any text, words, letters, captions, or labels inside the image. Only visual elements are allowed.

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
            thinkingConfig: { thinkingBudget: 3000 }
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

export async function generateImage(prompt, aspect, quality = 'Ultra') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert aspect ratio string to simplified ratio for config if needed, 
    // but nano-banana (gemini-2.5-flash-image) usually takes standard aspect ratios.
    // However, the SDK documentation for generateContent with image models is simpler.
    // We will use generateContent with text prompt to get an image.
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

    // Model Selection based on Quality Mapping:
    // Ultra -> gemini-2.5-flash-image
    // Ultimate -> gemini-3.1-flash-image-preview
    
    let model = IMAGE_MODEL;
    if (quality === 'Ultimate') {
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
                    prebuiltVoiceConfig: { voiceName: voiceName || 'Charon' }
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
