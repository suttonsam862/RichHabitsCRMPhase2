import OpenAI from 'openai';
import { sb } from './supabaseAdmin';
import sharp from 'sharp';

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTitleCard({
  orgId, teamName, logoUrl, brandPrimaryHex, brandSecondaryHex
}: {
  orgId: string; 
  teamName: string; 
  logoUrl: string;
  brandPrimaryHex: string; 
  brandSecondaryHex: string;
}): Promise<string> {
  try {
    // Build prompt — neon/ink "design tile" vibe, but text legible.
    const paletteHint = `${brandPrimaryHex}, ${brandSecondaryHex}`;
    const prompt = `Create a crisp title card for a sports team with a 2:1 aspect ratio.
Text: "${teamName}" in a bold, high-contrast wordmark (single font style).
Style: vibrant neon gradient strokes with subtle abstract stripes in the background (no logos), clean edges, not noisy.
Color rules:
- Use ${paletteHint} plus hues sampled from the team logo.
- Background should harmonize with ${brandPrimaryHex}; stroke accents may use ${brandSecondaryHex}.
Composition:
- Centered wordmark, strong contrast against background, readable at small size.
- No real-world photos, no brand marks, no IP; pure graphic.

Return just the rendered graphic.`;

    console.log('🎨 Generating title card for:', teamName);
    console.log('🎨 Using colors:', paletteHint);

    const img = await openai.images.generate({
      model: 'dall-e-2',
      prompt,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json'
    });

    if (!img.data || !img.data[0]) {
      throw new Error('No image data received from OpenAI');
    }

    const b64 = img.data[0].b64_json;
    if (!b64) {
      throw new Error('No base64 data received from OpenAI');
    }

    const fileBytes = Buffer.from(b64, 'base64');

    // Resize to 1024x512 using sharp
    const processedBuffer = await sharp(fileBytes)
      .resize(1024, 512, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();

    // First ensure the bucket exists
    const { data: buckets } = await sb.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'org-tiles');
    
    if (!bucketExists) {
      console.log('📁 Creating org-tiles bucket...');
      const { error: bucketError } = await sb.storage.createBucket('org-tiles', { 
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      if (bucketError && !bucketError.message?.includes('already exists')) {
        throw bucketError;
      }
    }

    const path = `org-tiles/${orgId}/title.png`;
    
    // Try to upload with upsert: false (immutable on create)
    const { error } = await sb.storage.from('org-tiles')
      .upload(path, processedBuffer, { 
        contentType: 'image/png', 
        upsert: false 
      });

    if (error) {
      // If file already exists, just return the existing URL
      if (error.message?.includes('already exists')) {
        console.log('ℹ️ Title card already exists for org:', orgId);
        const { data: pub } = sb.storage.from('org-tiles').getPublicUrl(path);
        return pub.publicUrl;
      }
      throw error;
    }

    const { data: pub } = sb.storage.from('org-tiles').getPublicUrl(path);
    console.log('✅ Title card generated successfully:', pub.publicUrl);
    return pub.publicUrl;
  } catch (error) {
    console.error('❌ Error generating title card:', error);
    throw error;
  }
}

export async function replaceTitleCard({
  orgId, teamName, logoUrl, brandPrimaryHex, brandSecondaryHex
}: {
  orgId: string; 
  teamName: string; 
  logoUrl: string;
  brandPrimaryHex: string; 
  brandSecondaryHex: string;
}): Promise<string> {
  try {
    // Build prompt — neon/ink "design tile" vibe, but text legible.
    const paletteHint = `${brandPrimaryHex}, ${brandSecondaryHex}`;
    const prompt = `Create a crisp title card for a sports team with a 2:1 aspect ratio.
Text: "${teamName}" in a bold, high-contrast wordmark (single font style).
Style: vibrant neon gradient strokes with subtle abstract stripes in the background (no logos), clean edges, not noisy.
Color rules:
- Use ${paletteHint} plus hues sampled from the team logo.
- Background should harmonize with ${brandPrimaryHex}; stroke accents may use ${brandSecondaryHex}.
Composition:
- Centered wordmark, strong contrast against background, readable at small size.
- No real-world photos, no brand marks, no IP; pure graphic.

Return just the rendered graphic.`;

    console.log('🎨 Regenerating title card for:', teamName);
    console.log('🎨 Using colors:', paletteHint);

    const img = await openai.images.generate({
      model: 'dall-e-2',
      prompt,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json'
    });

    if (!img.data || !img.data[0]) {
      throw new Error('No image data received from OpenAI');
    }

    const b64 = img.data[0].b64_json;
    if (!b64) {
      throw new Error('No base64 data received from OpenAI');
    }

    const fileBytes = Buffer.from(b64, 'base64');

    // Resize to 1024x512 using sharp
    const processedBuffer = await sharp(fileBytes)
      .resize(1024, 512, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();

    const path = `org-tiles/${orgId}/title.png`;
    
    // Upload with upsert: true to replace existing
    const { error } = await sb.storage.from('org-tiles')
      .upload(path, processedBuffer, { 
        contentType: 'image/png', 
        upsert: true 
      });

    if (error) {
      throw error;
    }

    const { data: pub } = sb.storage.from('org-tiles').getPublicUrl(path);
    console.log('✅ Title card replaced successfully:', pub.publicUrl);
    return pub.publicUrl;
  } catch (error) {
    console.error('❌ Error replacing title card:', error);
    throw error;
  }
}