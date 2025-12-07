
import { createClient } from '@supabase/supabase-js';

// NOTE: In a real production app, use environment variables (e.g., import.meta.env.VITE_SUPABASE_URL)
// For this demo context, ensure these are replaced with your actual Supabase project details.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ceccojjvzimljcdltjxy.supabase.co'; 
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlY2Nvamp2emltbGpjZGx0anh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTQyODksImV4cCI6MjA2ODE5MDI4OX0.rDgh2V46RnqpD7A92VEwfQC-4SzVindxQKHYwDCPNvE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
