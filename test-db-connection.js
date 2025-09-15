import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

// Use the same connection string as the server
const connectionString = "postgresql://postgres.qkampkccsdiebvkcfuby:Arlodog2013!@aws-0-us-east-2.pooler.supabase.com:5432/postgres";
console.log('Testing connection to:', connectionString.replace(/:\/\/[^:]*:[^@]*@/, '://***:***@'));

const client = postgres(connectionString, { 
  max: 20, 
  ssl: 'require'
});
const db = drizzle(client);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful, current time:', result[0]?.current_time);

    // Check for tables
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'salesperson%'
    `);
    console.log('📊 Salesperson tables found:', tables.map(t => t.table_name));

    // Check data
    const profileCount = await db.execute(sql`SELECT COUNT(*) as count FROM public.salesperson_profiles`);
    console.log('👥 Salesperson profiles count:', profileCount[0]?.count);

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();