
import { GoogleGenAI, Modality } from "@google/genai";
import {
    predefinedVisualIdentityBlocks,
    getNormalSegmentationPrompt,
    getCreatorSystemPrompt,
    getDirectorSystemPrompt,
    getAvatarSystemPrompt
} from "./prompt.js";

const MODEL_NAME = "gemini-3.5-flash"; //"gemini-3.1-pro-preview"; //gemini-2.5-pro"; // Using Gemini 3 Pro for reasoning
const SEGMENTATION_MODEL_NAME = "gemini-3.5-flash"; // Using flash for segmentation
const GENERATE_IMAGE_MODEL = "gemini-3.1-flash-lite-image";  
const EDIT_IMAGE_MODEL = "gemini-3.1-flash-lite-image"; //
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-lite-generate-preview";

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced', isFreeTrial = false, avatarUrl = null) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let baseSegments = [];
    let segmentationResponse = null;

    if (style !== 'Director' && !avatarUrl) {
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

    let systemPrompt;
    if (avatarUrl) {
        const finalInput = style === 'Director' 
            ? prompt 
            : `The VISUAL IDENTITY LOCK defines the mandatory global rendering style for all Image Prompts and the character design language. 
Every Image Prompt MUST integrate the VISUAL IDENTITY LOCK as the final rendering layer of the scene. All character and environment descriptions must conform to the design and style constraints specified in VISUAL IDENTITY LOCK.

VISUAL IDENTITY LOCK: ${visualIdentityBlock}

VOICEOVER:

${prompt}`;
        systemPrompt = getAvatarSystemPrompt(finalInput);
    } else {
        systemPrompt = style === 'Director'
            ? getDirectorSystemPrompt(prompt)
            : getCreatorSystemPrompt(segmentedScript, visualIdentityBlock);
    }


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
        const narration = (style === 'Director' || avatarUrl) ? (seg.narration || "") : (matchingBaseSeg ? matchingBaseSeg.narration : "");

        let finalImagePrompt = seg.image_prompt || "";
        let finalAnimationPrompt = seg.animation_prompt || "";
        let segAvatarUrl = null;

        if (seg.subjects && Array.isArray(seg.subjects)) {
            for (const sub of seg.subjects) {
                if (avatarUrl && sub.id === 'AVATAR') {
                    const avatarData = visualData.avatar || {};
                    const baseDesc = "character in the uploaded image";
                    let outfitDesc = "";
                    if (avatarData.outfits && sub.outfit && sub.outfit_parts && Array.isArray(sub.outfit_parts)) {
                        const outfitPartsObj = avatarData.outfits[sub.outfit];
                        if (outfitPartsObj) {
                            const parts = [];
                            for (const part of sub.outfit_parts) {
                                if (outfitPartsObj[part]) {
                                    parts.push(outfitPartsObj[part]);
                                }
                            }
                            if (parts.length > 0) {
                                outfitDesc = parts.join(", ");
                            }
                        }
                    }
                    const outfitSuffix = outfitDesc ? ` wearing ${outfitDesc}` : "";
                    const fullDesc = `${baseDesc}${outfitSuffix}`.toLowerCase();
                    const baseDescLower = baseDesc.toLowerCase();
                    
                    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const idRegex = new RegExp(`\\b${escapeRegExp(sub.id)}\\b`, 'gi');
                    
                    let matchCount = 0;
                    finalImagePrompt = finalImagePrompt.replace(idRegex, () => {
                        matchCount++;
                        if (matchCount === 1) {
                            return fullDesc;
                        } else {
                            return baseDescLower;
                        }
                    });
                    
                    segAvatarUrl = avatarUrl;
                } else {
                    const mainSub = mainSubjects[sub.id];
                    if (mainSub) {
                        const baseDescRaw = mainSub.base || "";
                        const baseDesc = baseDescRaw.trim().replace(/\.$/, "");
                        
                        let outfitDesc = "";
                        if (mainSub.outfits && sub.outfit && sub.outfit_parts && Array.isArray(sub.outfit_parts)) {
                            const outfitPartsObj = mainSub.outfits[sub.outfit];
                            if (outfitPartsObj) {
                                const parts = [];
                                for (const part of sub.outfit_parts) {
                                    if (outfitPartsObj[part]) {
                                        parts.push(outfitPartsObj[part]);
                                    }
                                }
                                if (parts.length > 0) {
                                    outfitDesc = parts.join(", ");
                                }
                            }
                        }
                        
                        const outfitSuffix = outfitDesc ? ` wearing ${outfitDesc}` : "";
                        const fullDesc = `${baseDesc}${outfitSuffix}`.toLowerCase();
                        
                        const baseDescLower = baseDesc.toLowerCase();
                        
                        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const idRegex = new RegExp(`\\b${escapeRegExp(sub.id)}\\b`, 'gi');
                        
                        let matchCount = 0;
                        finalImagePrompt = finalImagePrompt.replace(idRegex, () => {
                            matchCount++;
                            if (matchCount === 1) {
                                return fullDesc;
                            } else {
                                return baseDescLower;
                            }
                        });
                    }
                }
            }
        }

        finalSegments.push({
            narration: narration,
            image_prompt: finalImagePrompt,
            animation_prompt: finalAnimationPrompt,
            ...(segAvatarUrl && { avatar_url: segAvatarUrl })
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

export async function generateImage(prompt, aspect, avatarImageBase64 = null) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

    let input = prompt;
    if (avatarImageBase64) {
        input = [
            { type: "text", text: prompt },
            {
                type: "image",
                mime_type: "image/png", // PNG is a safe default for avatar images and general usage
                data: avatarImageBase64
            }
        ];
    }

    const interaction = await ai.interactions.create({
        model: GENERATE_IMAGE_MODEL,
        input: input,
        response_format: [
            {
                type: "image",
                mime_type: "image/jpeg",
                aspect_ratio: ar,
            }
        ],
    });

    if (interaction.output_image && interaction.output_image.data) {
        return interaction.output_image.data;
    }

    throw new Error("No image data generated");
}

export async function editImage(originalImageBase64, editPrompt) {
     if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const input = [
        { type: "text", text: editPrompt },
        {
            type: "image",
            mime_type: "image/png",
            data: originalImageBase64
        },
    ];

    const interaction = await ai.interactions.create({
        model: EDIT_IMAGE_MODEL,
        input: input,
    });

    for (const step of interaction.steps) {
        if (step.type === "model_output" && step.content) {
            for (const contentBlock of step.content) {
                if (contentBlock.type === "image") {
                    return contentBlock.data;
                }
            }
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


