import { GoogleGenAI, Modality } from "@google/genai";
import { MOCK_ANALYSIS_RESULT } from "./mocks.js";

const TEST_MODE = process.env.TEST_MODE === 'true'; 
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-3-pro-preview";
const TTS_MODEL_NAME = process.env.GEMINI_TTS_MODEL_NAME || "gemini-2.5-flash-preview-tts";

export async function analyzeVideo(fileBase64, mimeType, prompt) {
  if (TEST_MODE) {
    console.log("TEST_MODE: Using mock analysis result.");
    return MOCK_ANALYSIS_RESULT;
  }

  if (!process.env.API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 } // Reserve reasoning for the segmentation logic
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function generateScriptBreakdown(transcriptText) {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are an expert Motion Graphics Director. Your job is to analyze video scripts
and break them down into sequential chunks to trigger specific animation styles
in a render engine.

YOUR TASK:
1. Read the provided script.
2. Break the ENTIRE script into sequential chunks. Do not skip, summarize, or alter a single word.
3. Assign one of the four exact type tags below to each chunk.

TAG TYPES & RULES:
- intro-number: ONLY for a number that introduces a topic or list.
    Examples: "Five" in "Five things...", "7" in "Top 7 ways"
- list-marker: ONLY for bullet points or sequence indicators.
    Examples: "Number 1", "First", "Step 2", "Secondly"
    Tag only the marker — not the whole sentence.
- emphasis: High-impact, emotional, or core contextual words. Max 1–3 words.
    Examples: "more money", "crucial", "deadly"
- base: All standard in-between text. This is the default.

CONSTRAINTS:
- Output strictly in JSON.
- When all "text" fields are concatenated, they must perfectly recreate the original script — including punctuation and spaces.
- Never use a tag outside the four listed above.

EXAMPLE:
Script: "Three ways to save money. Number 1. Stop buying coffee."
Output:
{
  "script_breakdown": [
    { "text": "Three",          "type": "intro-number" },
    { "text": " ways to save ", "type": "base" },
    { "text": "money.",         "type": "emphasis" },
    { "text": " Number 1.",     "type": "list-marker" },
    { "text": " Stop buying ",  "type": "base" },
    { "text": "coffee.",        "type": "emphasis" }
  ]
}

Script to analyze:
${transcriptText}`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from Gemini");

        return JSON.parse(text).script_breakdown;
    } catch (error) {
        console.error("Script Breakdown Analysis Error:", error);
        throw error;
    }
}

export async function generateVoiceover(scriptLines, voiceName, stylePrompt) {
    const linesToSpeak = scriptLines ? scriptLines.filter(l => l.narration && l.narration.trim() !== "") : [];
    
    if (linesToSpeak.length === 0) {
        return { audioBuffer: null, linesToSpeak: [] };
    }
    
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // GREEDY BUCKET CHUNKING logic
    const batches = [];
    let currentBatch = [];
    let currentChars = 0;
    
    for (const line of linesToSpeak) {
        const segLen = line.narration.length;
        const addedLen = currentChars === 0 ? segLen : segLen + 1; // +1 for space between sentences
        if (currentChars + addedLen > 1500) {
            if (currentBatch.length > 0) batches.push(currentBatch.join(" "));
            currentBatch = [line.narration];
            currentChars = segLen;
        } else {
            currentBatch.push(line.narration);
            currentChars += addedLen;
        }
    }
    if (currentBatch.length > 0) batches.push(currentBatch.join(" "));

    console.log(`[Demo Voiceover] Processing audio in ${batches.length} chunks...`);

    const chunkBuffers = [];
    
    for (let i = 0; i < batches.length; i++) {
        const batchText = batches[i];
        
        const prompt = `Read the following transcript based on the director's note.

# Director's note
Style: Calm, confident, with strong falling declarative intonation at sentence end.
Pace: Natural conversation pace 
Accent: Canadian'

## Transcript:
${batchText}`;
        
        let success = false;
        let attempts = 0;
        let chunkBuffer = null;

        while (!success && attempts < 3) {
            attempts++;
            try {
                console.log(`[Demo Voiceover] Generating chunk ${i+1}/${batches.length} (length: ${batchText.length}) (Attempt ${attempts})`);
                
                const response = await ai.models.generateContent({
                    model: TTS_MODEL_NAME,
                    contents: [{ parts: [{ text: prompt }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName || "Puck" }
                            }
                        }
                    }
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    chunkBuffer = Buffer.from(base64Audio, 'base64');
                    success = true;
                } else {
                    console.warn(`[Demo Voiceover] No audio data returned for chunk ${i+1} on attempt ${attempts}.`);
                    if (attempts === 3) throw new Error("No audio data returned in response");
                }
            } catch (e) {
                console.error(`Error generating audio for chunk ${i+1} (Attempt ${attempts}):`, e);
                if (attempts === 3) throw e;
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        
        if (chunkBuffer) {
            chunkBuffers.push(chunkBuffer);
        }
    }

    const finalBuffer = chunkBuffers.length > 0 ? Buffer.concat(chunkBuffers) : null;
    return { audioBuffer: finalBuffer, linesToSpeak };
}