
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';

// Use Session Pooler URL via DATABASE_URL; disable prepared statements for pooler
console.log('🔌 Connecting to database:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
