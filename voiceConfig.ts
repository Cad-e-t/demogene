
import { VoiceOption } from "./types";

export interface VoiceConfigItem extends VoiceOption {
  sampleUrl?: string;
}

// Centralized list of voices. Add new voices here to extend the application.
export const ALL_VOICES: VoiceConfigItem[] = [
  { 
    id: "Charon", 
    name: "Charon (Male, Infromative)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/charon.wav"
  },
   { 
    id: "Arlo", 
    name: "Arlo (Male, Confident and Clear)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/Arlo.wav" 
  },
   { 
    id: "Elio", 
    name: "Elio (Male, Calm and Comforting)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/elio.wav" 
  },
   { 
    id: "Puck", 
    name: "Puck (Male, Upbeat)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/puck.wav"
  },
  { 
    id: "Kore", 
    name: "Kore (Female, Firm)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/kore.wav"
  },
    { 
    id: "Zeno", 
    name: "Zeno (Male, Cool and Confident)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/zeno.wav" 
  },
   { 
    id: "Brio", 
    name: "Brio (Male, Quiet and Intimate)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/Brio.wav" 
  },

  { 
    id: "Fenrir", 
    name: "Fenrir (Male, Excitable)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/fenrir.wav"
  },
  { 
    id: "Zephyr", 
    name: "Zephyr (Female, Bright)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/zephyr.wav"
  },
  // Additional voices
  { 
    id: "Aoede", 
    name: "Aoede (Female, Breezy)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/aoeda.wav" 
  },
  { 
    id: "Leda", 
    name: "Leda (Female, Youthful)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/leda.wav" 
  },
  { 
    id: "Orus", 
    name: "Orus (Male, Firm)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/orus.wav" 
  },
  { 
    id: "Iapetus", 
    name: "Iapetus (Male, Clear)", 
    gender: "Male",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/iapetus.wav" 
  },
  { 
    id: "Erinome", 
    name: "Erinome (Female, Clear)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/assets/sample_audio/erinome.wav" 
  },
 
  { 
    id: "Kira", 
    name: "Kira (Female, Cool and Confident)", 
    gender: "Female",
    sampleUrl: "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/Kira.wav" 
  },
  




  
];




export const VOICES: VoiceOption[] = ALL_VOICES.map(({ id, name, gender }) => ({ id, name, gender }));

export const VOICE_SAMPLES: Record<string, string> = ALL_VOICES.reduce((acc, v) => {
    if (v.sampleUrl) acc[v.id] = v.sampleUrl;
    return acc;
}, {} as Record<string, string>);
