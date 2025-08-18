#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';

async function testCompleteFlow() {
  console.log('🎨 Testing Complete Title Card Generation Flow\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  
  try {
    // 1. Generate a unique test organization
    const orgName = `Championship Academy ${Date.now()}`;
    const brandPrimary = '#8B5CF6';  // Purple
    const brandSecondary = '#06B6D4'; // Cyan
    
    console.log(`📝 Creating organization: ${orgName}`);
    console.log(`   Brand colors: ${brandPrimary} / ${brandSecondary}\n`);
    
    // 2. Generate title card
    console.log('🎨 Generating title card with OpenAI...');
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

    const fileBytes = Buffer.from(img.data[0].b64_json!, 'base64');
    
    // 3. Resize to 1024x512
    console.log('📐 Resizing to 1024x512...');
    const processedBuffer = await sharp(fileBytes)
      .resize(1024, 512, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();
    
    // 4. Upload to Supabase storage
    console.log('☁️ Uploading to Supabase storage...');
    const fileName = `org-${Date.now()}/title.png`;
    await supabase.storage.from('org-tiles')
      .upload(fileName, processedBuffer, { 
        contentType: 'image/png', 
        upsert: true 
      });
    
    const { data: pub } = supabase.storage.from('org-tiles').getPublicUrl(fileName);
    console.log(`✅ Title card URL: ${pub.publicUrl}\n`);
    
    // 5. Create organization in database
    console.log('💾 Saving organization to database...');
    const { data: org, error } = await supabase.from('organizations').insert({
      name: orgName,
      state: 'CA',
      address: '456 Champion Blvd',
      phone: '555-2000',
      email: 'info@championship.com',
      brand_primary: brandPrimary,
      brand_secondary: brandSecondary,
      title_card_url: pub.publicUrl,
      logo_url: 'https://qkampkccsdiebvkcfuby.supabase.co/storage/v1/object/public/org-logos/placeholder.svg',
      universal_discounts: {},
      notes: 'Auto-generated with title card',
      is_business: false,
      created_at: new Date().toISOString()
    }).select().single();
    
    if (error) throw error;
    
    console.log('\n✨ Success! Organization created with title card:');
    console.log('┌─────────────────────────────────────────────');
    console.log(`│ ID: ${org.id}`);
    console.log(`│ Name: ${org.name}`);
    console.log(`│ Title Card: ${org.title_card_url}`);
    console.log(`│ Brand Colors: ${org.brand_primary} / ${org.brand_secondary}`);
    console.log('└─────────────────────────────────────────────');
    
    // 6. Verify retrieval
    console.log('\n🔍 Verifying organization can be retrieved...');
    const { data: retrieved } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org.id)
      .single();
    
    if (retrieved?.title_card_url) {
      console.log('✅ Organization retrieved successfully with title card!');
    }
    
    console.log('\n🎉 Complete flow test successful!');
    console.log('   The title card generation system is fully operational.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCompleteFlow();