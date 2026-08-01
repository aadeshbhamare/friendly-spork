import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are set in your environment or in .env.local
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are safe to expose to the browser

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast with a helpful error during development
  // In production you'll typically set environment variables in your hosting provider
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. See docs/SUPABASE_SETUP.md'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
