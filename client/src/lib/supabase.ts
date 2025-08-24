import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Check if we have valid Supabase credentials
const isValidSupabaseConfig = url && anon && 
  url !== 'https://placeholder.supabase.co' && 
  anon !== 'placeholder-key' &&
  url.includes('.supabase.co');

export const sb = isValidSupabaseConfig 
  ? createClient(url, anon)
  : null;

// Helper to check if Supabase is available
export const isSupabaseAvailable = () => sb !== null;