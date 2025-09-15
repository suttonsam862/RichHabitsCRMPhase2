import { defineConfig } from "drizzle-kit";
import { env } from './server/lib/env.js';

// Ensure we're using Supabase
if (!env.DATABASE_URL?.includes('supabase.co') && !env.DATABASE_URL?.includes('supabase.com')) {
  throw new Error('DATABASE_URL must point to Supabase database');
}

export default defineConfig({
  schema: './shared/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});