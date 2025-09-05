import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Initialize Supabase admin client for storage operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const STORAGE_BUCKET = 'app';

/**
 * Ensure the app bucket exists and is configured for public access
 */
export async function ensureAppBucketExists() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${STORAGE_BUCKET}`);
      const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        console.error(`Failed to create bucket: ${error.message}`);
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      console.log(`✅ Created bucket: ${STORAGE_BUCKET}`);
    } else {
      console.log(`✅ Bucket exists: ${STORAGE_BUCKET}`);
    }
  } catch (error) {
    console.error('Error ensuring app bucket exists:', error);
    throw error;
  }
}

export interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  if (!filename || filename.includes('..') || filename.startsWith('/') || filename.includes('\\')) {
    return `upload-${randomUUID()}.png`;
  }
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate storage key for organization asset
 */
function generateStorageKey(orgId: string, filename: string): string {
  const safeFilename = sanitizeFilename(filename);
  return `org/${orgId}/branding/${safeFilename}`;
}

/**
 * Convert storage key to full public URL
 */
function getPublicUrl(storageKey: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storageKey}`;
}

/**
 * Create signed upload URL for organization asset
 * Returns both the upload URL and the final public URL that will be accessible after upload
 */
export async function createAssetUploadUrl(orgId: string, filename: string): Promise<UploadUrlResponse> {
  // Ensure bucket exists before attempting upload
  await ensureAppBucketExists();
  
  const storageKey = generateStorageKey(orgId, filename);
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storageKey, { 
      upsert: true 
    });

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create upload URL: ${error?.message || 'Unknown error'}`);
  }

  const publicUrl = getPublicUrl(storageKey);

  return {
    uploadUrl: data.signedUrl,
    publicUrl,
    storageKey
  };
}

/**
 * Get signed download URL for existing asset
 * Used for serving private/protected assets
 */
export async function getAssetDownloadUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storageKey, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create download URL: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Delete organization asset
 */
export async function deleteAsset(storageKey: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storageKey]);

  if (error) {
    throw new Error(`Failed to delete asset: ${error.message}`);
  }
}

/**
 * List all assets for an organization
 */
export async function listOrgAssets(orgId: string): Promise<Array<{name: string, size: number, updatedAt: string}>> {
  const folderPath = `org/${orgId}/branding`;
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(folderPath, {
      limit: 100,
      offset: 0
    });

  if (error) {
    throw new Error(`Failed to list assets: ${error.message}`);
  }

  return (data || []).map(file => ({
    name: file.name,
    size: file.metadata?.size || 0,
    updatedAt: file.updated_at || file.created_at || new Date().toISOString()
  }));
}

/**
 * Convert old storage key to new public URL format
 * Used for migrating existing data
 */
export function migrateStorageKeyToUrl(storageKey: string): string {
  // If it's already a full URL, return as-is
  if (storageKey.startsWith('http')) {
    return storageKey;
  }
  
  // Convert storage key to public URL
  return getPublicUrl(storageKey);
}