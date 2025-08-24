import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Debug environment variables
console.log('Supabase URL:', url);
console.log('Supabase Anon Key:', anon);
console.log('Anon Key Length:', anon ? anon.length : 'undefined');

// Check if we have valid Supabase credentials
console.log('URL check:', !!url);
console.log('Anon check:', !!anon);
console.log('Not placeholder URL:', url !== 'https://placeholder.supabase.co');
console.log('Not placeholder key:', anon !== 'placeholder-key');
console.log('Contains supabase.co:', url.includes('.supabase.co'));

const isValidSupabaseConfig = url && anon && 
  url !== 'https://placeholder.supabase.co' && 
  anon !== 'placeholder-key' &&
  url.includes('.supabase.co');

console.log('Supabase config valid:', isValidSupabaseConfig);

export const sb = isValidSupabaseConfig 
  ? createClient(url, anon)
  : null;

// Helper to check if Supabase is available
export const isSupabaseAvailable = () => {
  const available = sb !== null;
  if (!available) {
    console.warn('Supabase not configured - authentication disabled');
  }
  return available;
};