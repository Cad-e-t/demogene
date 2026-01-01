
import { GoogleGenAI, Modality } from "@google/genai";
import { MOCK_ANALYSIS_RESULT, MOCK_AUDIO_URL } from "./mocks.js";

// Set this to false for real production use, or use ENV variable
const TEST_MODE = process.env.TEST_MODE === 'true'; 
// Fixed: Using the recommended 'gemini-3-pro-preview' for complex analysis tasks.
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-3-pro-preview";
const TTS_MODEL_NAME = process.env.GEMINI_TTS_MODEL_NAME || "gemini-2.5-flash-preview-tts";

export async function analyzeVideo(fileBase64, mimeType, prompt) {
  if (TEST_MODE) {
    console.log("TEST_MODE: Using mock analysis result.");
    return MOCK_ANALYSIS_RESULT;
  }

  if (!process.env.API_KEY) throw new Error("API Key missing");

  // Correct: Using named parameter { apiKey } to initialize GoogleGenAI.
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

    // Correct: Accessing text as a property, not a method.
    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function generateVoiceover(scriptLines, voiceName, stylePrompt) {
    // 1. Filter valid lines
    const linesToSpeak = scriptLines ? scriptLines.filter(l => l.narration && l.narration.trim() !== "") : [];
    
    if (linesToSpeak.length === 0) {
        return { audioBuffer: null, linesToSpeak: [] };
    }
    
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 2. Join all narrations into one text block
    const fullText = linesToSpeak.map(l => l.narration).join(" ");
    
    // Prefix style prompt if provided
    const textToSpeak = stylePrompt ? `${stylePrompt}: ${fullText}` : fullText;
    
    try {
        console.log("Generating single audio file for text length:", fullText.length);
        if (stylePrompt) console.log("Using style prompt:", stylePrompt);
        
        const response = await ai.models.generateContent({
            model: TTS_MODEL_NAME,
            contents: [{ parts: [{ text: textToSpeak }] }],
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
            const buffer = Buffer.from(base64Audio, 'base64');
            return { audioBuffer: buffer, linesToSpeak };
        }
        
        console.warn("No audio data returned in response.");
        return { audioBuffer: null, linesToSpeak };

    } catch (e) {
        console.error("Error generating full audio:", e);
        throw e;
    }
}
