
import { GoogleGenAI, Modality } from "@google/genai";


const MODEL_NAME = "gemini-3.1-pro-preview"; //gemini-2.5-pro"; // Using Gemini 3 Pro for reasoning
const SEGMENTATION_MODEL_NAME = "gemini-3.5-flash"; // Using flash for segmentation
const GENERATE_IMAGE_MODEL = "imagen-4.0-generate-001"
const EDIT_IMAGE_MODEL = "gemini-2.5-flash-image"; //
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-lite-generate-preview";


const STYLE_OPENINGS = {
    'Realistic': 'Photorealistic depiction',
    'Creepy': 'Creepy 2D cartoon horror depiction',
    'Anime': '2D anime depiction',
    'Sketch': 'Pencil sketch depiction',
    'Stickman':'Minimalist stickman depiction',
    'Exaggerated2D': 'Highly exaggerated 2D cartoon render',
    'Documentary': 'Black and white photojournalistic shot',
    'Ukiyo-e': 'Japanese woodblock print',
    'Claymation': 'Stop-motion clay scene',
    'Lego':'LEGO style scene',
    'Cartoon': 'Semi-realistic stylized cartoon render',
    'Skeleton': 'Cinematic photo-realistic scene',
    'Game3D': 'Real-time 3D game cinematic render'

};

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const opening = STYLE_OPENINGS[style] || `A ${style} style image of`;

    let segmentationSystemPrompt = "";

    if (aspect === '16:9') {
        segmentationSystemPrompt = `You are an expert documentary script segmentation model. Your task is to divide a long-form narration script into coherent story-beat segments for scene visualization.
A segment should represent one continuous idea, moment, action, revelation, emotional shift, or visual beat.
SEGMENTATION RULES:
Segment by story beats, not by sentence count.
Create a new segment when the narration shifts to:
a new idea
a new subject or focus
a major emotional or tonal change
Favor shorter, punchier segments over long blocks when possible.
Very short transitional sentences should usually be merged with the most related adjacent sentence.
Each segment should feel visually representable as a single continuous scene or sequence.
OUTPUT FORMAT:
Return ONLY raw JSON.
[
{
"segment_id": "1",
"narration": "Exact narration text for this segment."
}
]

INPUT SCRIPT:
${prompt}`;
    } else {
        segmentationSystemPrompt = `
   Act as an expert Storyboard Artist for a documentary-style YouTube channel. I need you to segment my script into scenes for a faceless video.

   CRITICAL SEGMENTING RULES:
   
   The 'Camera Cut' Rule (When to split): Create a new scene ONLY when the script introduces a new subject, a new location, a new idea, a new moment, or a shift in emotion/action.
   Output strictly as a JSON array of objects. No markdown explanation.

[
   {
"segment_id": "1",
"narration": "The exact script segment being visualized."
   }
]

INPUT SCRIPT:
${prompt}`;
    }


    console.log("--- GEMINI INPUT (Segmentation Step) ---");
    console.log(segmentationSystemPrompt);
    console.log("-------------------------------------------");

    const segmentationResponse = await ai.models.generateContent({
        model: SEGMENTATION_MODEL_NAME,
        contents: segmentationSystemPrompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    console.log("--- GEMINI RESPONSE (Segmentation Step) ---");
    console.log(segmentationResponse.text);
    console.log("----------------------------------------------");

    let baseSegments;
    try {
        baseSegments = JSON.parse(segmentationResponse.text);
    } catch (e) {
        console.error("Failed to parse Gemini segmentation response", segmentationResponse.text);
        throw new Error("AI Generation failed to produce valid JSON for segmentation");
    }

    const segmentedScript = JSON.stringify(baseSegments, null, 2);

    const predefinedVisualIdentityBlocks = {
        'Game3D': 'Every image is a clean 3D simulation render with strong central framing and isolated subject focus. Characters are depicted with smooth, slightly plastic textures and subsurface scattering. Scene is rendered with bright studio lighting, crisp depth of field, Blender Cycles shading to achieve a striking, slightly uncanny visual style.',
        'Creepy': `Every image is a dark 2D cartoon horror scene with bold lines, exaggerated characters with large unsettling eyes (wide whites and dot pupils), muted night-time colors, simple distorted environments, and dim high-contrast lighting that creates an eerie, haunted tone.`,
        'Realistic': `Every image is a highly photorealistic depiction of the scene. Natural lighting only with soft shadows. Real-world textures, colors, and materials.`,
        'Stickman': `Every image is flat 2D cartoon depiction using clean shapes and minimal detail. Characters are 2D stick figures with thin single black lines for limbs and body, and a circular face. They retain distinct permanent features (e.g., hair-style, eyes, facial hair). The environment is 2D with natural coloring.`,
        'Anime': `Every image is a 2D anime-style depiction with clean, consistent line art. Colors are applied as flat or softly shaded fills with a consistent palette. Characters, objects, and environments are rendered in a cohesive anime style across all scenes.`,
        'Sketch': `Every image is a hand-drawn pencil sketch depiction. All characters, objects, and environments are drawn using visible pencil lines and light sketch strokes. Lines vary slightly in thickness with a natural hand-drawn feel. Minimal use of soft grayscale shading. No color, no solid fills or rendering.`,
        'Documentary': `Every image is a black and white or heavily desaturated photojournalistic shot. No color — only stark greys, deep blacks, and blown highlights. Compositions are candid and unposed with visible grain, harsh natural lighting, and slight motion blur. Gritty and immediate, never polished or staged.`,
        'Exaggerated2D': `Every image is a highly exaggerated 2D cartoon depiction with bold outlines and dynamic shapes. Characters use extreme squash and stretch, oversized facial features and amplified expressions,. Colors are vibrant and high-contrast with simple shading. Environments are slightly distorted to match the character energy.`,
        'Ukiyo-e': `Every image is a traditional Japanese woodblock print. Bold outlines, flat color fills, and zero shading define the look. Compositions feature stylized natural motifs — waves, clouds, foliage — with a decorative, hand-carved flatness.`,
        'Claymation': `Every image is a stop-motion clay scene. All subjects appear hand-sculpted — rounded, chunky, and visibly textured with soft imperfections. Surfaces are matte, lighting warm and studio-cast. Nothing is digitally smooth or sharp-edged.`,
        'Cartoon': `Every image is a semi-realistic cartoon depiction blending stylized characters with believable proportions and detail. Characters maintain realistic anatomy with slightly exaggerated features for expression. Lighting is soft and cinematic with gentle shading and depth. Colors are rich and cohesive with subtle gradients. Materials and environments have mild texture but remain stylized, not photorealistic. Composition and framing are more grounded and cinematic. Expressions are controlled rather than extreme. No full realism.`,
        'Skeleton': `Every image is a cinematic, photo-realistic environment with natural lighting. The main subject(s) are stylized skeleton characters — typically one, but when a scene compares or contrasts two distinct individuals, both are rendered as skeletons. Each skeleton is pristine: smooth off-white bones, rounded edges, an articulated jaw, and a proportionate skull with natural human eyes. They move realistically and retain distinct permanent features (e.g., hair-style and eye color), and must always wear an outfit. Their wardrobe and physical presentation is adaptable — changing to fit the specific scene or remaining consistent depending on the narrative context. All other characters and settings are completely photo-realistic.`,
        'Lego': `Every image is a LEGO scene. All subjects are constructed from interlocking plastic bricks — blocky, rigid, and featuring visible studs and seams. Their wardrobe is adaptable — changing to fit the specific scene or remaining consistent depending on the narrative context. Surfaces are glossy, lighting bright and studio-cast with miniature depth-of-field.`
    };

    const visualIdentityBlock = predefinedVisualIdentityBlocks[style] ;

    const systemPrompt = `
You are an elite Virtual Animation Director. 

Your task is to:
1. Analyze the user's segmented script.
2. Treat each segment as an unbroken camera shot to visualize.
3. Translate into precise Image and Animation Prompts for a generative AI video pipeline.
4. Output the results strictly in the following JSON format. Return ONLY raw JSON with no markdown formatting, preamble, or explanations.

{
  "main_subjects": {
    "CHAR1": {
      "base": "Immutable physical traits (e.g., facial structure, body shape, distinct features). Do not include clothing here.",
      "outfits": {
        "O1": "Detailed physical description of the first/primary outfit.",
        "O2": "Detailed description of a second outfit. Only generate subsequent outfits if the script requires a change. Leave empty for subjects that do not require clothes."
      }
    }
  },
  "segments": [
    {
      "segment_id": "The exact ID provided in the segmented script (e.g., 1).",
      "image_prompt": "A highly detailed, comma-separated paragraph describing the initial first frame of the scene. Follow all IMAGE PROMPT RULES strictly.",
      "animation_prompt": "Animation of the image prompt scene, with complete subject(s) actions, camera movements, and appropriate sound effects.",
      "subjects": [
        {
          "id": "ID of the main subject present in this segment (e.g., 'CHAR1')",
          "outfit": "ID of the outfit worn by the subject in this segment (e.g., 'O1')"
        }
      ]
    }
  ]
}

SEGMENTED SCRIPT:
${segmentedScript}

VISUAL IDENTITY:
${visualIdentityBlock}

=========================================
CORE PRINCIPLES
=========================================

1. VISUAL IDENTITY LOCK

The VISUAL IDENTITY dictates visual style, character design, and rendering rules. Follow instructions precisely, and apply all relevant characteristics and styles to the description of subjects, characters, and environment within every Image Prompts. 

2. IMAGE PROMPT RULES

- Independence: Treat every prompt as an independent image prompt. Aside from main subjects, you must repeat the full description of other characters, objects and environments every time they appear. (e.g., IMAGE_PROMPT1: CHAR1 resting on a black, heavy metal, throne. IMAGE_PROMPT2: CHAR1 stands beside a black, heavy, metal throne.)
- Banned Words: Use of the word "The" (and "the") in the image prompt is prohibited. 
- Format: A detailed, comma-separated paragraph aligning with the VISUAL IDENTITY.
- Still State: Depict a still state (resting, anticipation, or exact start of action) with ZERO baked-in motion (no motion blur, no speed lines).
- Subject Handling: Reference main subjects strictly by ID not descriptions (e.g., 'CHAR1 sitting in a..').
- Environment: Fully describe location, materials, and lighting for every single shot.
- Composition: Clearly specify camera framing and perspective.
- Labels: Artificial text, words, or labels inside the image is prohibited.

3. ANIMATION PROMPT RULES

- Progression: The animation must naturally animate the exact starting state established in the Image Prompt.
- Motion: Keep it simple. One main subject + one primary action + one camera move.
- Subject Referencing: Never use IDs in the animation prompt. Identify subjects strictly by their recognizable visual traits so the video model can accurately target and animate them within the frame.
- Camera Movement: Specify exact cinematic camera mechanics (e.g., slow pan left, push in, orbit, tracking shot, static).
- Audio & SFX: Include appropriate sound effects at the end (e.g., 'Audio: heavy footsteps', 'Audio: distant thunder') or ambient terms for silence.
- No Dialogue: Never prompt for characters speaking or dialogue.

3. WORLD BUILDING & SUBJECT HANDLING: 

Define the persistent reality and reoccurring anchors before generating prompts:

- Cast (Modular Canonical Anchors): Define main subjects based on the script by establishing their Immutable Base and Outfit Selection in the 'main_subjects' object.
- Tracking Subjects: In the 'segments' field, list every main subject actively appearing in that segment under the 'subjects' array, paired with their chosen outfit ID for that scene (defaulting to O1 unless a change or no outfit is required).
- Environment: Define Macro and Micro physical locations with concrete physical descriptions (materials, colors, architecture).

4. SCENE CONCEPTUALIZATION:

- Single Intent Framing - Each scene defines a clear primary visual intention, with additional subjects included when they contribute to the same unified action, event, or environmental transformation.
- Continuous Action: Connect scenes using camera logic (e.g., pull out from a macro shot to reveal a wide environment).
- Internal Reveal: When generating prompts for how a process or object works. Show the internal mechanics by framing shot from directly inside the object.
- When a scene involves multiple agents, represent them as a visible group with distributed individuals or crowd mass showing collective movement and correct scale.

5. HANDLING ABSTRACT EXPLANATION: 

Visualize abstract concepts through characters or subject(s) behavior, environmental changes, or directly visible consequences of actions, ensuring every meaning is conveyed through concrete, camera-capturable behavior within the scene’s established reality.

6. SAFETY

Never depict:
- explicit sexual activity
- graphic nudity
- sexualized minors
- exploitative content

If needed, use:
- implication
- aftermath
- reaction shots
- environmental storytelling

Preserve narrative meaning without graphic depiction.

=========================================
FINAL OUTPUT RULE
=========================================
Return ONLY a raw, valid JSON object matching the exact structure provided in Task 4. No markdown, no preamble, no explanation.
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

    let visualData;
    try {
        visualData = JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse Gemini response", response.text);
        throw new Error("AI Generation failed to produce valid JSON");
    }

    const finalSegments = [];
    const mainSubjects = visualData.main_subjects || {};

    for (const seg of (visualData.segments || [])) {
        const matchingBaseSeg = baseSegments.find(s => String(s.segment_id) === String(seg.segment_id));
        const narration = matchingBaseSeg ? matchingBaseSeg.narration : "";

        let fullSubjectsDescription = "";
        if (seg.subjects && Array.isArray(seg.subjects)) {
            for (const sub of seg.subjects) {
                const mainSub = mainSubjects[sub.id];
                if (mainSub) {
                    const baseDesc = mainSub.base || "";
                    const outfitDesc = (mainSub.outfits && sub.outfit) ? (mainSub.outfits[sub.outfit] || "") : "";
                    fullSubjectsDescription += `${sub.id}: "${baseDesc} wearing ${outfitDesc}".\n`;
                }
            }
        }

        let finalImagePrompt = seg.image_prompt || "";
        if (fullSubjectsDescription) {
            finalImagePrompt = `${fullSubjectsDescription}\n${seg.image_prompt}`;
        }

        finalSegments.push({
            narration: narration,
            image_prompt: finalImagePrompt,
            animation_prompt: seg.animation_prompt || ""
        });
    }

    const inputTokens1 = segmentationResponse.usageMetadata?.promptTokenCount || 0;
    const outputTokens1 = segmentationResponse.usageMetadata?.candidatesTokenCount || 0;
    const inputTokens2 = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens2 = response.usageMetadata?.candidatesTokenCount || 0;

    return {
        segments: finalSegments,
        usageMetadata: {
            flashUsage: {
                promptTokenCount: inputTokens1,
                candidatesTokenCount: outputTokens1
            },
            proUsage: {
                promptTokenCount: inputTokens2,
                candidatesTokenCount: outputTokens2
            }
        }
    };
}

export async function generateImage(prompt, aspect) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert aspect ratio string to simplified ratio for config if needed, 
    // but nano-banana (gemini-2.5-flash-image) usually takes standard aspect ratios.
    // However, the SDK documentation for generateContent with image models is simpler.
    // We will use generateContent with text prompt to get an image.
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

    // Imagen Flow
    const response = await ai.models.generateImages({
        model: GENERATE_IMAGE_MODEL,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: ar
        }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }

    throw new Error("No image data generated");
}

export async function editImage(originalImageBase64, editPrompt) {
     if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: EDIT_IMAGE_MODEL, // Always use gemini-2.5-flash-image for editing
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

export async function generateFullVoiceover(text, voiceName, narrationStyle) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let style = "Flat delivery with minimal pitch variation and a dry, understated sarcastic edge.";
    let pace = "Natural conversation pace";
    let accent = "American (Gen)";

    if (narrationStyle && typeof narrationStyle === 'object') {
        style = narrationStyle.style || style;
        pace = narrationStyle.pace || pace;
        accent = narrationStyle.accent || accent;
    } else if (typeof narrationStyle === 'string') {
        try {
            const parsed = JSON.parse(narrationStyle);
            style = parsed.style || style;
            pace = parsed.pace || pace;
            accent = parsed.accent || accent;
        } catch (e) {
            // fallback
        }
    }

    const prompt = `Read the following transcript based on the director's note.

# Director's note
Style: ${style}
Pace: ${pace}
Accent: ${accent}

## Transcript:
${text}`;

    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
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

