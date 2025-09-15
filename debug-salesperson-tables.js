
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Verify we're using Supabase
if (!connectionString.includes('supabase.co') && !connectionString.includes('supabase.com')) {
  console.error('❌ DATABASE_URL must point to Supabase database');
  console.error('Current URL:', connectionString.replace(/:[^:@]*@/, ':***@'));
  process.exit(1);
}

console.log('✅ Using Supabase connection:', connectionString.replace(/:[^:@]*@/, ':***@'));

const client = postgres(connectionString, { 
  max: 20, 
  ssl: 'require'
});

async function debugTables() {
  try {
    console.log('🔍 Debugging salesperson tables...');

    // Check current schema
    const currentSchema = await client`SELECT current_schema()`;
    console.log('📋 Current schema:', currentSchema[0]?.current_schema);

    // Check all schemas
    const allSchemas = await client`SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`;
    console.log('📂 Available schemas:', allSchemas.map(s => s.schema_name));

    // Check tables in all schemas
    const allTables = await client`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename LIKE '%salesperson%' 
      ORDER BY schemaname, tablename
    `;
    console.log('📊 Salesperson tables found:', allTables);

    // Check specifically in public schema
    const publicTables = await client`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%salesperson%'
    `;
    console.log('🏢 Public schema salesperson tables:', publicTables.map(t => t.tablename));

    // Check if tables exist via information_schema
    const tableExists = await client`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_name IN ('salesperson_profiles', 'salesperson_assignments', 'salesperson_metrics')
      ORDER BY table_schema, table_name
    `;
    console.log('✅ Table existence check:', tableExists);

    // Try to access each table directly
    const tables = ['salesperson_profiles', 'salesperson_assignments', 'salesperson_metrics'];
    
    for (const table of tables) {
      try {
        console.log(`\n🔍 Testing access to ${table}...`);
        
        // Try public schema first
        const publicCount = await client`SELECT COUNT(*) as count FROM ${client(table)}`;
        console.log(`✅ ${table}: ${publicCount[0]?.count} rows`);
      } catch (error) {
        console.log(`❌ ${table} failed:`, error.message);
      }
    }

    // Check table structure
    console.log('\n📋 Checking table structures...');
    try {
      const columns = await client`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'salesperson_profiles'
        ORDER BY ordinal_position
      `;
      console.log('🏗️ salesperson_profiles columns:', columns);
    } catch (error) {
      console.log('❌ Could not get column info:', error.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await client.end();
  }
}

debugTables();
