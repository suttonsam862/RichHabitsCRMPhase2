#!/usr/bin/env node
/**
 * Ensure Database Setup Script
 * This script ensures all necessary extensions, tables, and configurations are in place
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './shared/schema.js';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (!connectionString.includes('supabase')) {
  console.error('❌ DATABASE_URL must point to Supabase');
  process.exit(1);
}

console.log('🔧 Setting up database...');

const client = postgres(connectionString, { 
  max: 20,
  ssl: 'require',
  connection: {
    application_name: 'database-setup'
  }
});

const db = drizzle(client, { schema });

async function setupDatabase() {
  try {
    // Step 1: Enable pgcrypto extension for UUID generation
    console.log('📦 Enabling pgcrypto extension...');
    await client`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    console.log('✅ pgcrypto extension enabled');

    // Step 2: Check and create essential tables
    console.log('\n🏗️ Checking essential tables...');
    
    // Check if roles table exists and has data
    const rolesExist = await client`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'roles' AND table_schema = 'public'
    `;
    
    if (rolesExist[0].count === '0') {
      console.log('❌ Roles table does not exist - will be created by db:push');
    } else {
      console.log('✅ Roles table exists');
      
      // Check if roles are seeded
      const rolesCount = await client`SELECT COUNT(*) as count FROM roles`;
      if (rolesCount[0].count === '0') {
        console.log('🌱 Seeding default roles...');
        await client`
          INSERT INTO roles (name, slug, description, permissions, is_active) VALUES 
          ('Administrator', 'admin', 'Full system access', '{"*": true}'::jsonb, true),
          ('Sales', 'sales', 'Sales team member', '{"sales": true, "orders": true}'::jsonb, true),
          ('Designer', 'design', 'Design team member', '{"design": true}'::jsonb, true),
          ('Customer', 'customer', 'Regular customer', '{"orders.view.own": true}'::jsonb, true)
        `;
        console.log('✅ Default roles seeded');
      } else {
        console.log('✅ Roles already seeded');
      }
    }

    // Check salesperson tables
    const salespersonTables = ['salesperson_profiles', 'salesperson_assignments', 'salesperson_metrics'];
    for (const table of salespersonTables) {
      const exists = await client`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = ${table} AND table_schema = 'public'
      `;
      
      if (exists[0].count === '0') {
        console.log(`❌ ${table} table does not exist - will be created by db:push`);
      } else {
        console.log(`✅ ${table} table exists`);
      }
    }

    // Check other critical tables
    const criticalTables = ['organizations', 'users', 'sports', 'manufacturers', 'orders'];
    for (const table of criticalTables) {
      const exists = await client`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = ${table} AND table_schema = 'public'
      `;
      
      if (exists[0].count === '0') {
        console.log(`❌ ${table} table does not exist - will be created by db:push`);
      } else {
        console.log(`✅ ${table} table exists`);
      }
    }

    console.log('\n✨ Database setup check complete!');
    console.log('\nNext steps:');
    console.log('1. If any tables are missing, run: npm run db:push');
    console.log('2. If push fails with data loss warning, run: npm run db:push --force');
    console.log('3. Test the application to ensure all features work');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();