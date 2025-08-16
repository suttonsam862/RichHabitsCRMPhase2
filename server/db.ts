
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';

// Force load .env file and bypass any cached environment variables
config({ path: resolve(process.cwd(), '.env'), override: true });

const DATABASE_URL = "postgresql://postgres.qkampkccsdiebvkcfuby:Arlodog2013!@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

console.log('🔌 Forcing connection to Supabase:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
const client = postgres(DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
