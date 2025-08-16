
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Use the actual Supabase values from .env to bypass any environment variable issues
const supabaseUrl = 'https://qkampkccsdiebvkcfuby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYW1wa2Njc2RpZWJ2a2NmdWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDAxMTYsImV4cCI6MjA2MjMxNjExNn0.LX_uhF0JFDJ4xKriJ4Z8ip753DhTwKJA7lD-uLvlXAo';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;
