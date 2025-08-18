#!/usr/bin/env tsx
import { generateTitleCard } from '../lib/tiles';
import { getLogoPalette } from '../lib/palette';
import { db } from '../db';
import { organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function testTitleCardGeneration() {
  console.log('🎨 Testing Title Card Generation...\n');
  
  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY environment variable');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set\n');
  
  // Get a test organization (first one with a logo)
  try {
    const orgs = await db.select().from(organizations).limit(5);
    const testOrg = orgs.find(o => o.logo_url) || orgs[0];
    
    if (!testOrg) {
      console.log('ℹ️ No organizations found. Creating a test organization...');
      
      // Create a test organization
      const [newOrg] = await db.insert(organizations).values({
        name: 'Test Sports Academy',
        logo_url: 'https://qkampkccsdiebvkcfuby.supabase.co/storage/v1/object/public/logos/org-logos/test-logo.png',
        brand_primary: '#3B82F6',
        brand_secondary: '#8B5CF6',
        state: 'AL',
        is_business: false,
        universal_discounts: {}
      }).returning();
      
      testOrg = newOrg;
      console.log('✅ Test organization created:', testOrg.id);
    }
    
    console.log('🏢 Testing with organization:', testOrg.name);
    console.log('🎨 Brand colors:', {
      primary: testOrg.brand_primary || '#3B82F6',
      secondary: testOrg.brand_secondary || '#8B5CF6'
    });
    
    // Extract palette from logo if available
    if (testOrg.logo_url) {
      console.log('\n📸 Extracting color palette from logo...');
      const palette = await getLogoPalette(testOrg.logo_url);
      console.log('🎨 Logo palette:', palette);
    }
    
    // Generate title card
    console.log('\n🖼️ Generating title card...');
    const titleCardUrl = await generateTitleCard({
      orgId: testOrg.id,
      teamName: testOrg.name,
      logoUrl: testOrg.logo_url || '',
      brandPrimaryHex: testOrg.brand_primary || '#3B82F6',
      brandSecondaryHex: testOrg.brand_secondary || '#8B5CF6'
    });
    
    console.log('✅ Title card generated successfully!');
    console.log('📍 URL:', titleCardUrl);
    
    // Update the organization with the title card URL
    await db.update(organizations)
      .set({ title_card_url: titleCardUrl })
      .where(eq(organizations.id, testOrg.id));
    
    console.log('✅ Organization updated with title card URL');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
  
  console.log('\n✨ Title card generation test completed successfully!');
  process.exit(0);
}

// Run the test
testTitleCardGeneration();