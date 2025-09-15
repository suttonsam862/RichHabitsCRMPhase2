
const { drizzle } = require('drizzle-orm/postgres-js');
const { sql } = require('drizzle-orm');
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
console.log('Testing connection to:', connectionString ? connectionString.replace(/:\/\/[^:]*:[^@]*@/, '://***:***@') : 'NO DATABASE_URL');

const client = postgres(connectionString, { max: 1 });
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
