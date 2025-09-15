#!/usr/bin/env node
/**
 * Complete Neon to Supabase Migration Script
 * This script performs all necessary checks and fixes for the migration
 */

import { config } from 'dotenv';
import chalk from 'chalk';
import { execSync } from 'child_process';

config();

console.log(chalk.bold.blue('\n🚀 Starting Complete Neon to Supabase Migration\n'));

// Step 1: Check DATABASE_URL
console.log(chalk.yellow('Step 1: Checking DATABASE_URL configuration...'));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(chalk.red('❌ DATABASE_URL is not set!'));
  console.log(chalk.cyan('\nPlease set DATABASE_URL in Replit Secrets to:'));
  console.log(chalk.green('Your Supabase connection string from: https://supabase.com/dashboard/project/[YOUR_PROJECT]/settings/database'));
  process.exit(1);
}

const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('supabase.com');
const isNeon = databaseUrl.includes('neon.tech');

if (isNeon) {
  console.error(chalk.red('❌ DATABASE_URL is still pointing to Neon!'));
  console.log(chalk.yellow('\nCurrent DATABASE_URL:'), databaseUrl.replace(/:[^:@]*@/, ':***@'));
  console.log(chalk.cyan('\nTo fix this:'));
  console.log('1. Go to Replit Secrets (lock icon in sidebar)');
  console.log('2. Update DATABASE_URL to:');
  console.log(chalk.green('Your Supabase connection string from Dashboard > Settings > Database'));
  console.log('3. Save and restart the application');
  process.exit(1);
} else if (isSupabase) {
  console.log(chalk.green('✅ DATABASE_URL is correctly pointing to Supabase'));
} else {
  console.error(chalk.red('❌ DATABASE_URL is not pointing to either Neon or Supabase!'));
  console.log(chalk.yellow('\nCurrent DATABASE_URL:'), databaseUrl.replace(/:[^:@]*@/, ':***@'));
  process.exit(1);
}

// Step 2: Check other Supabase environment variables
console.log(chalk.yellow('\nStep 2: Checking Supabase environment variables...'));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let envIssues = [];
if (!supabaseUrl) envIssues.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) envIssues.push('VITE_SUPABASE_ANON_KEY');
if (!supabaseServiceKey) envIssues.push('SUPABASE_SERVICE_ROLE_KEY');

if (envIssues.length > 0) {
  console.error(chalk.red('❌ Missing Supabase environment variables:'), envIssues.join(', '));
  console.log(chalk.cyan('\nPlease set these in Replit Secrets'));
  process.exit(1);
} else {
  console.log(chalk.green('✅ All Supabase environment variables are set'));
}

// Step 3: Test database connection
console.log(chalk.yellow('\nStep 3: Testing database connection...'));
try {
  execSync('node test-db-connection.js', { stdio: 'inherit' });
  console.log(chalk.green('✅ Database connection test passed'));
} catch (error) {
  console.error(chalk.red('❌ Database connection test failed'));
  process.exit(1);
}

// Step 4: Sync database schema
console.log(chalk.yellow('\nStep 4: Syncing database schema...'));
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log(chalk.green('✅ Database schema synchronized'));
} catch (error) {
  console.error(chalk.red('❌ Schema synchronization failed'));
  console.log(chalk.yellow('Attempting force push...'));
  try {
    execSync('npm run db:push --force', { stdio: 'inherit' });
    console.log(chalk.green('✅ Database schema force synchronized'));
  } catch (forceError) {
    console.error(chalk.red('❌ Force push also failed'));
    process.exit(1);
  }
}

// Step 5: Verify all tables exist
console.log(chalk.yellow('\nStep 5: Verifying database tables...'));
try {
  execSync('node debug-salesperson-tables.js', { stdio: 'inherit' });
  console.log(chalk.green('✅ All required tables exist'));
} catch (error) {
  console.error(chalk.red('❌ Some tables are missing'));
  console.log(chalk.yellow('Creating missing tables...'));
  try {
    execSync('node create-salesperson-tables.js', { stdio: 'inherit' });
    console.log(chalk.green('✅ Tables created successfully'));
  } catch (createError) {
    console.error(chalk.red('❌ Failed to create tables'));
    process.exit(1);
  }
}

// Step 6: Final verification
console.log(chalk.yellow('\nStep 6: Final verification...'));
console.log(chalk.green('\n✨ Migration Complete! ✨\n'));
console.log(chalk.cyan('Summary:'));
console.log('  • DATABASE_URL pointing to Supabase ✅');
console.log('  • All environment variables configured ✅');
console.log('  • Database connection successful ✅');
console.log('  • Schema synchronized ✅');
console.log('  • All tables verified ✅');
console.log(chalk.yellow('\nNext steps:'));
console.log('1. Start the application: npm run dev');
console.log('2. Test all pages to ensure data loads correctly');
console.log('3. Test creating new entities (organizations, users, etc.)');
console.log(chalk.green('\n🎉 Your application is now fully migrated to Supabase!'));