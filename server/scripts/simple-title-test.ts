#!/usr/bin/env tsx
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

async function simpleTest() {
  console.log('🎨 Simple Title Card Test\n');
  
  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  console.log('✅ Environment variables OK\n');
  
  try {
    // Initialize clients
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test OpenAI connection
    console.log('📸 Generating test image with OpenAI...');
    const prompt = `Create a crisp title card for a sports team with a 2:1 aspect ratio.
Text: "Test Academy" in a bold, high-contrast wordmark.
Style: vibrant neon gradient strokes with subtle abstract stripes in the background, clean edges.
Color rules: Use #3B82F6 and #8B5CF6.
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

    console.log('✅ Image generated successfully');
    
    // Process with Sharp
    const fileBytes = Buffer.from(img.data[0].b64_json, 'base64');
    const processedBuffer = await sharp(fileBytes)
      .resize(1024, 512, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();
    
    console.log('✅ Image resized to 1024x512');
    
    // Test Supabase storage
    console.log('\n📦 Testing Supabase storage...');
    
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'org-tiles');
    
    if (!bucketExists) {
      console.log('Creating org-tiles bucket...');
      const { error: bucketError } = await supabase.storage.createBucket('org-tiles', { 
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      if (bucketError && !bucketError.message?.includes('already exists')) {
        throw bucketError;
      }
    }
    
    // Upload test image
    const testPath = `org-tiles/test-${Date.now()}/title.png`;
    const { error: uploadError } = await supabase.storage.from('org-tiles')
      .upload(testPath, processedBuffer, { 
        contentType: 'image/png', 
        upsert: true 
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    const { data: pub } = supabase.storage.from('org-tiles').getPublicUrl(testPath);
    console.log('✅ Image uploaded successfully');
    console.log('📍 Public URL:', pub.publicUrl);
    
    console.log('\n✨ All systems operational! Title card generation is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

simpleTest();