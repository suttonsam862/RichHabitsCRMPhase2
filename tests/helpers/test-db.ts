/**
 * Test Database Configuration and Utilities
 * Provides isolated test database setup with proper environment guards
 */

import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

// Environment guard to prevent accidental production data mutation
export function ensureTestEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;
  const databaseUrl = process.env.DATABASE_URL;
  
  if (nodeEnv !== 'test') {
    throw new Error(
      `SAFETY: Test database operations only allowed in NODE_ENV=test environment. Current: ${nodeEnv}`
    );
  }
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for test environment');
  }
  
  // STRICT production database protection - hard-fail on production patterns
  const urlLower = databaseUrl.toLowerCase();
  
  // Immediately reject known production patterns
  const productionPatterns = [
    'neon.tech',
    'neon.db',
    'supabase.co',
    'amazonaws.com',
    'rds.',
    'prod',
    'production',
    'mainnet',
    'primary',
    'master',
    'staging'
  ];
  
  for (const pattern of productionPatterns) {
    if (urlLower.includes(pattern)) {
      throw new Error(
        `CRITICAL SAFETY: Production database pattern detected: '${pattern}'. ` +
        `Test operations are FORBIDDEN on production databases. URL: ${databaseUrl}`
      );
    }
  }
  
  // Require explicit test markers
  const hasTestMarkers = 
    urlLower.includes('test') || 
    urlLower.includes('localhost') ||
    urlLower.includes('127.0.0.1');
  
  if (!hasTestMarkers) {
    throw new Error(
      'SAFETY: Database URL must contain explicit test markers (test, localhost, 127.0.0.1) for test environment. ' +
      `Current URL: ${databaseUrl}`
    );
  }
  
  // Additional check: ensure no suspicious ports or hosts
  if (urlLower.includes(':3306') || urlLower.includes(':1433') || urlLower.includes(':27017')) {
    throw new Error(
      'SAFETY: Suspicious database port detected. Only PostgreSQL on standard ports allowed for tests.'
    );
  }
}

/**
 * Initialize test database with clean state
 */
export async function initializeTestDatabase(): Promise<void> {
  ensureTestEnvironment();
  
  try {
    // Clean slate - remove all test data but preserve schema
    await cleanTestDatabase();
    
    // Seed minimal required data for tests
    await seedTestDatabase();
    
    console.log('✅ Test database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean test database - removes all data but preserves schema
 */
export async function cleanTestDatabase(): Promise<void> {
  ensureTestEnvironment();
  
  try {
    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = replica;`);
    
    // Get all user tables (excluding system tables)
    const result = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'information_%'
      AND tablename != '_drizzle_migrations'
      ORDER BY tablename;
    `);
    
    // Truncate all tables
    for (const row of result) {
      const tableName = row.tablename as string;
      await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`));
    }
    
    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = DEFAULT;`);
    
    console.log('🧹 Test database cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean test database:', error);
    throw error;
  }
}

/**
 * Seed minimal test data required for tests to run
 */
export async function seedTestDatabase(): Promise<void> {
  ensureTestEnvironment();
  
  try {
    // Seed essential status tables
    await seedStatusTables();
    
    // Seed test organizations
    await seedTestOrganizations();
    
    // Seed test users
    await seedTestUsers();
    
    console.log('🌱 Test database seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed test database:', error);
    throw error;
  }
}

/**
 * Seed essential status lookup tables
 */
async function seedStatusTables(): Promise<void> {
  // Seed order status codes
  await db.execute(sql`
    INSERT INTO status_orders (code, sort_order, is_terminal) VALUES
    ('draft', 1, false),
    ('pending', 2, false),
    ('confirmed', 3, false),
    ('processing', 4, false),
    ('shipped', 5, false),
    ('delivered', 6, false),
    ('completed', 7, true),
    ('cancelled', 8, true)
    ON CONFLICT (code) DO NOTHING;
  `);
  
  // Seed order item status codes
  await db.execute(sql`
    INSERT INTO status_order_items (code, sort_order, is_terminal) VALUES
    ('pending', 1, false),
    ('designing', 2, false),
    ('manufacturing', 3, false),
    ('quality_check', 4, false),
    ('ready', 5, false),
    ('shipped', 6, false),
    ('completed', 7, true),
    ('cancelled', 8, true)
    ON CONFLICT (code) DO NOTHING;
  `);
}

/**
 * Seed test organizations
 */
async function seedTestOrganizations(): Promise<void> {
  await db.execute(sql`
    INSERT INTO organizations (
      id, 
      name, 
      slug, 
      status, 
      contact_email,
      created_at,
      updated_at
    ) VALUES
    (
      'test-org-1',
      'Test Organization 1',
      'test-org-1',
      'active',
      'admin@test-org-1.com',
      NOW(),
      NOW()
    ),
    (
      'test-org-2', 
      'Test Organization 2',
      'test-org-2',
      'active',
      'admin@test-org-2.com',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

/**
 * Seed test users
 */
async function seedTestUsers(): Promise<void> {
  await db.execute(sql`
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      organization_id,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES
    (
      'test-user-1',
      'test-user-1@example.com',
      'Test User 1',
      'admin',
      'test-org-1',
      false,
      NOW(),
      NOW()
    ),
    (
      'test-user-2',
      'test-user-2@example.com',
      'Test User 2',
      'user',
      'test-org-2',
      false,
      NOW(),
      NOW()
    ),
    (
      'test-admin',
      'admin@example.com',
      'Test Admin',
      'admin',
      'test-org-1',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

/**
 * Test-specific database connection with safety checks
 */
export function getTestDatabase() {
  ensureTestEnvironment();
  return db;
}

/**
 * Create isolated test transaction for individual test cases
 */
export async function withTestTransaction<T>(
  testFn: (tx: any) => Promise<T>
): Promise<T> {
  ensureTestEnvironment();
  
  return await db.transaction(async (tx) => {
    try {
      const result = await testFn(tx);
      // Transaction will auto-rollback after test unless explicitly committed
      return result;
    } catch (error) {
      // Transaction will auto-rollback on error
      throw error;
    }
  });
}

/**
 * Verify test database connectivity and safety
 */
export async function verifyTestDatabase(): Promise<void> {
  ensureTestEnvironment();
  
  try {
    // Test basic connectivity
    const result = await db.execute(sql`SELECT 1 as test;`);
    if (!result || result.length === 0) {
      throw new Error('Database connectivity test failed');
    }
    
    // Verify we're not accidentally connected to production
    const dbName = await db.execute(sql`SELECT current_database() as db_name;`);
    const currentDb = (dbName[0] as any).db_name;
    
    console.log(`✅ Test database verified: ${currentDb}`);
    
    if (currentDb.toLowerCase().includes('prod')) {
      throw new Error(`SAFETY: Connected to production-like database: ${currentDb}`);
    }
    
  } catch (error) {
    console.error('❌ Test database verification failed:', error);
    throw error;
  }
}