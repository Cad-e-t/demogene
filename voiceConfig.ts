
import { VoiceOption } from "./types";

export interface VoiceConfigItem extends VoiceOption {
  sampleUrl?: string;
}

// Centralized list of voices. Add new voices here to extend the application.
export const ALL_VOICES: VoiceConfigItem[] = [
  { 
    id: "Puck", 
    name: "Puck (Male)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/puck.wav"
  },
  { 
    id: "Charon", 
    name: "Charon (Male)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/charon.wav"
  },
  { 
    id: "Kore", 
    name: "Kore (Female)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/kore.wav"
  },
  { 
    id: "Fenrir", 
    name: "Fenrir (Male)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/fenrir.wav"
  },
  { 
    id: "Zephyr", 
    name: "Zephyr (Female)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/zephyr.wav"
  },
  // Additional voices
  { 
    id: "Aoeda", 
    name: "Aoeda (Female)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/aoeda.wav" 
  },
  { 
    id: "Leda", 
    name: "Leda (Female)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/leda.wav" 
  },
  { 
    id: "Orus", 
    name: "Orus (Male)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/orus.wav" 
  },
  { 
    id: "Iapetus", 
    name: "Iapetus (Male)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/iapetus.wav" 
  },
  { 
    id: "Erinome", 
    name: "Erinome (Female)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/erinome.wav" 
  }
];




export const VOICES: VoiceOption[] = ALL_VOICES.map(({ id, name, gender }) => ({ id, name, gender }));

export const VOICE_SAMPLES: Record<string, string> = ALL_VOICES.reduce((acc, v) => {
    if (v.sampleUrl) acc[v.id] = v.sampleUrl;
    return acc;
}, {} as Record<string, string>);
