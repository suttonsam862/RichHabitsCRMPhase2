#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';
import fetch from 'node-fetch';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

async function generateTitleCard(orgName: string, brandPrimary: string, brandSecondary: string): Promise<string> {
  console.log(`📸 Generating title card for ${orgName}...`);
  
  const prompt = `Create a crisp title card for a sports team with a 2:1 aspect ratio.
Text: "${orgName}" in a bold, high-contrast wordmark.
Style: vibrant neon gradient strokes with subtle abstract stripes in the background, clean edges.
Color rules: Use ${brandPrimary} and ${brandSecondary}.
Composition: Centered wordmark, strong contrast against background.`;

  const img = await openai.images.generate({
    model: 'dall-e-2',
    prompt,
    size: '1024x1024',
    n: 1,
    response_format: 'b64_json'
  });

  if (!img.data || !img.data[0]?.b64_json) {
    throw new Error('No image data received from OpenAI');
  }

  // Resize to 1024x512
  const fileBytes = Buffer.from(img.data[0].b64_json, 'base64');
  const processedBuffer = await sharp(fileBytes)
    .resize(1024, 512, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  // Upload to Supabase
  const fileName = `org-${Date.now()}/title.png`;
  const { error: uploadError } = await supabase.storage.from('org-tiles')
    .upload(fileName, processedBuffer, { 
      contentType: 'image/png', 
      upsert: true 
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: pub } = supabase.storage.from('org-tiles').getPublicUrl(fileName);
  console.log(`✅ Title card uploaded: ${pub.publicUrl}`);
  
  return pub.publicUrl;
}

async function testOrganizationWithTitle() {
  console.log('🎨 Testing Organization Creation with Title Card\n');
  
  try {
    // Create test organization data
    const testOrg = {
      name: `Elite Sports Academy ${Date.now()}`,
      state: 'CA',
      address: '123 Sports Way',
      phone: '555-0100',
      email: 'test@elitesports.com',
      brand_primary: '#FF6B6B',
      brand_secondary: '#4ECDC4',
      logo_url: 'https://qkampkccsdiebvkcfuby.supabase.co/storage/v1/object/public/org-logos/placeholder.svg',
      universal_discounts: {},
      notes: 'Test organization with title card',
      is_business: false
    };
    
    console.log('📝 Creating organization in database...');
    
    // Generate title card
    const titleCardUrl = await generateTitleCard(
      testOrg.name,
      testOrg.brand_primary,
      testOrg.brand_secondary
    );
    
    // Insert organization with title card
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...testOrg,
        title_card_url: titleCardUrl,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orgError) {
      throw orgError;
    }
    
    console.log('\n✨ Organization created successfully!');
    console.log('📊 Organization Details:');
    console.log(`  - ID: ${orgData.id}`);
    console.log(`  - Name: ${orgData.name}`);
    console.log(`  - Title Card: ${orgData.title_card_url}`);
    console.log(`  - Brand Colors: ${orgData.brand_primary} / ${orgData.brand_secondary}`);
    
    // Verify the title card is accessible
    console.log('\n🔍 Verifying title card accessibility...');
    const response = await fetch(orgData.title_card_url);
    if (response.ok) {
      console.log('✅ Title card is publicly accessible');
    } else {
      console.log('⚠️ Title card URL returned status:', response.status);
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOrganizationWithTitle();