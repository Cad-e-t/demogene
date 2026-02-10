
import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_NAME = "gemini-3-pro-preview"; // Using Gemini 3 Pro for reasoning
const IMAGE_MODEL = "gemini-2.5-flash-image"; // Nano Banana for images
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced') {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemPrompt = `
    You are an expert visual director.
    Your task is to take a user's script and split it into visual segments based on a density setting.

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
    - 'Rich': Final segment count MUST equal total sentence count (1 sentence per segment).
    - 'Balanced': Final segment count MUST equal half of total sentences, rounded to nearest whole number (2 sentences per segment).
    - 'Low': Final segment count MUST equal one third of total sentences, rounded to nearest whole number (3 sentences per segment).
    - You may break sentences between segments ONLY if it creates a more significant visual moment.

    INSTRUCTIONS:
    1. Analyze the script for natural visual and narrative breaks.
    2. Group text according to density while respecting significant moments.
      3. For each segment, provide:
         - "narration": The exact text from the script for this segment.
         - "image_prompt": A highly detailed, descriptive prompt for an AI image generator.
         - MUST explicitly include the visual style keywords: "${style}".
         - Describe lighting, camera angle, subject, and mood.
         - Format for 9:16 vertical video if aspect is 9:16, or 16:9 otherwise.

    OUTPUT FORMAT:
    Return ONLY a raw JSON array. No markdown formatting.
    [
      { "narration": "...", "image_prompt": "..." },
      ...
    ]
    `;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemPrompt,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 2000 }
        }
    });

    try {
        return JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: ar,
                imageSize: "1K" 
            }
        }
    });

    // Extract base64
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
        model: IMAGE_MODEL,
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    return Buffer.from(base64Audio, 'base64');
}