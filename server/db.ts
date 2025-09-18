
import { config } from 'dotenv';
import { resolve } from 'path';
import { supabaseAdmin } from './lib/supabase';

// Force load .env file and bypass any cached environment variables
config({ path: resolve(process.cwd(), '.env'), override: true });

// Verify we're using Supabase
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔌 Database connection string:', connectionString.replace(/:[^:@]*@/, ':***@'));

const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');
console.log('🔍 Is Supabase?', isSupabase);

if (!isSupabase) {
  console.error('❌ ERROR: DATABASE_URL must point to Supabase, not Neon or other providers');
  console.error('Current DATABASE_URL:', connectionString);
  throw new Error('Invalid database configuration - must use Supabase');
}

// Export Supabase admin client for database operations
export const db = supabaseAdmin;

// Test database connection using Supabase
async function testConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('organizations').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Supabase database connection test successful');
  } catch (error) {
    console.error('❌ Supabase database connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Test connection on startup
testConnection().catch(error => {
  console.error('Failed to establish Supabase database connection:', error);
});
