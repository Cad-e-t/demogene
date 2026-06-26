
import { GoogleGenAI, Modality } from "@google/genai";
import {
    predefinedVisualIdentityBlocks,
    getNormalSegmentationPrompt,
    getCreatorSystemPrompt,
    getDirectorSystemPrompt
} from "./prompt.js";

const MODEL_NAME = "gemini-3.5-flash"; //"gemini-3.1-pro-preview"; //gemini-2.5-pro"; // Using Gemini 3 Pro for reasoning
const SEGMENTATION_MODEL_NAME = "gemini-3.5-flash"; // Using flash for segmentation
const GENERATE_IMAGE_MODEL = "imagen-4.0-generate-001";  
const EDIT_IMAGE_MODEL = "gemini-2.5-flash-image"; //
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-lite-generate-preview";

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced', isFreeTrial = false) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let baseSegments = [];
    let segmentationResponse = null;

    if (style !== 'Director') {
        const segmentationSystemPrompt = getNormalSegmentationPrompt(prompt);

        console.log("--- GEMINI INPUT (Segmentation Step) ---");
        console.log(segmentationSystemPrompt);
        console.log("-------------------------------------------");

        segmentationResponse = await ai.models.generateContent({
            model: SEGMENTATION_MODEL_NAME,
            contents: segmentationSystemPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        console.log("--- GEMINI RESPONSE (Segmentation Step) ---");
        console.log(segmentationResponse.text);
        console.log("----------------------------------------------");

        try {
            baseSegments = JSON.parse(segmentationResponse.text);
        } catch (e) {
            console.error("Failed to parse Gemini segmentation response", segmentationResponse.text);
            throw new Error("AI Generation failed to produce valid JSON for segmentation");
        }
    }

    const segmentedScript = JSON.stringify(baseSegments, null, 2);

    const visualIdentityBlock = style === 'Director' 
        ? "" 
        : predefinedVisualIdentityBlocks[style];

    const systemPrompt = style === 'Director'
        ? getDirectorSystemPrompt(prompt)
        : getCreatorSystemPrompt(segmentedScript, visualIdentityBlock);


    console.log("--- GEMINI INPUT (generateStorySegments) ---");
    console.log(systemPrompt);
    console.log("-------------------------------------------");

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemPrompt,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "HIGH" }
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
    const mainSubjects = visualData.recurring_subjects || {};

    for (const seg of (visualData.segments || [])) {
        const matchingBaseSeg = baseSegments.find(s => String(s.segment_id) === String(seg.segment_id));
        const narration = style === 'Director' ? (seg.narration || "") : (matchingBaseSeg ? matchingBaseSeg.narration : "");

        let fullSubjectsDescription = "";
        if (seg.subjects && Array.isArray(seg.subjects)) {
            for (const sub of seg.subjects) {
                const mainSub = mainSubjects[sub.id];
                if (mainSub) {
                    const baseDesc = mainSub.base || "";
                    const outfitDesc = (mainSub.outfits && sub.outfit) ? (mainSub.outfits[sub.outfit] || "") : "";
                    const outfitSuffix = outfitDesc ? ` wearing ${outfitDesc}` : "";
                    fullSubjectsDescription += `${sub.id}: "${baseDesc}${outfitSuffix}".\n`;
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

    const inputTokens1 = segmentationResponse?.usageMetadata?.promptTokenCount || 0;
    const outputTokens1 = segmentationResponse?.usageMetadata?.candidatesTokenCount || 0;
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


