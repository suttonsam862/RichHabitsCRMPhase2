import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabase';
import { sendOk, sendErr } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { createRequestLogger } from '../../lib/log';
import { AuthedRequest } from '../../middleware/auth';
import { MAX_FILE_SIZE, validateFileType } from '../../lib/unified-storage';

// Validation schemas
const PortfolioUploadSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Filename is required'),
  contentType: z.string().optional(),
  size: z.number().max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`).optional()
});

// Using unified file validation constants from unified-storage.ts

function safeName(name: string): string { 
  if (!name || name.includes('..') || name.startsWith('/') || name.includes('\\')) {
    throw new Error('Invalid filename: contains unsafe characters');
  }
  
  // Preserve file extension but sanitize the rest
  const parts = name.split('.');
  const extension = parts.length > 1 ? parts.pop() : 'bin';
  const basename = parts.join('.').replace(/[^a-zA-Z0-9._-]/g, '_') || 'portfolio';
  return `${basename}.${extension}`;
}

// Using unified validateFileType function from unified-storage.ts

const r = Router();

// Add authentication to portfolio routes - moved to individual routes to fix types

/**
 * POST /sign - Generate signed upload URL for portfolio files
 * Requires authentication but allows any authenticated user to upload to designers/prospects
 */
r.post('/sign', requireAuth, async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  
  try {
    // Validate request data
    const { email, name, contentType, size } = PortfolioUploadSchema.parse(req.body);
    
    // Additional security: validate file type using unified validation
    const fileValidation = validateFileType(name, contentType);
    if (!fileValidation.isValid) {
      logger.warn({ email, name, contentType, error: fileValidation.error }, 'Invalid portfolio file type');
      return sendErr(res, 'VALIDATION_ERROR', fileValidation.error, undefined, 400);
    }
    
    // Sanitize filename
    const sanitizedName = safeName(name);
    
    // Create storage key with user isolation
    const key = `designers/prospects/${email}/${sanitizedName}`;
    
    // Generate signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .createSignedUploadUrl(key, { 
        upsert: true 
      });
    
    if (error || !data?.signedUrl) {
      logger.error({ email, name, error }, 'Failed to create portfolio upload URL');
      return sendErr(res, 'STORAGE_ERROR', error?.message || 'Failed to create upload URL', undefined, 500);
    }
    
    logger.info({ 
      email, 
      originalName: name, 
      sanitizedName, 
      key, 
      userId: req.user?.id || 'unknown'
    }, 'Portfolio upload URL created');
    
    return sendOk(res, { 
      name: sanitizedName, 
      uploadUrl: data.signedUrl, 
      key,
      expiresIn: 3600 // 1 hour
    });
    
  } catch (error: any) {
    logger.error({ error }, 'Portfolio upload URL generation failed');
    
    if (error instanceof z.ZodError) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid request data', error.errors, 400);
    }
    
    return sendErr(res, 'INTERNAL_ERROR', error?.message || 'Upload URL generation failed', undefined, 500);
  }
});

/**
 * GET /list/:email - List portfolio files for a specific email (admin only)
 * This endpoint is useful for admins to review submitted portfolios
 */
r.get('/list/:email', requireAuth, async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const email = req.params.email;
  
  try {
    // Basic validation
    if (!email || !email.includes('@')) {
      return sendErr(res, 'VALIDATION_ERROR', 'Valid email is required', undefined, 400);
    }
    
    // Check if user has admin access or is requesting their own files
    const user = req.user;
    if (!user?.is_super_admin && user?.email !== email) {
      logger.warn({ requestedEmail: email, userEmail: user?.email }, 'Unauthorized portfolio access attempt');
      return sendErr(res, 'FORBIDDEN', 'Access denied', undefined, 403);
    }
    
    const folderPath = `designers/prospects/${email}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .list(folderPath, {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      throw error;
    }
    
    const files = (data || []).map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      updatedAt: file.updated_at || file.created_at,
      storageKey: `${folderPath}/${file.name}`
    }));
    
    logger.info({ email, fileCount: files.length, userId: user?.id }, 'Listed portfolio files');
    
    return sendOk(res, {
      email,
      files,
      totalCount: files.length
    });
    
  } catch (error: any) {
    logger.error({ error, email }, 'Failed to list portfolio files');
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to list portfolio files', undefined, 500);
  }
});

/**
 * DELETE /:email/:filename - Delete a portfolio file (admin only)
 */
r.delete('/:email/:filename', requireAuth, async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const email = req.params.email;
  const filename = req.params.filename;
  
  try {
    // Basic validation
    if (!email || !email.includes('@') || !filename) {
      return sendErr(res, 'VALIDATION_ERROR', 'Valid email and filename are required', undefined, 400);
    }
    
    // Check if user has admin access
    const user = req.user;
    if (!user?.is_super_admin) {
      logger.warn({ email, filename, userEmail: user?.email }, 'Unauthorized portfolio deletion attempt');
      return sendErr(res, 'FORBIDDEN', 'Admin access required', undefined, 403);
    }
    
    const sanitizedFilename = safeName(filename);
    const storageKey = `designers/prospects/${email}/${sanitizedFilename}`;
    
    const { error } = await supabaseAdmin.storage
      .from('app')
      .remove([storageKey]);
    
    if (error) {
      throw error;
    }
    
    logger.info({ email, filename, storageKey, userId: user?.id }, 'Portfolio file deleted');
    
    res.status(204).send();
    
  } catch (error: any) {
    logger.error({ error, email, filename }, 'Failed to delete portfolio file');
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete portfolio file', undefined, 500);
  }
});

export default r;