import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Storage operations disabled: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = supabaseUrl && supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) : null;

const STORAGE_BUCKET = 'app';

// Validation schemas
const FileSchema = z.object({
  name: z.string().min(1),
  size: z.number().optional()
});

const SignRequestSchema = z.object({
  files: z.array(FileSchema),
  ttlSeconds: z.number().min(60).max(3600).default(600) // 10 minutes default
});

export interface BrandingFile {
  id: string;
  name: string;
  updatedAt: string;
  size: number;
  signedUrl: string;
}

export interface SignedUrlResponse {
  name: string;
  uploadUrl: string;
  accessUrl: string;
  expiresAt: string;
}

/**
 * Validate organization ID and sanitize path
 */
function validateOrgPath(orgId: string): string {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orgId)) {
    throw new Error('Invalid organization ID format');
  }
  
  return `org/${orgId}/branding`;
}

/**
 * Validate and sanitize filename
 */
function validateFileName(fileName: string): string {
  // Block path traversal attempts
  if (fileName.includes('../') || fileName.includes('..\\') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid filename: path traversal detected');
  }
  
  // Basic length and character validation
  if (fileName.length > 255 || fileName.length < 1) {
    throw new Error('Invalid filename length');
  }
  
  // Allow only safe characters: alphanumeric, dots, hyphens, underscores, spaces
  const safeCharRegex = /^[a-zA-Z0-9.\-_ ]+$/;
  if (!safeCharRegex.test(fileName)) {
    throw new Error('Invalid filename characters');
  }
  
  return fileName;
}

/**
 * List branding files for an organization
 */
export async function listBrandingFiles(orgId: string): Promise<BrandingFile[]> {
  if (!supabase) {
    console.warn('Storage client not available, returning empty list');
    return [];
  }
  
  try {
    const path = validateOrgPath(orgId);
    
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(path, {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Error listing branding files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
    
    if (!files) {
      return [];
    }
    
    // Generate signed URLs for each file
    const filesWithUrls: BrandingFile[] = [];
    
    for (const file of files) {
      try {
        const filePath = `${path}/${file.name}`;
        const { data: signedUrl } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(filePath, 600); // 10 minutes
          
        if (signedUrl) {
          filesWithUrls.push({
            id: file.id || file.name,
            name: file.name,
            updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
            size: file.metadata?.size || 0,
            signedUrl: signedUrl.signedUrl
          });
        }
      } catch (urlError) {
        console.warn(`Failed to generate signed URL for ${file.name}:`, urlError);
        // Include file without signed URL
        filesWithUrls.push({
          id: file.id || file.name,
          name: file.name,
          updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
          size: file.metadata?.size || 0,
          signedUrl: ''
        });
      }
    }
    
    return filesWithUrls;
  } catch (error) {
    console.error('Error in listBrandingFiles:', error);
    throw error;
  }
}

/**
 * Generate signed URLs for uploading files
 */
export async function signBrandingUploads(orgId: string, requestData: unknown): Promise<SignedUrlResponse[]> {
  if (!supabase) {
    throw new Error('Storage client not available');
  }
  
  try {
    // Validate request data
    const { files, ttlSeconds } = SignRequestSchema.parse(requestData);
    const path = validateOrgPath(orgId);
    
    const signedUrls: SignedUrlResponse[] = [];
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    for (const file of files) {
      const fileName = validateFileName(file.name);
      const filePath = `${path}/${fileName}`;
      
      // Generate signed upload URL
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(filePath);
        
      if (uploadError) {
        console.error(`Error creating signed upload URL for ${fileName}:`, uploadError);
        throw new Error(`Failed to create upload URL for ${fileName}: ${uploadError.message}`);
      }
      
      // Generate signed access URL  
      const { data: accessData, error: accessError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, ttlSeconds);
        
      if (accessError) {
        console.error(`Error creating signed access URL for ${fileName}:`, accessError);
        throw new Error(`Failed to create access URL for ${fileName}: ${accessError.message}`);
      }
      
      signedUrls.push({
        name: fileName,
        uploadUrl: uploadData.signedUrl,
        accessUrl: accessData.signedUrl,
        expiresAt
      });
    }
    
    return signedUrls;
  } catch (error) {
    console.error('Error in signBrandingUploads:', error);
    throw error;
  }
}

/**
 * Delete branding files
 */
export async function deleteBrandingFiles(orgId: string, fileNames: string[]): Promise<void> {
  if (!supabase) {
    throw new Error('Storage client not available');
  }
  
  try {
    const path = validateOrgPath(orgId);
    
    const filePaths = fileNames.map(name => {
      const fileName = validateFileName(name);
      return `${path}/${fileName}`;
    });
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths);
      
    if (error) {
      console.error('Error deleting branding files:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error in deleteBrandingFiles:', error);
    throw error;
  }
}

/**
 * Generate signed URL for logo/title-card access
 */
export async function getSignedFileUrl(orgId: string, fileName: string, ttlSeconds: number = 600): Promise<string> {
  if (!supabase) {
    throw new Error('Storage client not available');
  }
  
  try {
    const path = validateOrgPath(orgId);
    const validatedFileName = validateFileName(fileName);
    const filePath = `${path}/${validatedFileName}`;
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, ttlSeconds);
      
    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedFileUrl:', error);
    throw error;
  }
}