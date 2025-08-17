import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ExpectedColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

const EXPECTED_SCHEMA: Record<string, ExpectedColumn[]> = {
  organizations: [
    { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    { name: 'name', type: 'text', nullable: false },
    { name: 'address', type: 'text', nullable: true },
    { name: 'state', type: 'text', nullable: true },
    { name: 'phone', type: 'text', nullable: true },
    { name: 'email', type: 'text', nullable: true },
    { name: 'logo_url', type: 'text', nullable: true },
    { name: 'is_business', type: 'boolean', nullable: false, default: 'false' },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'universal_discounts', type: 'jsonb', nullable: false, default: '{}' },
    { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
    { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
  ],
  roles: [
    { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    { name: 'slug', type: 'text', nullable: false },
    { name: 'name', type: 'text', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' }
  ],
  user_roles: [
    { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'org_id', type: 'uuid', nullable: false },
    { name: 'role_id', type: 'uuid', nullable: false },
    { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' }
  ]
};

async function auditSchema() {
  console.log('🔍 Starting Schema Audit...\n');
  
  try {
    // Query the information_schema for all relevant tables
    const columnsQuery = sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name IN ('organizations', 'roles', 'user_roles')
      ORDER BY table_name, ordinal_position
    `;
    
    const columns = await db.execute(columnsQuery) as any;
    const actualColumns: ColumnInfo[] = columns.rows || columns;
    
    // Group columns by table
    const actualSchema: Record<string, ColumnInfo[]> = {};
    for (const col of actualColumns) {
      if (!actualSchema[col.table_name]) {
        actualSchema[col.table_name] = [];
      }
      actualSchema[col.table_name].push(col);
    }
    
    // Compare expected vs actual
    const issues: string[] = [];
    const migrations: string[] = [];
    
    console.log('📊 Schema Comparison:\n');
    
    for (const [tableName, expectedCols] of Object.entries(EXPECTED_SCHEMA)) {
      console.log(`\n=== Table: ${tableName} ===`);
      
      const actualCols = actualSchema[tableName] || [];
      const actualColNames = new Set(actualCols.map(c => c.column_name));
      
      // Check if table exists
      if (actualCols.length === 0) {
        console.log(`❌ Table does not exist`);
        issues.push(`Table '${tableName}' is missing`);
        
        // Generate CREATE TABLE migration
        if (tableName === 'organizations') {
          migrations.push(`
-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_business BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  universal_discounts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
        } else if (tableName === 'roles') {
          migrations.push(`
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (slug, name, description) VALUES 
  ('owner', 'Owner', 'Organization owner with full permissions')
ON CONFLICT (slug) DO NOTHING;`);
        } else if (tableName === 'user_roles') {
          migrations.push(`
-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);`);
        }
        continue;
      }
      
      // Check each expected column
      for (const expectedCol of expectedCols) {
        const actualCol = actualCols.find(c => c.column_name === expectedCol.name);
        
        if (!actualCol) {
          console.log(`  ❌ Missing column: ${expectedCol.name} (${expectedCol.type})`);
          issues.push(`Column '${tableName}.${expectedCol.name}' is missing`);
          
          // Generate ALTER TABLE migration for missing column
          let columnDef = `${expectedCol.name} ${expectedCol.type.toUpperCase()}`;
          if (!expectedCol.nullable) columnDef += ' NOT NULL';
          if (expectedCol.default) columnDef += ` DEFAULT ${expectedCol.default}`;
          
          migrations.push(`
-- Add missing column ${expectedCol.name} to ${tableName}
ALTER TABLE ${tableName} 
ADD COLUMN IF NOT EXISTS ${columnDef};`);
        } else {
          const typeMatch = actualCol.data_type.includes(expectedCol.type) || 
                          (expectedCol.type === 'uuid' && actualCol.data_type === 'uuid') ||
                          (expectedCol.type === 'timestamp' && actualCol.data_type.includes('timestamp'));
          const nullMatch = (actualCol.is_nullable === 'YES') === expectedCol.nullable;
          
          if (typeMatch && nullMatch) {
            console.log(`  ✅ ${expectedCol.name}: ${actualCol.data_type} ${actualCol.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
          } else {
            console.log(`  ⚠️  ${expectedCol.name}: Expected ${expectedCol.type} ${expectedCol.nullable ? 'NULL' : 'NOT NULL'}, Got ${actualCol.data_type} ${actualCol.is_nullable}`);
            if (!typeMatch) {
              issues.push(`Column '${tableName}.${expectedCol.name}' has wrong type: expected ${expectedCol.type}, got ${actualCol.data_type}`);
            }
            if (!nullMatch) {
              issues.push(`Column '${tableName}.${expectedCol.name}' has wrong nullability: expected ${expectedCol.nullable ? 'NULL' : 'NOT NULL'}, got ${actualCol.is_nullable}`);
            }
          }
        }
      }
      
      // Check for unexpected columns
      for (const actualCol of actualCols) {
        if (!expectedCols.some(e => e.name === actualCol.column_name)) {
          console.log(`  ℹ️  Extra column: ${actualCol.column_name} (${actualCol.data_type})`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (issues.length === 0) {
      console.log('✅ Schema audit complete: All OK!');
    } else {
      console.log(`⚠️  Schema audit found ${issues.length} issue(s):`);
      issues.forEach(issue => console.log(`  - ${issue}`));
      
      // Write migration file if needed
      if (migrations.length > 0) {
        const migrationDir = path.join(__dirname, '..', 'sql', 'migrations');
        if (!fs.existsSync(migrationDir)) {
          fs.mkdirSync(migrationDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const migrationFile = path.join(migrationDir, `${timestamp}_fix_schema.sql`);
        const migrationContent = `-- Auto-generated migration to fix schema issues
-- Generated at: ${new Date().toISOString()}

${migrations.join('\n')}

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_state ON organizations(state);
CREATE INDEX IF NOT EXISTS idx_organizations_is_business ON organizations(is_business);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(org_id);
`;
        
        fs.writeFileSync(migrationFile, migrationContent);
        console.log(`\n📝 Migration file generated: ${migrationFile}`);
        console.log('Run the migration with: npm run db:migrate');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during schema audit:', error);
    process.exit(1);
  }
}

// Run the audit
auditSchema().then(() => {
  console.log('\n✨ Schema audit completed');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});