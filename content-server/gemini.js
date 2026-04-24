
import { GoogleGenAI, Modality } from "@google/genai";


const MODEL_NAME = "gemini-3.1-pro-preview"; //gemini-2.5-pro"; // Using Gemini 3 Pro for reasoning
const IMAGE_MODEL = "gemini-2.5-flash-image"; // Nano Banana for images (Ultra quality per mapping)
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-lite-generate-preview";


const STYLE_OPENINGS = {
    'Realistic': 'Photorealistic depiction',
    'CartoonHorror': 'Creepy 2D cartoon horror depiction',
    '3DCartoon': 'Stylized 3D cartoon render',
    'Anime': '2D anime depiction',
    'Sketch': 'Pencil sketch depiction',
    'Stickman':'Minimalist stickman depiction',
    'Horror': 'Dark horror scene',
    'Exaggerated2D': 'Highly exaggerated 2D cartoon render',
    'FlatCartoon': 'Simple flat 2D cartoon render',
    'SemiRealisticCartoon': 'Semi-realistic stylized cartoon render',
    'Skeleton': 'Cinematic photo-realistic scene'

};

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const opening = STYLE_OPENINGS[style] || `A ${style} style image of`;

    const predefinedVisualIdentityBlocks = {
        '3DCartoon': `Every image is a stylized 3D cartoon render with smooth geometry, slightly exaggerated characters, vibrant colors with soft gradients, clean cinematic lighting, and simple dimensional environments that emphasize clarity and a polished, playful tone.`,
        'CartoonHorror': `Every image is a dark 2D cartoon horror scene with bold lines, exaggerated characters with large unsettling eyes (wide whites and dot pupils), muted night-time colors, simple distorted environments, and dim high-contrast lighting that creates an eerie, haunted tone.`,
        'Realistic': `Every image is a highly photorealistic depiction of the scene. Natural lighting only with soft shadows. Real-world textures, colors, and materials.`,
        'Stickman': `Every image is a line-based stickman-style illustration. Characters are drawn as simple stick figures with thin uniform lines. All objects and environments are represented using simplified line drawings and flat solid colors. Use clear, varied colors to distinguish elements in the scene. No shading, no gradients, no textures. A stickman character is present in every scene and uses posture and positioning to reflect the narration.`,
        'Anime': `Every image is a 2D anime-style depiction with clean, consistent line art. Colors are applied as flat or softly shaded fills with a consistent palette. Characters, objects, and environments are rendered in a cohesive anime style across all scenes. No photorealism.`,
        'Horror': `Every image is a dark, realistic scene with low-key lighting and strong shadows. Scenes are dimly lit with high contrast between light and darkness. Colors are muted and desaturated with a dark overall tone. Subjects and environments are grounded and eerie. No bright colors, no flat lighting, no cartoon or stylized rendering.`,
        'Sketch': `Every image is a hand-drawn pencil sketch depiction. All characters, objects, and environments are drawn using visible pencil lines and light sketch strokes. Lines vary slightly in thickness with a natural hand-drawn feel. Minimal use of soft grayscale shading. No color, no digital clean lines, no solid fills or rendering.`,
        'Exaggerated2D': `Every image is a highly exaggerated 2D cartoon depiction with bold outlines and dynamic shapes. Characters use extreme squash and stretch, oversized facial expressions, and dramatic poses to convey emotion and action. Colors are vibrant and high-contrast with simple shading. Environments are stylized and slightly distorted to match the character energy. No realism. Every scene emphasizes visual humor, impact, and clarity of action.`,
        'FlatCartoon': `Every image is a simple flat 2D cartoon depiction using clean shapes and minimal detail. Characters are built from basic geometric forms with clear silhouettes and expressive faces. Colors are flat, solid, and consistent across scenes with no gradients or textures. Linework is minimal or uniform. Environments are simplified and uncluttered to keep focus on the subject. A character is present in every scene and uses subtle but clear expressions and poses to reflect the narration. No realism.`,
        'SoftCartoon': `Every image is a semi-realistic cartoon depiction blending stylized characters with believable proportions and detail. Characters maintain realistic anatomy with slightly exaggerated features for expression. Lighting is soft and cinematic with gentle shading and depth. Colors are rich and cohesive with subtle gradients. Materials and environments have mild texture but remain stylized, not photorealistic. Composition and framing are more grounded and cinematic. Expressions are controlled rather than extreme. No full realism.`,
        'Skeleton': `Every image is a cinematic, photo-realistic environment with natural lighting, always featuring a single stylized skeleton character as the active main subject. The skeleton character is pristine: smooth off-white bones, rounded edges, an articulated jaw, and a proportionate skull with natural human eyes. It moves realistically and retains distinct permanent features (e.g., hair-style and eye color), and must always wear an outfit. its wardrobe is adaptable—changing to fit the specific scene or remaining consistent depending on the narrative context.  All other characters and settings are completely photo-realistic.`
    
    };

    const visualIdentityBlock = predefinedVisualIdentityBlocks[style] ;

    const systemPrompt = `
You are an expert film director, cinematographer, and prompt engineer.

Your task is to analyze a user's script, construct a coherent visual narrative, split the script into meaningful visual segments, and generate precise pairs of prompts for an Image-to-Video pipeline: an \`image_prompt\` (the first frame) and an \`animation_prompt\` (the motion).

INPUT SCRIPT: 
${prompt}

=========================================
PHASE 1: SCRIPT PROCESSING & SEGMENTATION
=========================================

1. SCRIPT HANDLING
- Use the user's text EXACTLY as provided.
- You may ONLY fix obvious spelling or punctuation errors.
- Optimize the script for natural narration flow.

2. SEGMENTATION LOGIC
Segment the script based on clear visual changes:
- First, create a segment for the hook (usually the first sentence).
- Then, create a new segment ONLY when the visual should change in a noticeable and meaningful way, including:
  * A new action or event
  * A new subject or focal point
  * A change in environment or setting
  * A visible cause → effect transformation

3. PACING & EXPLANATORY LINES
- Concept Shifts: If a line introduces a new idea that requires a different visual → create a new segment.
- Brief Explanations: If a line briefly explains or clarifies the current idea → keep it in the same segment.
- Long Explanations (Angle & B-Roll Shifts): If an explanation or extension spans multiple sentences, holding a single shot becomes boring. To maintain viewer engagement without breaking continuity, create a new segment by changing the camera perspective. Cut to a close-up, a different angle, or focus on a specific detail (B-roll) within the EXACT SAME environment and subject. Do not invent irrelevant concepts.  * 


=========================================
PHASE 2: WORLD-BUILDING & CONSISTENCY
=========================================

1. VISUAL IDENTITY LOCK
Every image generated must adhere to this visual style:
${visualIdentityBlock}

2. ENVIRONMENT & SCENE CONTINUITY (Backgrounds & Locations)
The image model must never be left to hallucinate backgrounds. You must explicitly define the environment (surroundings, location or background) based on the context of the script.
- Continuity: If consecutive segments take place in the same location, maintain the exact same environment description and lighting so cuts feel natural and sequential.
- Transitions: Only change the environment description when the narrative dictates a shift to a new location.
- Atmosphere: The environment's tone, lighting, and general visual style must perfectly reflect the constraints of the VISUAL IDENTITY LOCK.

3. ANCHOR SYSTEM (Subject Consistency)
Before generating prompts, define 1–3 VISUAL ANCHORS — recurring visual elements that persist across scenes (e.g., a specific character, object, or structure). 
- Base Description: Each anchor must have a canonical base description focused on: shape, structural form, and distinctive visual features.
- Anchor Lifecycle: Anchors should persist across scenes where they remain relevant. If the scene introduces a wholly new subject, concept, or setting → old anchors may be dropped, and new anchors can be defined.

4. THE "ZERO-MEMORY" RULE & ADAPTIVE ANCHOR USAGE
CRITICAL: The downstream image generation model has ZERO MEMORY. It does not know what was described in previous prompts. Every single image prompt must be 100% self-contained. 
Never use vague pointers or shorthand (e.g., "The stylized skeleton", "The magic book", or "The aforementioned plane"). Leave zero room for hallucination.

How to describe anchors based on what the scene naturally requires:
- Entirely Visible: If the narrative requires the anchor to appear completely in the scene, you MUST reuse its canonical base description VERBATIM in the prompt.
- Partially Visible / Interiors: If the narrative only involves a specific part or the inside of an anchor, DO NOT force the full description. Instead, take only the relevant descriptive traits and vividly describe EXACTLY what is visible in full detail. (e.g., Instead of just saying "Inside the white plane," explicitly describe the actual visible elements: "Inside a sleek cockpit with glowing digital panels, silver trim, and leather seats.")

*Note: Do not artificially force wide shots or close-ups just to obey this rule. Let the script's narrative naturally dictate how much of the anchor is shown.*


=========================================
PHASE 3: DIRECTOR MODE (PROMPT GENERATION)
=========================================

Think like a Cinematographer. You are creating two halves of a whole for each segment. 
- Synergy Guideline: Do NOT pack the entire action of the narration into the static image. Let the animation prompt handle the movement, transformation, and culmination of the action.

1. THE IMAGE PROMPT (The First Frame)

The image should show a state of anticipation, resting, or the beginning of an action.
- Rule 1: Start every prompt with exactly this opening: "${opening}"
- Rule 2: ZERO-MEMORY ENFORCEMENT: Treat every prompt as an independent image. Describe the subject, anchor, and environment fully and explicitly every single time.
- Rule 3: Describe ONE clear focal subject and its starting position/pose.
- Rule 4: (Ref: Phase 2.4): Treat every prompt as an independent, self-contained universe. No shorthand. Use VERBATIM anchor descriptions when fully visible. Vividly describe specific visible details for partial/interior views.
- Rule 5: (Ref: Phase 2.2): Explicitly include the full environment description in every single prompt to maintain scene continuity and prevent hallucination.
- Rule 6: Ensure all descriptive elements reflect the Visual Identity Lock rules.
- Rule 7: NO baked-in motion. Do not describe motion blur, speed lines, or mid-air frozen actions. Keep subjects physically grounded and ready to move.
- Rule 8: No text, words, or labels inside the image.

2. THE ANIMATION PROMPT (The Motion)
- Rule 1: Describe exactly how the elements in the image should move.
- Rule 2: Keep it brief and focused on two things: Subject Motion and Camera Motion.
- Rule 3: Example formats: "Subject walks slowly towards the camera. Camera slowly pushes in." OR "The wind blows the trees. Camera pans right."
- Rule 4: Maximum 2 to 3 short sentences.


=========================================
PHASE 4: OUTPUT FORMAT
=========================================

Return ONLY a raw JSON array. No markdown, no preamble, no explanation.

[
  { 
    "narration": "...", 
    "image_prompt": "...",
    "animation_prompt": "..."
  }
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
        return {
            segments: JSON.parse(response.text),
            usageMetadata: response.usageMetadata
        };
    } catch (e) {
        console.error("Failed to parse Gemini response", response.text);
        throw new Error("AI Generation failed to produce valid JSON");
    }
}

export async function generateImage(prompt, aspect) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert aspect ratio string to simplified ratio for config if needed, 
    // but nano-banana (gemini-2.5-flash-image) usually takes standard aspect ratios.
    // However, the SDK documentation for generateContent with image models is simpler.
    // We will use generateContent with text prompt to get an image.
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

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

export async function generateGeminiVideo(imageUrl, animationPrompt, aspectRatio) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Fetch the original image buffer
    const imgResponse = await fetch(imageUrl);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64EncodeString = Buffer.from(imgBuffer).toString('base64');

    const ar = aspectRatio === '9:16' ? '9:16' : '16:9';

    let operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: animationPrompt,
        image: {
            imageBytes: base64EncodeString,
            mimeType: 'image/png'
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            durationSeconds: 4,
            aspectRatio: ar
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 7000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed: No URI from Gemini");
    }

    const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: { 'x-goog-api-key': process.env.API_KEY },
    });
    
    return await videoResponse.arrayBuffer();
}

