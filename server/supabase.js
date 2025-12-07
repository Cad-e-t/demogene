
import { createClient } from '@supabase/supabase-js';

// Ensure these are set in your environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY; // Service role preferred for server-side

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials missing. Database operations will fail.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
