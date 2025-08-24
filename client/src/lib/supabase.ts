import { createClient } from '@supabase/supabase-js';

// Use environment variables first, fall back to hardcoded values if placeholders
const envUrl = import.meta.env.VITE_SUPABASE_URL as string;
const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const url = envUrl === 'https://placeholder.supabase.co' || !envUrl 
  ? 'https://qkampkccsdiebvkcfuby.supabase.co' 
  : envUrl;

const anon = envAnon === 'placeholder-key' || !envAnon
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYW1wa2Njc2RpZWJ2a2NmdWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDAxMTYsImV4cCI6MjA2MjMxNjExNn0.LX_uhF0JFDJ4xKriJ4Z8ip753DhTwKJA7lD-uLvlXAo'
  : envAnon;

console.log('Using Supabase URL:', url);
console.log('Using Anon Key:', anon.substring(0, 20) + '...');

// Check if we have valid Supabase credentials
const isValidSupabaseConfig = url && anon && 
  url.includes('.supabase.co') && 
  anon.length > 20;

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