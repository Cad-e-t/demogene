
import { GoogleGenAI } from "@google/genai";
import { VIDEO_ANALYSIS_PROMPT } from "./prompts.js";
import { MOCK_ANALYSIS_RESULT, MOCK_AUDIO_URL } from "./mocks.js";

const TEST_MODE = false; // Set to true to bypass API calls and use mock data
const MODEL_NAME = "gemini-3-pro-preview";

export async function analyzeVideo(fileBase64, mimeType, prompt = VIDEO_ANALYSIS_PROMPT) {
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
        responseMimeType: "application/json" 
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

export async function generateVoiceover(scriptLines, voiceName) {
    // 1. Filter valid lines
    const linesToSpeak = scriptLines ? scriptLines.filter(l => l.narration && l.narration.trim() !== "") : [];
    
    if (linesToSpeak.length === 0) {
        return { audioBuffer: null, linesToSpeak: [] };
    }
    
    if (TEST_MODE) {
        console.log("TEST_MODE: Using mock audio url.");
        try {
            const response = await fetch(MOCK_AUDIO_URL);
            if (!response.ok) throw new Error("Failed to fetch mock audio");
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return { audioBuffer: buffer, linesToSpeak };
        } catch (e) {
            console.error("TEST_MODE: Error fetching mock audio:", e);
            return { audioBuffer: null, linesToSpeak };
        }
    }

    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 2. Join all narrations into one text block
    const fullText = linesToSpeak.map(l => l.narration).join(" ");
    
    try {
        console.log("Generating single audio file for text length:", fullText.length);
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: fullText }] }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName || "Puck" }
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const buffer = Buffer.from(base64Audio, 'base64');
            return { audioBuffer: buffer, linesToSpeak };
        }
        throw new Error("No audio data in response");
    } catch (e) {
        console.error("Error generating full audio:", e);
        throw e;
    }
}