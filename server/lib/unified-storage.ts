import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

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

// UNIFIED FILE VALIDATION CONSTANTS - Used across all storage operations
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB unified limit
export const SIGNED_URL_EXPIRES_IN = 3600; // 1 hour

// File extension to MIME type mapping for validation
export const FILE_EXTENSION_TO_MIME: Record<string, string[]> = {
  'png': ['image/png'],
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  'svg': ['image/svg+xml'],
  'pdf': ['application/pdf']
};

// Validation schemas
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type),
    `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`
  ),
  size: z.number().max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
});

export const BatchFileUploadSchema = z.object({
  files: z.array(FileUploadSchema).min(1, 'At least one file is required').max(10, 'Maximum 10 files allowed'),
  folder: z.enum(['branding', 'documents', 'portfolio']).optional().default('branding')
});

/**
 * Ensure the app bucket exists and is configured for private access with signed URLs only
 */
export async function ensureAppBucketExists() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log(`Creating private bucket: ${STORAGE_BUCKET}`);
      const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: false, // SECURITY FIX: Bucket must be private
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'],
        fileSizeLimit: MAX_FILE_SIZE, // Use consistent 10MB limit
      });
      
      if (error) {
        console.error(`Failed to create bucket: ${error.message}`);
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      console.log(`✅ Created private bucket: ${STORAGE_BUCKET}`);
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
  storageKey: string;
  // publicUrl removed for security - all access must go through signed URLs
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  if (!filename || filename.includes('..') || filename.startsWith('/') || filename.includes('\\')) {
    return `upload-${randomUUID()}.png`;
  }
  // Preserve the file extension but sanitize the rest
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop() : 'bin';
  const basename = parts.join('.').replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';
  return `${basename}.${extension}`;
}

/**
 * Unified file type validation by extension and content type
 * Uses centralized constants for consistency across the application
 */
export function validateFileType(filename: string, contentType?: string): { isValid: boolean; error?: string } {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Check extension using unified mapping
  const allowedExtensions = Object.keys(FILE_EXTENSION_TO_MIME);
  if (!ext || !allowedExtensions.includes(ext)) {
    return { isValid: false, error: `File extension '${ext}' not allowed. Allowed: ${allowedExtensions.join(', ')}` };
  }
  
  // Check content type if provided
  if (contentType) {
    const allowedMimes = FILE_EXTENSION_TO_MIME[ext] || [];
    if (!allowedMimes.includes(contentType)) {
      return { isValid: false, error: `Content type '${contentType}' doesn't match extension '${ext}'` };
    }
  }
  
  return { isValid: true };
}

/**
 * Generate storage key for organization asset
 */
function generateStorageKey(orgId: string, filename: string, folder: string = 'branding'): string {
  const safeFilename = sanitizeFilename(filename);
  const allowedFolders = ['branding', 'documents', 'portfolio'];
  const safeFolder = allowedFolders.includes(folder) ? folder : 'branding';
  return `org/${orgId}/${safeFolder}/${safeFilename}`;
}

/**
 * Convert storage key to full public URL (deprecated - use signed URLs instead)
 * Only used for legacy migration purposes
 */
function getPublicUrl(storageKey: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storageKey}`;
}

/**
 * Create signed upload URL for organization asset with security validation
 * Returns only the upload URL and storage key - no public URLs for security
 */
export async function createAssetUploadUrl(
  orgId: string, 
  filename: string, 
  contentType?: string,
  folder: string = 'branding'
): Promise<UploadUrlResponse> {
  // Validate file type first
  const fileValidation = validateFileType(filename, contentType);
  if (!fileValidation.isValid) {
    throw new Error(fileValidation.error);
  }
  
  // Ensure bucket exists before attempting upload
  await ensureAppBucketExists();
  
  const storageKey = generateStorageKey(orgId, filename, folder);
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storageKey, { 
      upsert: true 
    });

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create upload URL: ${error?.message || 'Unknown error'}`);
  }

  return {
    uploadUrl: data.signedUrl,
    storageKey
    // publicUrl removed for security - use getAssetDownloadUrl for access
  };
}

/**
 * Create multiple signed upload URLs with validation
 */
export async function createBatchAssetUploadUrls(
  orgId: string,
  files: Array<{ filename: string; contentType?: string; size?: number }>,
  folder: string = 'branding'
): Promise<Array<UploadUrlResponse & { originalFilename: string }>> {
  // Validate all files first
  for (const file of files) {
    const fileValidation = validateFileType(file.filename, file.contentType);
    if (!fileValidation.isValid) {
      throw new Error(`File ${file.filename}: ${fileValidation.error}`);
    }
    
    if (file.size && file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.filename} exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }
  
  // Ensure bucket exists
  await ensureAppBucketExists();
  
  const results: Array<UploadUrlResponse & { originalFilename: string }> = [];
  
  for (const file of files) {
    const storageKey = generateStorageKey(orgId, file.filename, folder);
    
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storageKey, { 
        upsert: true 
      });

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create upload URL for ${file.filename}: ${error?.message || 'Unknown error'}`);
    }

    results.push({
      uploadUrl: data.signedUrl,
      storageKey,
      originalFilename: file.filename
      // publicUrl removed for security - use getAssetDownloadUrl for access
    });
  }
  
  return results;
}

/**
 * Get signed download URL for existing asset
 * Used for serving private/protected assets with time limits
 */
export async function getAssetDownloadUrl(
  storageKey: string, 
  expiresIn: number = SIGNED_URL_EXPIRES_IN,
  orgId?: string
): Promise<string> {
  // Optional: Validate that the storage key belongs to the specified org
  if (orgId && !storageKey.startsWith(`org/${orgId}/`)) {
    throw new Error('Storage key does not belong to the specified organization');
  }
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storageKey, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create download URL: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Delete organization asset with security validation
 */
export async function deleteAsset(storageKey: string, orgId?: string): Promise<void> {
  // Optional: Validate that the storage key belongs to the specified org
  if (orgId && !storageKey.startsWith(`org/${orgId}/`)) {
    throw new Error('Storage key does not belong to the specified organization');
  }
  
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storageKey]);

  if (error) {
    throw new Error(`Failed to delete asset: ${error.message}`);
  }
}

/**
 * Delete multiple organization assets with validation
 */
export async function deleteBatchAssets(storageKeys: string[], orgId?: string): Promise<void> {
  // Validate all storage keys belong to the organization if specified
  if (orgId) {
    for (const key of storageKeys) {
      if (!key.startsWith(`org/${orgId}/`)) {
        throw new Error(`Storage key ${key} does not belong to the specified organization`);
      }
    }
  }
  
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove(storageKeys);

  if (error) {
    throw new Error(`Failed to delete assets: ${error.message}`);
  }
}

/**
 * List all assets for an organization in a specific folder
 */
export async function listOrgAssets(
  orgId: string, 
  folder: string = 'branding'
): Promise<Array<{name: string, size: number, updatedAt: string, folder: string, storageKey: string}>> {
  const allowedFolders = ['branding', 'documents', 'portfolio'];
  const safeFolder = allowedFolders.includes(folder) ? folder : 'branding';
  const folderPath = `org/${orgId}/${safeFolder}`;
  
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
    updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
    folder: safeFolder,
    storageKey: `${folderPath}/${file.name}`
  }));
}

/**
 * List all assets across all folders for an organization
 */
export async function listAllOrgAssets(orgId: string): Promise<Array<{name: string, size: number, updatedAt: string, folder: string, storageKey: string}>> {
  const folders = ['branding', 'documents', 'portfolio'];
  const allAssets: Array<{name: string, size: number, updatedAt: string, folder: string, storageKey: string}> = [];
  
  for (const folder of folders) {
    try {
      const assets = await listOrgAssets(orgId, folder);
      allAssets.push(...assets);
    } catch (error) {
      // Continue with other folders if one fails
      console.warn(`Failed to list assets in folder ${folder} for org ${orgId}:`, error);
    }
  }
  
  return allAssets;
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