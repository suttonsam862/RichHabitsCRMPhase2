// This file provides environment variables for drizzle.config.ts
// It's a JavaScript wrapper around the TypeScript env module
import { config } from 'dotenv';
config();

// Export environment variables with fallbacks
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  ORIGINS: process.env.ORIGINS || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ENABLE_DOMAIN_STUBS: process.env.ENABLE_DOMAIN_STUBS || '0'
};

// Basic validation for critical variables
if (!env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  process.exit(1);
}