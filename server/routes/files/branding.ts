import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendOk, sendErr, HttpErrors } from '../../lib/http';
import { listBrandingFiles, signBrandingUploads, deleteBrandingFiles, getSignedFileUrl } from '../../lib/storage';
import { logSecurityEvent, createRequestLogger } from '../../lib/log';
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

// TODO: Implement proper role checking middleware
// For now, we'll simulate role checks with basic validation
async function requireOrgMember(req: express.Request, res: express.Response, next: express.NextFunction) {
  const orgId = req.params.id || req.params.orgId;
  
  if (!orgId) {
    return HttpErrors.badRequest(res, 'Organization ID is required');
  }
  
  // TODO: Implement proper JWT/session validation and org membership check
  // For now, we'll just validate that the org exists
  try {
    const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org.length) {
      return HttpErrors.notFound(res, 'Organization not found');
    }
    
    // Store org in request for later use
    (req as any).org = org[0];
    next();
  } catch (error) {
    console.error('Error checking organization:', error);
    return HttpErrors.internalError(res, 'Failed to validate organization');
  }
}

async function requireOrgAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const logger = createRequestLogger(req);
  
  // TODO: Implement proper role checking with has_role_slug
  // For now, we'll log security events and allow access
  logSecurityEvent(req, 'admin_access_attempt', { orgId: req.params.id });
  
  logger.warn('Admin role check not fully implemented - allowing access');
  next();
}

/**
 * GET /:id/branding-files - List branding files with signed URLs
 * Requires: Organization member access
 */
router.get('/:id/branding-files', requireOrgMember, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const files = await listBrandingFiles(orgId);
    
    logger.info({ fileCount: files.length }, 'Listed branding files');
    
    sendOk(res, {
      organization: (req as any).org,
      brandingFiles: files
    }, files.length);
  } catch (error) {
    logger.error({ error }, 'Failed to list branding files');
    return HttpErrors.internalError(res, 'Failed to list branding files');
  }
}));

/**
 * POST /:id/branding-files/sign - Generate signed upload URLs
 * Requires: Organization admin access
 */
router.post('/:id/branding-files/sign', requireOrgMember, requireOrgAdmin, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const requestData = SignRequestSchema.parse(req.body);
    
    const signedUrls = await signBrandingUploads(orgId, requestData);
    
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
router.delete('/:id/branding-files', requireOrgMember, requireOrgAdmin, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    // Validate request body
    const { names } = DeleteFilesSchema.parse(req.body);
    
    await deleteBrandingFiles(orgId, names);
    
    logger.info({ fileCount: names.length, fileNames: names }, 'Deleted branding files');
    
    // CR specifies DELETE should return pure success, no error object
    sendOk(res);
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
router.post('/:id/logo', requireOrgMember, requireOrgAdmin, asyncHandler(async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return HttpErrors.badRequest(res, 'Filename is required');
    }
    
    // Generate signed URL for the logo file
    const signedUrl = await getSignedFileUrl(orgId, filename);
    
    // Update organization logo_url
    await db.update(organizations)
      .set({ 
        logoUrl: signedUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(organizations.id, orgId));
    
    logger.info({ filename }, 'Updated organization logo');
    
    sendOk(res, { logoUrl: signedUrl });
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
    const signedUrl = await getSignedFileUrl(orgId, filename);
    
    // Update organization title_card_url
    await db.update(organizations)
      .set({ 
        titleCardUrl: signedUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(organizations.id, orgId));
    
    logger.info({ filename }, 'Updated organization title card');
    
    sendOk(res, { titleCardUrl: signedUrl });
  } catch (error) {
    logger.error({ error }, 'Failed to set organization title card');
    return HttpErrors.internalError(res, 'Failed to update organization title card');
  }
}));

export { router as brandingRouter };