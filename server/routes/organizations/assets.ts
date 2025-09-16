import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireOrgReadonly, requireOrgAdmin } from '../../middleware/orgSecurity';
import { createAssetUploadUrl, getAssetDownloadUrl, deleteAsset, listOrgAssets, migrateStorageKeyToUrl } from '../../lib/unified-storage.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { createRequestLogger } from '../../lib/log.js';

const router = Router();

// Validation schemas
const UploadRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().optional()
});

const UpdateLogoSchema = z.object({
  logoUrl: z.string().url('Must be a valid URL')
});

/**
 * POST /organizations/:id/assets/upload
 * Unified asset upload endpoint
 */
router.post('/:id/assets/upload', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { filename } = UploadRequestSchema.parse(req.body);
    
    logger.info({ orgId, filename }, 'Creating asset upload URL');
    
    const uploadResponse = await createAssetUploadUrl(orgId, filename);
    
    logger.info({ orgId, publicUrl: uploadResponse.publicUrl }, 'Asset upload URL created');
    
    res.json({
      success: true,
      uploadUrl: uploadResponse.uploadUrl,
      publicUrl: uploadResponse.publicUrl,
      storageKey: uploadResponse.storageKey
    });
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to create asset upload URL');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create upload URL',
      message: error.message
    });
  }
});

/**
 * GET /organizations/:id/assets/:filename
 * Serve organization assets with proper fallbacks
 */
router.get('/:id/assets/:filename', requireAuth, requireOrgReadonly(), async (req, res) => {
  const orgId = req.params.id;
  const filename = req.params.filename;
  const storageKey = `org/${orgId}/branding/${filename}`;
  
  try {
    // Try to get signed URL for the asset
    const signedUrl = await getAssetDownloadUrl(storageKey);
    
    // Redirect to the signed URL
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.redirect(signedUrl);
    
  } catch (error) {
    // Asset not found, return 404
    res.status(404).json({
      error: 'Asset not found',
      message: `Asset ${filename} not found for organization ${orgId}`
    });
  }
});

/**
 * GET /organizations/:id/assets
 * List all assets for an organization
 */
router.get('/:id/assets', requireAuth, requireOrgReadonly(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const assets = await listOrgAssets(orgId);
    
    logger.info({ orgId, assetCount: assets.length }, 'Listed organization assets');
    
    res.json({
      success: true,
      assets
    });
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to list assets');
    
    res.status(500).json({
      success: false,
      error: 'Failed to list assets',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id/assets/:filename
 * Delete an organization asset
 */
router.delete('/:id/assets/:filename', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  const filename = req.params.filename;
  const storageKey = `org/${orgId}/branding/${filename}`;
  
  try {
    await deleteAsset(storageKey);
    
    logger.info({ orgId, filename }, 'Asset deleted');
    
    res.status(204).send();
    
  } catch (error: any) {
    logger.error({ error, orgId, filename }, 'Failed to delete asset');
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete asset',
      message: error.message
    });
  }
});

/**
 * POST /organizations/:id/logo/update
 * Update organization logo URL in database
 * This replaces the old "apply" endpoints
 */
router.post('/:id/logo/update', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { logoUrl } = UpdateLogoSchema.parse(req.body);
    
    // Update organization with new logo URL
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ logo_url: logoUrl })
      .eq('id', orgId)
      .select('id, name, logo_url')
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    logger.info({ orgId, logoUrl }, 'Organization logo updated');
    
    res.json({
      success: true,
      organization: data
    });
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to update organization logo');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update logo',
      message: error.message
    });
  }
});

/**
 * GET /organizations/:id/logo
 * Serve organization logo with robust fallbacks
 */
router.get('/:id/logo', requireAuth, requireOrgReadonly(), async (req, res) => {
  const orgId = req.params.id;
  const CACHE_TTL = 300; // 5 minutes
  
  // Set consistent CORS headers for asset serving
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return servePlaceholder(res, '?', CACHE_TTL);
    }
    
    // Get organization data
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('logo_url, name')
      .eq('id', orgId)
      .single();
    
    if (error || !org) {
      return servePlaceholder(res, '?', CACHE_TTL);
    }
    
    // No logo URL set
    if (!org.logo_url) {
      const firstLetter = org.name?.charAt(0).toUpperCase() || 'O';
      return servePlaceholder(res, firstLetter, CACHE_TTL);
    }
    
    // If it's already a full URL, redirect directly
    if (org.logo_url.startsWith('http')) {
      res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL}`);
      return res.redirect(org.logo_url);
    }
    
    // Convert old storage key to public URL and update database
    const publicUrl = migrateStorageKeyToUrl(org.logo_url);
    
    // Async update in background (don't wait for it)
    (async () => {
      try {
        await supabaseAdmin
          .from('organizations')
          .update({ logo_url: publicUrl })
          .eq('id', orgId);
        console.log(`Migrated logo URL for org ${orgId}`);
      } catch (error) {
        console.error('Failed to migrate logo URL:', error);
      }
    })();
    
    res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL}`);
    return res.redirect(publicUrl);
    
  } catch (error) {
    console.error('Error serving logo:', error);
    return servePlaceholder(res, 'L', CACHE_TTL);
  }
});

/**
 * Helper function to serve SVG placeholder with consistent CORS headers
 */
function servePlaceholder(res: any, letter: string, maxAge: number) {
  // Ensure CORS headers are set for placeholder too
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  
  const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#1a1a2e"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="96" fill="#6EE7F9">${letter}</text>
  </svg>`;
  
  console.log(`📸 Serving placeholder SVG for letter: ${letter}`);
  return res.send(svg);
}

export default router;