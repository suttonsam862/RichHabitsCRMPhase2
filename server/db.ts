import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';

// Force load .env file and bypass any cached environment variables
config({ path: resolve(process.cwd(), '.env'), override: true });

const DATABASE_URL = "postgresql://postgres.qkampkccsdiebvkcfuby:Arlodog2013!@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

// Force connection to Supabase if detected
const connectionString = DATABASE_URL.includes('supabase.co')
  ? DATABASE_URL.replace('postgresql://', 'postgresql://').replace(/\/[^?]+/, '/postgres')
  : DATABASE_URL;

console.log('🔌 Database connection string:', connectionString.replace(/:\/\/[^:]*:[^@]*@/, '://***:***@'));
console.log('🔍 Is Supabase?', connectionString.includes('supabase.co'));
console.log('🔍 Is Neon?', connectionString.includes('neon.tech'));

const client = postgres(connectionString, { max: 20 });
export const db = drizzle(client, { schema });