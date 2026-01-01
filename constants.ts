import { VoiceOption, BackgroundOption } from "./types";

export const VOICES: VoiceOption[] = [
  { id: "Puck", name: "Puck (Male)", gender: "Male" },
  { id: "Charon", name: "Charon (Male)", gender: "Male" },
  { id: "Kore", name: "Kore (Female)", gender: "Female" },
  { id: "Fenrir", name: "Fenrir (Male)", gender: "Male" },
  { id: "Zephyr", name: "Zephyr (Female)", gender: "Female" },
  { id: "voiceless", name: "Voiceless", gender: "Male" },
];

export const BACKGROUNDS: BackgroundOption[] = [
  { 
    id: "none", 
    name: "No Background"
  }
];

export const MODEL_NAME = "gemini-3-pro-preview";