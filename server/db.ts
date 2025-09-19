
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './lib/env';
import * as schema from '../shared/schema';

// Verify we're using Supabase
const connectionString = env.DATABASE_URL;

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

// Initialize postgres connection
const sql = postgres(connectionString);

// Export Drizzle database instance for database operations
export const db = drizzle(sql, { schema });

// Test database connection using Drizzle
async function testConnection() {
  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection test successful');
  } catch (error) {
    console.error('❌ Database connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Test connection on startup
testConnection().catch(error => {
  console.error('Failed to establish database connection:', error);
});
