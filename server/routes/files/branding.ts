import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendErr, sendNoContent, HttpErrors } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { supabaseForUser, supabaseAdmin } from '../../lib/supabase';
import { logSecurityEvent, logDatabaseOperation, createRequestLogger } from '../../lib/log';
import { db } from '../../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Validation schemas
const SignRequestSchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1),
    size: z.number().optional()
  })),
  ttlSeconds: z.number().min(60).max(3600).optional()
});

const DeleteFilesSchema = z.object({
  names: z.array(z.string().min(1))
});

// Allowed MIME types for branding files
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg', 
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Sanitize filename to prevent path traversal
 */
function safeName(name: string): string {
  if (name.includes('..') || name.startsWith('/') || name.includes('\\')) {
    throw new Error('Invalid filename');
  }
  // Replace unsafe characters but keep extensions
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// All branding routes require authentication
router.use(requireAuth);

// Middleware to verify org membership
async function requireOrgMember(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const orgId = req.params.id || req.params.orgId;
  
  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }
  
  try {
    const org = await db.select({
      id: organizations.id,
      name: organizations.name,
      status: organizations.status
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org.length) {
      return HttpErrors.notFound(res, 'Organization not found');
    }
    
    // TODO: Check if user is member of org
    // For now, allow if authenticated
    (req as any).org = org[0];
    next();
  } catch (error) {
    console.error('Error checking organization:', error);
    return HttpErrors.internalError(res, 'Failed to validate organization');
  }
}

async function requireOrgAdmin(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const logger = createRequestLogger(req);
  
  // TODO: Implement proper role checking with has_role_slug
  // For now, we'll log security events and allow access
  logSecurityEvent(req, 'admin_access_attempt', { orgId: req.params.id });
  
  logger.warn('Admin role check not fully implemented - allowing access');
  next();
}

/**
 * GET /:id/branding-files - List branding files
 * Requires: Organization member access
 */
router.get('/:id/branding-files', requireOrgMember, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const sb = supabaseForUser(req.headers.authorization?.slice(7));
    
    const { data, error } = await sb.storage
      .from('app')
      .list(`org/${orgId}/branding`, {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      throw error;
    }
    
    const files = (data || []).map(f => ({
      name: f.name,
      size: f.metadata?.size || 0,
      contentType: f.metadata?.mimetype || 'application/octet-stream',
      updatedAt: f.updated_at || f.created_at
    }));
    
    logger.info({ fileCount: files.length }, 'Listed branding files');
    sendOk(res, files);
  } catch (error: any) {
    logger.error({ error }, 'Failed to list branding files');
    return HttpErrors.internalError(res, 'Failed to list branding files');
  }
}));

/**
 * POST /:id/branding-files/sign - Generate signed upload URLs
 * Requires: Organization admin access
 */
router.post('/:id/branding-files/sign', requireOrgMember, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const requestData = SignRequestSchema.parse(req.body);
    
    // Validate MIME types and sizes
    for (const file of requestData.files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf'
      };
      
      const contentType = mimeMap[ext || ''];
      if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
        return HttpErrors.validationError(res, 
          `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }
      
      if (file.size && file.size > MAX_FILE_SIZE) {
        return HttpErrors.validationError(res, 
          `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }
    }
    
    const sb = supabaseForUser(req.headers.authorization?.slice(7));
    const signedUrls = [];
    
    for (const file of requestData.files) {
      const sanitizedName = safeName(file.name);
      const key = `org/${orgId}/branding/${sanitizedName}`;
      
      const { data, error } = await sb.storage
        .from('app')
        .createSignedUploadUrl(key, {
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      signedUrls.push({
        name: sanitizedName,
        uploadUrl: data?.signedUrl,
        accessPath: key
      });
    }
    
    logger.info({ fileCount: requestData.files.length }, 'Generated signed upload URLs');
    
    sendOk(res, signedUrls);
  } catch (error) {
    logger.error({ error }, 'Failed to generate signed upload URLs');
    
    if (error instanceof z.ZodError) {
      return HttpErrors.validationError(res, 'Invalid request data', error.errors);
    }
    
    return HttpErrors.internalError(res, 'Failed to generate signed upload URLs');
  }
}));

/**
 * DELETE /:id/branding-files - Delete branding files
 * Requires: Organization admin access
 */
router.delete('/:id/branding-files', requireOrgMember, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const { names } = DeleteFilesSchema.parse(req.body);
    
    // Sanitize and prepare file paths
    const keys = names.map(name => `org/${orgId}/branding/${safeName(name)}`);
    
    // Use admin client for deletion to ensure proper permissions
    const { error } = await supabaseAdmin.storage
      .from('app')
      .remove(keys);
    
    if (error) {
      throw error;
    }
    
    logger.info({ fileCount: names.length, fileNames: names }, 'Deleted branding files');
    sendNoContent(res);
  } catch (error) {
    logger.error({ error }, 'Failed to delete branding files');
    
    if (error instanceof z.ZodError) {
      return HttpErrors.validationError(res, 'Invalid request data', error.errors);
    }
    
    return HttpErrors.internalError(res, 'Failed to delete branding files');
  }
}));

/**
 * POST /:id/logo - Upload or set logo URL
 * Requires: Organization admin access  
 */
router.post('/:id/logo', requireOrgMember, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return HttpErrors.badRequest(res, 'Filename is required');
    }
    
    // Generate signed URL for the logo file
    const logoPath = `org/${orgId}/branding/${filename}`;
    const { data: urlData } = await supabaseAdmin.storage
      .from('app')
      .createSignedUrl(logoPath, 3600);
    const signedUrl = urlData?.signedUrl;
    
    // Update organization logo_url
    await db.update(organizations)
      .set({ 
        logo_url: signedUrl,
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId));
    
    logger.info({ filename }, 'Updated organization logo');
    
    sendOk(res, { logo_url: signedUrl });
  } catch (error) {
    logger.error({ error }, 'Failed to set organization logo');
    return HttpErrors.internalError(res, 'Failed to update organization logo');
  }
}));

/**
 * POST /:id/title-card - Upload or set title card URL  
 * Requires: Organization admin access
 */
router.post('/:id/title-card', requireOrgMember, requireOrgAdmin, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return HttpErrors.badRequest(res, 'Filename is required');
    }
    
    // Generate signed URL for the title card file
    const cardPath = `org/${orgId}/branding/${filename}`;
    const { data: urlData } = await supabaseAdmin.storage
      .from('app')
      .createSignedUrl(cardPath, 3600);
    const signedUrl = urlData?.signedUrl;
    
    // Update organization title_card_url
    await db.update(organizations)
      .set({ 
        title_card_url: signedUrl,
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId));
    
    logger.info({ filename }, 'Updated organization title card');
    
    sendOk(res, { title_card_url: signedUrl });
  } catch (error) {
    logger.error({ error }, 'Failed to set organization title card');
    return HttpErrors.internalError(res, 'Failed to update organization title card');
  }
}));

export { router as brandingRouter };