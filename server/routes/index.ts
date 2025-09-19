import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireOrgAdmin } from '../middleware/orgSecurity';
import authRoutes from './auth';
import { usersRouter } from './users';
import adminUsersRouter from './users/admin';
import { comprehensiveUsersRouter } from './users/comprehensive';
import { enhancedUsersRouter } from './users/enhanced';
import organizationsRoutes from './organizations/index.js';
import sportsRoutes from './sports/index';
import salesRoutes from './sales/index';
import regionsRoutes from './regions/index';
import performanceTiersRoutes from './performance-tiers/index';
import orderStatusRoutes from './order-status/index';
import systemSettingsRoutes from './system-settings/index';
import permissionTemplatesRoutes from './permission-templates';
import catalogRoutes from './catalog/index';
import designerRoutes from './designers/index';
import designJobRoutes from './design-jobs/index';
import manufacturerRoutes from './manufacturers/index';
import workOrderRoutes from './work-orders/index';
import purchaseOrderRoutes from './purchase-orders/index';
import supplierRoutes from './suppliers/index';
import materialRoutes from './materials/index';
// Removed uploadRoutes import - deprecated in favor of objects endpoint
import { brandingRouter } from './files/branding.js';
import adminConfig from './admin/config.js';
import adminDiagnostics from './admin/diagnostics.js';
import adminRls from './admin/rls.js';
import adminSchema from './admin/schema.js';
import testSentryRoutes from './test-sentry.js';

const router = Router();

router.get('/healthcheck', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1.1' }));
router.use('/auth', authRoutes);
router.use('/users/comprehensive', comprehensiveUsersRouter);
router.use('/users/admin', adminUsersRouter);
router.use('/users/enhanced', enhancedUsersRouter);
router.use('/users', usersRouter);
router.use('/organizations', organizationsRoutes);
router.use('/files', brandingRouter); // Mount branding routes under /files
router.use('/sports', sportsRoutes);
router.use('/sales', salesRoutes);
router.use('/regions', regionsRoutes);
router.use('/performance-tiers', performanceTiersRoutes);
router.use('/order-status', orderStatusRoutes);
router.use('/system-settings', systemSettingsRoutes);
router.use('/catalog', catalogRoutes);
router.use('/designers', designerRoutes);
router.use('/design-jobs', designJobRoutes);
router.use('/manufacturers', manufacturerRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/materials', materialRoutes);
router.use('/permission-templates', permissionTemplatesRoutes);
// Removed deprecated upload routes - now handled by objects endpoint
router.use('/admin/config', adminConfig);
router.use('/admin/diagnostics', adminDiagnostics);
router.use('/admin/rls', adminRls);
router.use('/admin/schema', adminSchema);

// Development-only test routes for Sentry integration
if (process.env.NODE_ENV === 'development') {
  router.use('/test/sentry', testSentryRoutes);
}

// Object storage routes - using ObjectStorageService implementation below

// SECURED: Upload endpoint with organization-scoped access control - Phase 0 SEC-2
router.post('/objects/upload', requireAuth, requireOrgAdmin(), async (req: any, res) => {
  try {
    const { fileName, organizationId } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Import supabaseAdmin for storage operations
    const { supabaseAdmin } = await import('../lib/supabaseAdmin.js');

    // Generate a unique key for the object
    const { randomUUID } = await import('crypto');
    const fileExt = fileName.split('.').pop() || 'png';
    const uniqueFileName = `${randomUUID()}.${fileExt}`;
    const objectKey = organizationId ?
      `org/${organizationId}/branding/${uniqueFileName}` :
      `uploads/${uniqueFileName}`;

    // Create signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .createSignedUploadUrl(objectKey, {
        upsert: true
      });

    if (error || !data?.signedUrl) {
      console.error('Supabase storage error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to create upload URL',
        details: error?.message
      });
    }

    console.log('Upload URL created successfully:', data.signedUrl);
    return res.json({
      success: true,
      uploadURL: data.signedUrl,
      objectKey
    });
  } catch (error: any) {
    console.error('Object upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Debug route to list files in storage - SECURED: disabled in production unless explicitly enabled
router.get('/debug/storage-files', requireAuth, async (req: any, res) => {
  // Phase 0 SEC-2: Block debug endpoints in production
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDebugEndpoints = process.env.ALLOW_DEBUG_ENDPOINTS === 'true';
  
  if (isProduction && !allowDebugEndpoints) {
    console.warn(`[SEC-2] Blocked debug endpoint access in production by user: ${req.user?.id}`);
    return res.status(404).json({ error: 'Not found' }); // Return 404 to hide endpoint existence
  }
  
  // SECURITY: Only super-admins can access storage files listing
  if (!req.user?.is_super_admin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  try {
    const { supabaseAdmin } = await import('../lib/supabaseAdmin.js');
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .list('org', { limit: 100 });

    console.log('DEBUG: Storage list result:', data, 'error:', error);
    res.json({ files: data, error: error?.message });
  } catch (error) {
    console.error('Error listing storage files:', error);
    res.status(500).json({ error: error });
  }
});

// SECURED: File serving endpoint with strict path validation and org membership check - Phase 0 SEC-2
router.get('/files/public-objects/:filePath(*)', requireAuth, async (req: any, res) => {
  try {
    const filePath = req.params.filePath as string;
    const user = req.user;

    if (!user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // SECURITY: Validate file path - only allow organization branding files
    if (!filePath.startsWith('org/') || !filePath.includes('/branding/')) {
      console.error('SECURITY: Blocked unauthorized file access attempt:', filePath, 'user:', user.id);
      return res.status(403).json({ error: 'Access denied - invalid file path' });
    }

    // Extract organization ID from path: org/{org-id}/branding/filename
    const pathParts = filePath.split('/');
    if (pathParts.length < 4 || pathParts[0] !== 'org' || pathParts[2] !== 'branding') {
      console.error('SECURITY: Invalid organization file path structure:', filePath);
      return res.status(403).json({ error: 'Access denied - invalid file structure' });
    }

    const organizationId = pathParts[1];

    // SECURITY: Verify user has access to this organization
    const { supabaseForUser } = await import('../lib/supabase.js');
    const userClient = supabaseForUser(req.headers.authorization?.split(' ')[1] || '');
    
    const { data: orgAccess, error: accessError } = await userClient
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (accessError || !orgAccess) {
      console.error('SECURITY: User attempted unauthorized org file access:', {
        userId: user.id,
        orgId: organizationId,
        filePath: filePath,
        error: accessError?.message
      });
      return res.status(403).json({ error: 'Access denied - organization not accessible' });
    }

    // Now serve the file with proper authorization
    const { supabaseAdmin } = await import('../lib/supabaseAdmin.js');
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      console.error('Failed to create signed URL for authorized request:', filePath, 'Error:', error);
      return res.status(404).json({ error: 'File not found' });
    }

    // Fetch the file from Supabase and stream it to the client
    const fetch = (await import('node-fetch')).default;
    const fileResponse = await fetch(data.signedUrl);

    if (!fileResponse.ok) {
      console.error('File fetch failed for authorized request:', fileResponse.status, filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for image serving
    res.set({
      'Content-Type': fileResponse.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });

    // Stream the file to the response
    fileResponse.body?.pipe(res);
    
    console.log('SECURITY: Authorized file access granted:', {
      userId: user.id,
      orgId: organizationId,
      filePath: filePath
    });

  } catch (error: any) {
    console.error('Error serving secured object:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;