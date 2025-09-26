import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireOrgReadonly, requireOrgAdmin } from '../../middleware/orgSecurity';
import { 
  createAssetUploadUrl, 
  createBatchAssetUploadUrls,
  getAssetDownloadUrl, 
  deleteAsset, 
  deleteBatchAssets,
  listOrgAssets, 
  listAllOrgAssets,
  migrateStorageKeyToUrl
} from '../../lib/unified-storage.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { createRequestLogger } from '../../lib/log.js';

const router = Router();

// Validation schemas
const UploadRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().optional(),
  size: z.number().optional(),
  folder: z.enum(['branding', 'documents', 'portfolio']).optional().default('branding')
});

const BatchUploadRequestSchema = z.object({
  files: z.array(z.object({
    filename: z.string().min(1, 'Filename is required'),
    contentType: z.string().optional(),
    size: z.number().optional()
  })).min(1, 'At least one file required').max(10, 'Maximum 10 files allowed'),
  folder: z.enum(['branding', 'documents', 'portfolio']).optional().default('branding')
});

const UpdateLogoSchema = z.object({
  logoUrl: z.string().url('Must be a valid URL')
});

const DeleteAssetsSchema = z.object({
  storageKeys: z.array(z.string().min(1)).min(1, 'At least one asset required')
});

const ListAssetsSchema = z.object({
  folder: z.enum(['branding', 'documents', 'portfolio', 'all']).optional().default('branding')
});

/**
 * POST /organizations/:id/assets/upload
 * Create signed upload URL for single asset with security validation
 */
router.post('/:id/assets/upload', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { filename, contentType, size, folder } = UploadRequestSchema.parse(req.body);
    
    logger.info({ orgId, filename, contentType, size, folder }, 'Creating secure asset upload URL');
    
    const uploadResponse = await createAssetUploadUrl(orgId, filename, contentType, folder);
    
    logger.info({ 
      orgId, 
      publicUrl: uploadResponse.publicUrl, 
      storageKey: uploadResponse.storageKey,
      folder 
    }, 'Secure asset upload URL created');
    
    res.json({
      success: true,
      uploadUrl: uploadResponse.uploadUrl,
      storageKey: uploadResponse.storageKey,
      folder
      // publicUrl removed for security - use signed download URLs instead
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
 * POST /organizations/:id/assets/batch-upload
 * Create signed upload URLs for multiple assets with security validation
 */
router.post('/:id/assets/batch-upload', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { files, folder } = BatchUploadRequestSchema.parse(req.body);
    
    logger.info({ orgId, fileCount: files.length, folder }, 'Creating batch asset upload URLs');
    
    const uploadResponses = await createBatchAssetUploadUrls(orgId, files, folder);
    
    logger.info({ 
      orgId, 
      fileCount: uploadResponses.length, 
      folder 
    }, 'Batch asset upload URLs created');
    
    res.json({
      success: true,
      uploads: uploadResponses.map(response => ({
        originalFilename: response.originalFilename,
        uploadUrl: response.uploadUrl,
        storageKey: response.storageKey
        // publicUrl removed for security - use signed download URLs instead
      })),
      folder
    });
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to create batch asset upload URLs');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create batch upload URLs',
      message: error.message
    });
  }
});

/**
 * GET /organizations/:id/assets/:folder/:filename
 * Serve organization assets with time-limited signed URLs and security validation
 */
router.get('/:id/assets/:folder/:filename', requireAuth, requireOrgReadonly(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  const folder = req.params.folder;
  const filename = req.params.filename;
  const storageKey = `org/${orgId}/${folder}/${filename}`;
  
  try {
    // Validate folder is allowed
    const allowedFolders = ['branding', 'documents', 'portfolio'];
    if (!allowedFolders.includes(folder)) {
      logger.warn({ orgId, folder, filename }, 'Invalid folder access attempt');
      return res.status(400).json({
        success: false,
        error: 'Invalid folder',
        message: `Folder must be one of: ${allowedFolders.join(', ')}`
      });
    }
    
    // Get time-limited signed URL with organization validation
    const signedUrl = await getAssetDownloadUrl(storageKey, 3600, orgId);
    
    logger.info({ orgId, folder, filename, storageKey }, 'Serving secure asset');
    
    // Set secure headers and redirect to signed URL
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes, private cache
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.redirect(signedUrl);
    
  } catch (error: any) {
    logger.error({ error, orgId, folder, filename, storageKey }, 'Failed to serve asset');
    
    res.status(404).json({
      success: false,
      error: 'Asset not found',
      message: `Asset ${filename} not found in ${folder} for organization ${orgId}`
    });
  }
});

/**
 * GET /organizations/:id/assets/:filename (legacy support for branding folder)
 * Maintain backward compatibility while redirecting to new structure
 */
router.get('/:id/assets/:filename', requireAuth, requireOrgReadonly(), async (req, res) => {
  const orgId = req.params.id;
  const filename = req.params.filename;
  
  // Redirect to the new folder-based structure
  res.redirect(301, `/api/v1/organizations/${orgId}/assets/branding/${filename}`);
});

/**
 * GET /organizations/:id/assets
 * List assets for an organization with optional folder filtering
 */
router.get('/:id/assets', requireAuth, requireOrgReadonly(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { folder } = ListAssetsSchema.parse(req.query);
    
    let assets;
    if (folder === 'all') {
      assets = await listAllOrgAssets(orgId);
    } else {
      assets = await listOrgAssets(orgId, folder);
    }
    
    logger.info({ orgId, assetCount: assets.length, folder }, 'Listed organization assets');
    
    res.json({
      success: true,
      assets,
      folder,
      totalCount: assets.length
    });
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to list assets');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to list assets',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id/assets/:folder/:filename
 * Delete a single organization asset with security validation
 */
router.delete('/:id/assets/:folder/:filename', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  const folder = req.params.folder;
  const filename = req.params.filename;
  const storageKey = `org/${orgId}/${folder}/${filename}`;
  
  try {
    // Validate folder is allowed
    const allowedFolders = ['branding', 'documents', 'portfolio'];
    if (!allowedFolders.includes(folder)) {
      logger.warn({ orgId, folder, filename }, 'Invalid folder deletion attempt');
      return res.status(400).json({
        success: false,
        error: 'Invalid folder',
        message: `Folder must be one of: ${allowedFolders.join(', ')}`
      });
    }
    
    // Delete with organization validation
    await deleteAsset(storageKey, orgId);
    
    logger.info({ orgId, folder, filename, storageKey }, 'Asset deleted securely');
    
    res.status(204).send();
    
  } catch (error: any) {
    logger.error({ error, orgId, folder, filename, storageKey }, 'Failed to delete asset');
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete asset',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id/assets
 * Delete multiple organization assets with security validation
 */
router.delete('/:id/assets', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  
  try {
    const { storageKeys } = DeleteAssetsSchema.parse(req.body);
    
    // Delete batch with organization validation
    await deleteBatchAssets(storageKeys, orgId);
    
    logger.info({ orgId, assetCount: storageKeys.length, storageKeys }, 'Batch assets deleted securely');
    
    res.status(204).send();
    
  } catch (error: any) {
    logger.error({ error, orgId }, 'Failed to delete batch assets');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete assets',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id/assets/:filename (legacy support)
 * Maintain backward compatibility while redirecting to new structure
 */
router.delete('/:id/assets/:filename', requireAuth, requireOrgAdmin(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  const filename = req.params.filename;
  
  // Assume legacy files are in branding folder
  const storageKey = `org/${orgId}/branding/${filename}`;
  
  try {
    await deleteAsset(storageKey, orgId);
    
    logger.info({ orgId, filename, storageKey }, 'Legacy asset deleted');
    
    res.status(204).send();
    
  } catch (error: any) {
    logger.error({ error, orgId, filename, storageKey }, 'Failed to delete legacy asset');
    
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
 * Serve organization logo with security and robust fallbacks
 */
router.get('/:id/logo', requireAuth, requireOrgReadonly(), async (req, res) => {
  const logger = createRequestLogger(req);
  const orgId = req.params.id;
  const CACHE_TTL = 300; // 5 minutes
  
  // Set secure CORS headers for asset serving
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  try {
    // Get organization data with error handling
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('logo_url, name')
      .eq('id', orgId)
      .single();
    
    if (error || !org) {
      logger.warn({ orgId, error: error?.message }, 'Organization not found for logo request');
      return servePlaceholder(res, '?', CACHE_TTL);
    }
    
    // No logo URL set
    if (!org.logo_url) {
      const firstLetter = org.name?.charAt(0).toUpperCase() || 'O';
      logger.info({ orgId, orgName: org.name }, 'Serving placeholder logo');
      return servePlaceholder(res, firstLetter, CACHE_TTL);
    }
    
    // If it's already a full URL, create secure signed URL instead of direct redirect
    if (org.logo_url.startsWith('http')) {
      // For external URLs, we'll redirect directly but log for security monitoring
      logger.info({ orgId, logoUrl: org.logo_url }, 'Serving external logo URL');
      res.setHeader('Cache-Control', `private, max-age=${CACHE_TTL}`);
      return res.redirect(org.logo_url);
    }
    
    // For storage keys, create time-limited signed URLs
    try {
      const signedUrl = await getAssetDownloadUrl(org.logo_url, CACHE_TTL, orgId);
      logger.info({ orgId, storageKey: org.logo_url }, 'Serving secure logo via signed URL');
      res.setHeader('Cache-Control', `private, max-age=${CACHE_TTL}`);
      return res.redirect(signedUrl);
    } catch (storageError) {
      // If signed URL fails, fall back to public URL migration
      logger.warn({ orgId, storageKey: org.logo_url, error: storageError }, 'Signed URL failed, falling back to public URL');
      
      const publicUrl = migrateStorageKeyToUrl(org.logo_url);
      
      // Async update in background (don't wait for it)
      (async () => {
        try {
          await supabaseAdmin
            .from('organizations')
            .update({ logo_url: publicUrl })
            .eq('id', orgId);
          logger.info({ orgId, publicUrl }, 'Migrated logo URL in background');
        } catch (error) {
          logger.error({ orgId, error }, 'Failed to migrate logo URL');
        }
      })();
      
      res.setHeader('Cache-Control', `private, max-age=${CACHE_TTL}`);
      return res.redirect(publicUrl);
    }
    
  } catch (error) {
    logger.error({ orgId, error }, 'Error serving logo');
    return servePlaceholder(res, 'L', CACHE_TTL);
  }
});

/**
 * Helper function to serve SVG placeholder with secure headers
 */
function servePlaceholder(res: any, letter: string, maxAge: number) {
  // Set secure headers for placeholder
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  
  // Sanitize letter input to prevent XSS
  const safeLetter = letter.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || 'O';
  
  const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#1a1a2e"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="96" fill="#6EE7F9">${safeLetter}</text>
  </svg>`;
  
  console.log(`📸 Serving secure placeholder SVG for letter: ${safeLetter}`);
  return res.send(svg);
}

export default router;