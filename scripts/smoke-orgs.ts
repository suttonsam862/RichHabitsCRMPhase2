
import { db } from '../server/db';
import { organizations } from '../shared/schema';

async function smokeTestOrganizations() {
  try {
    console.log('🔍 Testing organizations table access...');
    
    // Test basic select
    const orgs = await db.select().from(organizations).limit(5);
    console.log(`✅ Successfully queried organizations: ${orgs.length} found`);
    
    // Test insert (minimal required fields only)
    const testOrg = {
      name: 'Smoke Test Org',
      universalDiscounts: {},
      colorPalette: [],
      tags: []
    };
    
    console.log('🔍 Testing organization creation...');
    const [newOrg] = await db.insert(organizations).values(testOrg).returning();
    console.log(`✅ Successfully created test organization: ${newOrg.id}`);
    
    // Clean up test data
    await db.delete(organizations).where(organizations.id.eq(newOrg.id));
    console.log('✅ Test organization cleaned up');
    
    console.log('🎉 All organization smoke tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    process.exit(1);
  }
}

smokeTestOrganizations();
