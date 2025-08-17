import { db } from '../db';
import { sql } from 'drizzle-orm';

async function fixOrgSportsSchema() {
  try {
    console.log('🔧 Fixing org_sports schema...');
    
    // Check current schema
    console.log('Checking current org_sports table structure...');
    const currentSchema = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'org_sports' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current schema:', currentSchema);
    
    // Drop and recreate with correct schema
    console.log('Dropping existing table...');
    await db.execute(sql`DROP TABLE IF EXISTS org_sports CASCADE`);
    
    console.log('Creating table with correct schema...');
    await db.execute(sql`
      CREATE TABLE org_sports (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar NOT NULL,
        sport_id varchar NOT NULL,
        contact_name text NOT NULL,
        contact_email text NOT NULL,
        contact_phone text,
        created_at timestamp DEFAULT NOW(),
        UNIQUE(organization_id, sport_id)
      )
    `);
    
    // Verify new schema
    const newSchema = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'org_sports' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ New schema:', newSchema);
    console.log('✅ org_sports table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error);
    throw error;
  }
}

// Direct execution
fixOrgSportsSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { fixOrgSportsSchema };