import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';

// Force load .env file and bypass any cached environment variables
config({ path: resolve(process.cwd(), '.env'), override: true });

// Create connection string for the database - should always be Supabase
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔌 Database connection string:', connectionString.replace(/:[^:@]*@/, ':***@'));

// Verify we're using Supabase
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');
console.log('🔍 Is Supabase?', isSupabase);

if (!isSupabase) {
  console.error('❌ ERROR: DATABASE_URL must point to Supabase, not Neon or other providers');
  console.error('Current DATABASE_URL:', connectionString);
  throw new Error('Invalid database configuration - must use Supabase');
}

// Create postgres connection with Supabase-specific configuration
const client = postgres(connectionString, { 
  max: 20,
  ssl: 'require',
  connection: {
    application_name: 'rich-habits-app'
  }
});

// Create drizzle instance
export const db = drizzle(client, { schema });