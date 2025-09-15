
import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

console.log('🔍 Database Configuration Verification');
console.log('=====================================');

const requiredEnvVars = [
  'DATABASE_URL',
  'VITE_SUPABASE_URL', 
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n📋 Environment Variables Check:');
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    if (envVar.includes('KEY') || envVar.includes('URL')) {
      console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`✅ ${envVar}: ${value}`);
    }
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
  }
}

// Validate DATABASE_URL specifically
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  console.log('\n🔍 Database URL Analysis:');
  console.log(`Full URL (masked): ${dbUrl.replace(/:[^:@]*@/, ':***@')}`);
  
  if (dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com')) {
    console.log('✅ Using Supabase database');
  } else if (dbUrl.includes('neon.tech')) {
    console.log('❌ ERROR: Still using Neon database - this must be changed to Supabase');
  } else {
    console.log('❓ Unknown database provider');
  }
  
  // Test connection
  try {
    console.log('\n🔌 Testing database connection...');
    const client = postgres(dbUrl, { max: 1, ssl: 'require' });
    
    const result = await client`SELECT current_database(), current_user, current_timestamp`;
    console.log('✅ Connection successful!');
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
    console.log(`   Time: ${result[0].current_timestamp}`);
    
    await client.end();
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
} else {
  console.log('\n❌ DATABASE_URL not set - cannot test connection');
}

console.log('\n🎯 Next Steps:');
if (dbUrl?.includes('neon.tech')) {
  console.log('1. Update your DATABASE_URL to point to Supabase');
  console.log('2. Get your Supabase connection string from: https://supabase.com/dashboard/project/qkampkccsdiebvkcfuby/settings/database');
  console.log('3. Update the environment variable in Replit Secrets');
}
console.log('4. Restart your application after updating environment variables');
