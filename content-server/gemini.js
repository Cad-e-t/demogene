
import fs from 'fs';
import { GoogleGenAI, Modality } from "@google/genai";


import {
    getDirectorSystemPrompt,
    getAvatarSystemPrompt,
    getYouTubeDescriptionPrompt
} from "./prompt.js";

const MODEL_NAME = "gemini-3.6-flash"; //"gemini-3.1-pro-preview"; //gemini-2.5-pro"; // Using Gemini 3 Pro for reasoning
const GENERATE_IMAGE_MODEL = "gemini-3.1-flash-lite-image";  
const EDIT_IMAGE_MODEL = "gemini-3.1-flash-lite-image"; //
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-lite-generate-preview";

export async function generateStorySegments(prompt, aspect, style, visualDensity = 'Balanced', isFreeTrial = false, rawAvatarUrl = null) {
    const avatarUrl = rawAvatarUrl ? rawAvatarUrl.trim().replace(/\s+/g, '%20') : null;
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const isDirector = style === 'Director' || !style || !style.trim();
    const visualIdentityBlock = isDirector 
        ? "" 
        : style;

    const finalInput = isDirector 
        ? prompt 
        : `${prompt}

VISUAL GUIDELINE

The 'style' field must conform to the rendering style, and all character descriptions to the character design constraints as specified in the VISUAL IDENTITY below.


VISUAL IDENTITY: ${visualIdentityBlock}`;

    let systemPrompt;
    if (avatarUrl) {
        systemPrompt = getAvatarSystemPrompt(finalInput);
    } else {
        systemPrompt = getDirectorSystemPrompt(finalInput);
    }


    console.log("--- GEMINI INPUT (generateStorySegments) ---");
    console.log(systemPrompt);
    console.log("-------------------------------------------");

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemPrompt,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "medium" }
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
        const narration = seg.narration || "";

        let finalImagePrompt = seg.scene_description || "";
        let finalAnimationPrompt = seg.animation_prompt || "";
        let segAvatarUrl = null;
        let segCharacters = [];
        let charIndex = 1;

        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (avatarUrl) {
            const idRegex = new RegExp(`\\bAVATAR\\b`, 'gi');
            if (idRegex.test(finalImagePrompt)) {
                let chosenOutfit = null;
                if (seg.subjects && Array.isArray(seg.subjects)) {
                    const subObj = seg.subjects.find(s => s.id === 'AVATAR');
                    if (subObj && subObj.outfit) {
                        chosenOutfit = subObj.outfit;
                    }
                }
                if (!chosenOutfit) {
                    const avatarData = visualData.avatar || {};
                    if (avatarData.outfits) {
                        const keys = Object.keys(avatarData.outfits);
                        if (keys.length > 0) chosenOutfit = keys[0];
                    }
                }
                if (chosenOutfit) {
                    segCharacters.push({ character_id: 'AVATAR', outfit_id: chosenOutfit, index: charIndex });
                    finalImagePrompt = finalImagePrompt.replace(idRegex, `character in image ${charIndex}`);
                    charIndex++;
                    segAvatarUrl = avatarUrl;
                }
            }
        }

        for (const [subId, mainSub] of Object.entries(mainSubjects)) {
            const idRegex = new RegExp(`\\b${escapeRegExp(subId)}\\b`, 'gi');
            if (idRegex.test(finalImagePrompt)) {
                let chosenOutfit = null;
                if (seg.subjects && Array.isArray(seg.subjects)) {
                    const subObj = seg.subjects.find(s => s.id === subId);
                    if (subObj && subObj.outfit) {
                        chosenOutfit = subObj.outfit;
                    }
                }
                if (!chosenOutfit) {
                    if (mainSub.outfits) {
                        const keys = Object.keys(mainSub.outfits);
                        if (keys.length > 0) chosenOutfit = keys[0];
                    }
                }
                if (chosenOutfit) {
                    segCharacters.push({ character_id: subId, outfit_id: chosenOutfit, index: charIndex });
                    finalImagePrompt = finalImagePrompt.replace(idRegex, `character in image ${charIndex}`);
                    charIndex++;
                }
            }
        }

        let locationStr = "";
        if (seg.location) {
            let loc = seg.location;
            if (visualData.recurring_locations && visualData.recurring_locations[loc] && visualData.recurring_locations[loc].description) {
                loc = visualData.recurring_locations[loc].description;
            }
            loc = loc.trim().toLowerCase();
            if (loc.endsWith('.')) {
                loc = loc.slice(0, -1);
            }
            locationStr = loc;
        }

        if (locationStr) {
            finalImagePrompt += `  Set environment, show only the parts that naturally fit into the current shot: ${locationStr}.`;
        }

        if (visualData.style) {
            finalImagePrompt += `  ${visualData.style}`;
        }

        finalSegments.push({
            narration: narration,
            image_prompt: finalImagePrompt.trim(),
            animation_prompt: finalAnimationPrompt,
            characters: segCharacters,
            ...(segAvatarUrl && { avatar_url: segAvatarUrl })
        });
    }

    const inputTokens1 = 0;
    const outputTokens1 = 0;
    const inputTokens2 = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens2 = response.usageMetadata?.candidatesTokenCount || 0;

    return {
        segments: finalSegments,
        rawVisualData: visualData,
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

export async function generateCharacterImagesData(visualData, style, rawAvatarUrl) {
    const avatarUrl = rawAvatarUrl ? rawAvatarUrl.trim().replace(/\s+/g, '%20') : null;
    const characters = [];

    const mainSubjects = visualData.recurring_subjects || {};
    for (const [subId, mainSub] of Object.entries(mainSubjects)) {
        const baseDescRaw = mainSub.base || "";
        const baseDesc = baseDescRaw.trim().replace(/\.$/, "");
        
        if (mainSub.outfits) {
            for (const [outfitId, outfitObj] of Object.entries(mainSub.outfits)) {
                let outfitDesc = "";
                const parts = Object.values(outfitObj);
                if (parts.length > 0) {
                    outfitDesc = parts.join(", ");
                }
                const outfitSuffix = outfitDesc ? ` (wearing ${outfitDesc})` : "";
                const fullDesc = `${baseDesc}${outfitSuffix}`.toLowerCase();
                
                const promptSkeleton = `Full body shot, pure white background, neutral expression. ${fullDesc}, ${style}.`;
                characters.push({
                    character_id: subId,
                    outfit_id: outfitId,
                    full_desc: fullDesc,
                    promptSkeleton: promptSkeleton,
                    isGenerated: true
                });
            }
        }
    }

    if (avatarUrl && visualData.avatar && visualData.avatar.outfits) {
        let avatarImageBase64 = null;
        try {
            const resp = await fetch(avatarUrl);
            const arrayBuf = await resp.arrayBuffer();
            avatarImageBase64 = Buffer.from(arrayBuf).toString('base64');
        } catch (e) {
            console.error("Failed to fetch avatar image for character generation:", e);
        }

        const baseDesc = "character in the uploaded image";
        for (const [outfitId, outfitObj] of Object.entries(visualData.avatar.outfits)) {
            let outfitDesc = "";
            const parts = Object.values(outfitObj);
            if (parts.length > 0) {
                outfitDesc = parts.join(", ");
            }
            const outfitSuffix = outfitDesc ? ` (wearing ${outfitDesc})` : "";
            const fullDesc = `${baseDesc}${outfitSuffix}`.toLowerCase();

            const promptSkeleton = `Full body shot, pure white background, neutral expression. ${fullDesc}, ${style}.`;
            characters.push({
                character_id: 'AVATAR',
                outfit_id: outfitId,
                full_desc: fullDesc,
                promptSkeleton: promptSkeleton,
                referenceImageBase64: avatarImageBase64,
                isGenerated: true
            });
        }
    }
    
    return characters;
}

export async function generateImage(prompt, aspect, referenceImages = null) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const ar = aspect === '9:16' ? '9:16' : '16:9';

    let input = prompt;
    if (referenceImages) {
        let imageArray = Array.isArray(referenceImages) ? referenceImages : [referenceImages];
        if (imageArray.length > 0) {
            input = [
                { type: "text", text: prompt }
            ];
            for (const base64Data of imageArray) {
                if (base64Data) {
                    input.push({
                        type: "image",
                        mime_type: "image/png",
                        data: base64Data
                    });
                }
            }
            if (input.length === 1) {
                // If no valid images were added, fallback to simple text prompt
                input = prompt;
            }
        }
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

export async function generateDescription(videoTitle, voiceFilePath = null, scriptContent = null) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let promptText = getYouTubeDescriptionPrompt(videoTitle);
    let contents = promptText;

    if (voiceFilePath) {
        try {
            let base64Audio = null;
            let mimeType = 'audio/mp3';

            if (voiceFilePath.startsWith('http://') || voiceFilePath.startsWith('https://')) {
                const audioResp = await fetch(voiceFilePath);
                if (audioResp.ok) {
                    const arrayBuffer = await audioResp.arrayBuffer();
                    base64Audio = Buffer.from(arrayBuffer).toString('base64');
                    const contentType = audioResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                }
            } else if (fs.existsSync(voiceFilePath)) {
                const buffer = fs.readFileSync(voiceFilePath);
                base64Audio = buffer.toString('base64');
            }

            if (base64Audio) {
                contents = [
                    {
                        inlineData: {
                            mimeType: mimeType || 'audio/mp3',
                            data: base64Audio
                        }
                    },
                    {
                        text: promptText
                    }
                ];
            } else {
                if (scriptContent) {
                    contents = `${promptText}\n\n**Video Content / Script:**\n${scriptContent}`;
                }
            }
        } catch (err) {
            console.warn("[gemini.js] Failed to load voiceover audio for description generation, falling back to text:", err);
            if (scriptContent) {
                contents = `${promptText}\n\n**Video Content / Script:**\n${scriptContent}`;
            }
        }
    } else if (scriptContent) {
        contents = `${promptText}\n\n**Video Content / Script:**\n${scriptContent}`;
    }

    console.log("--- GEMINI INPUT (generateDescription) ---");
    console.log(`Video Title: ${videoTitle}`);
    console.log("------------------------------------------");

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
    });

    console.log("--- GEMINI RESPONSE (generateDescription) ---");
    console.log(response.text);
    console.log("---------------------------------------------");

    const promptTokens = response.usageMetadata?.promptTokenCount || 0;
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || 0;

    return {
        description: response.text?.trim() || "",
        usageMetadata: {
            promptTokenCount: promptTokens,
            candidatesTokenCount: candidatesTokens
        }
    };
}



