import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import 'dotenv/config';

console.log('=== Database Connection Verification ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET (starts with ' + process.env.DATABASE_URL.substring(0, 20) + '...)' : 'NOT SET');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test Supabase connection
console.log('\n2. Testing Supabase Admin Client Connection:');
const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// Test if the table exists at all
const { data: tableExists, error: tableError } = await supabaseAdmin
  .from('users')
  .select('id')
  .limit(1);

if (tableError) {
  console.log('❌ Users table query failed:', tableError.message);
} else {
  console.log('✅ Users table exists and is queryable');
}

// Test Drizzle/pg connection (DATABASE_URL)
console.log('\n3. Testing Drizzle/pg Connection (DATABASE_URL):');
try {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY column_name");
  console.log('✅ Drizzle connection successful');
  console.log('Columns from DATABASE_URL:', result.rows.map(r => r.column_name));
  await pool.end();
} catch (error) {
  console.log('❌ Drizzle connection failed:', error.message);
}

// Compare URLs
console.log('\n4. URL Comparison:');
const databaseUrl = process.env.DATABASE_URL || '';
const supabaseUrl = process.env.SUPABASE_URL || '';

if (databaseUrl.includes(supabaseUrl.replace('https://', '')) || supabaseUrl.includes(databaseUrl.replace('postgresql://', ''))) {
  console.log('✅ URLs appear to point to the same database');
} else {
  console.log('❌ URLs point to different databases!');
  console.log('This explains the inconsistency between schema dump and queries');
}

console.log('\n=== Analysis Complete ===');
