import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendNoContent, HttpErrors } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { createRequestLogger } from '../../lib/log';
import { MAX_FILE_SIZE, validateFileType } from '../../lib/unified-storage';

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

// Using unified file validation constants from unified-storage.ts

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

// Import the proper organization security middleware
import { requireOrgAdmin as secureRequireOrgAdmin, requireOrgReadonly as secureRequireOrgReadonly } from '../../middleware/orgSecurity';

// Use the secure middleware functions (these are factory functions that need to be invoked)
const requireOrgMember = secureRequireOrgReadonly();
const requireOrgAdmin = secureRequireOrgAdmin();

/**
 * GET /:id/branding-files - List branding files
 * Requires: Organization member access
 */
router.get('/:id/branding-files', requireAuth, requireOrgMember, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Use admin client for consistent security - user authentication already verified by middleware
    const { data, error } = await supabaseAdmin.storage
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
      updatedAt: f.updated_at || f.created_at,
      storageKey: `org/${orgId}/branding/${f.name}`
    }));
    
    logger.info({ fileCount: files.length, orgId }, 'Listed branding files securely');
    sendOk(res, files);
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to list branding files');
    return HttpErrors.internalError(res, 'Failed to list branding files');
  }
}));

/**
 * POST /:id/branding-files/sign - Generate signed upload URLs
 * Requires: Organization admin access
 */
router.post('/:id/branding-files/sign', requireAuth, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const requestData = SignRequestSchema.parse(req.body);
    
    // Validate files using unified validation
    for (const file of requestData.files) {
      // Use centralized file validation
      const fileValidation = validateFileType(file.name);
      if (!fileValidation.isValid) {
        return HttpErrors.validationError(res, fileValidation.error);
      }
      
      if (file.size && file.size > MAX_FILE_SIZE) {
        return HttpErrors.validationError(res, 
          `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }
    }
    
    // Use admin client for security - ensures proper organization boundary checks
    const signedUrls = [];
    
    for (const file of requestData.files) {
      const sanitizedName = safeName(file.name);
      const key = `org/${orgId}/branding/${sanitizedName}`;
      
      const { data, error } = await supabaseAdmin.storage
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
    
    logger.info({ fileCount: requestData.files.length, orgId }, 'Generated secure signed upload URLs');
    
    sendOk(res, signedUrls);
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to generate signed upload URLs');
    
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
router.delete('/:id/branding-files', requireAuth, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const { names } = DeleteFilesSchema.parse(req.body);
    
    // Sanitize and prepare file paths with organization validation
    const keys = names.map(name => {
      const sanitizedName = safeName(name);
      return `org/${orgId}/branding/${sanitizedName}`;
    });
    
    // Validate all keys belong to this organization before deletion
    for (const key of keys) {
      if (!key.startsWith(`org/${orgId}/`)) {
        logger.warn({ orgId, invalidKey: key }, 'Attempted to delete file outside organization scope');
        return HttpErrors.validationError(res, 'Invalid file path - must belong to organization');
      }
    }
    
    // Use admin client for deletion with enhanced security
    const { error } = await supabaseAdmin.storage
      .from('app')
      .remove(keys);
    
    if (error) {
      throw error;
    }
    
    logger.info({ fileCount: names.length, fileNames: names, orgId }, 'Deleted branding files securely');
    sendNoContent(res);
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to delete branding files');
    
    if (error instanceof z.ZodError) {
      return HttpErrors.validationError(res, 'Invalid request data', error.errors);
    }
    
    return HttpErrors.internalError(res, 'Failed to delete branding files');
  }
}));

/**
 * POST /:id/logo - Set logo storage path (NOT creating signed URLs)
 * Requires: Organization admin access  
 * This endpoint stores the permanent storage path, not temporary signed URLs
 */
router.post('/:id/logo', requireAuth, requireOrgAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { storagePath } = req.body;
    
    if (!storagePath) {
      return HttpErrors.badRequest(res, 'Storage path is required');
    }
    
    // Validate the storage path belongs to this organization
    if (!storagePath.startsWith(`org/${orgId}/`)) {
      logger.warn({ orgId, storagePath }, 'Attempted to set logo path outside organization scope');
      return HttpErrors.validationError(res, 'Storage path must belong to this organization');
    }
    
    // Store the permanent storage path using Supabase admin client
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ 
        logo_url: storagePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);
    
    if (updateError) {
      throw updateError;
    }
    
    logger.info({ storagePath, orgId }, 'Updated organization logo with validated storage path');
    
    sendOk(res, { logo_url: storagePath });
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to set organization logo');
    return HttpErrors.internalError(res, 'Failed to update organization logo');
  }
}));

/**
 * POST /:id/title-card - Set title card storage path (NOT creating signed URLs)
 * Requires: Organization admin access
 * This endpoint stores the permanent storage path, not temporary signed URLs
 */
router.post('/:id/title-card', requireAuth, requireOrgAdmin, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { storagePath } = req.body;
    
    if (!storagePath) {
      return HttpErrors.badRequest(res, 'Storage path is required');
    }
    
    // Validate the storage path belongs to this organization
    if (!storagePath.startsWith(`org/${orgId}/`)) {
      logger.warn({ orgId, storagePath }, 'Attempted to set title card path outside organization scope');
      return HttpErrors.validationError(res, 'Storage path must belong to this organization');
    }
    
    // Store the permanent storage path using Supabase admin client
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ 
        title_card_url: storagePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);
    
    if (updateError) {
      throw updateError;
    }
    
    logger.info({ storagePath, orgId }, 'Updated organization title card with validated storage path');
    
    sendOk(res, { title_card_url: storagePath });
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to set organization title card');
    return HttpErrors.internalError(res, 'Failed to update organization title card');
  }
}));

export { router as brandingRouter };