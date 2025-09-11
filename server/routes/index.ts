import { Router } from 'express';
import authRoutes from './auth';
import { usersRouter } from './users';
import adminUsersRouter from './users/admin';
import { comprehensiveUsersRouter } from './users/comprehensive';
import enhancedUsersRouter from './users/enhanced';
import organizationsRoutes from './organizations/index.js';
import sportsRoutes from './sports/index';
import salesRoutes from './sales/index';
import permissionTemplatesRoutes from './permission-templates';
import catalogRoutes from './catalog/index';
import designerRoutes from './designers/index';
import manufacturerRoutes from './manufacturers/index';
// Removed uploadRoutes import - deprecated in favor of objects endpoint
import { brandingRouter } from './files/branding.js';

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
router.use('/catalog', catalogRoutes);
router.use('/designers', designerRoutes);
router.use('/manufacturers', manufacturerRoutes);
router.use('/permission-templates', permissionTemplatesRoutes);
// Removed deprecated upload routes - now handled by objects endpoint

// Object storage routes - using ObjectStorageService implementation below

router.post('/objects/upload', async (req: any, res) => {
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

// Debug route to list files in storage
router.get('/debug/storage-files', async (req, res) => {
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

// Public objects serving from Supabase storage
router.get('/public-objects/:filePath(*)', async (req, res) => {
  try {
    const filePath = req.params.filePath;
    console.log('DEBUG: Requested file path:', filePath);

    const { supabaseAdmin } = await import('../lib/supabaseAdmin.js');
    console.log('DEBUG: Supabase admin client loaded');

    // Try to create a signed URL instead of public URL for better access control
    const { data, error } = await supabaseAdmin.storage
      .from('app')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    console.log('DEBUG: Signed URL data:', data, 'error:', error);

    if (error || !data?.signedUrl) {
      console.error('Failed to create signed URL for:', filePath, 'Error:', error);
      return res.status(404).json({ error: 'File not found', details: error?.message });
    }

    console.log('DEBUG: Fetching from signed URL:', data.signedUrl);

    // Fetch the file from Supabase and stream it to the client
    const fetch = (await import('node-fetch')).default;
    const fileResponse = await fetch(data.signedUrl);

    console.log('DEBUG: Fetch response status:', fileResponse.status, 'for path:', filePath);

    if (!fileResponse.ok) {
      console.error('File fetch failed:', fileResponse.status, filePath, 'URL:', data.signedUrl);
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for image serving
    res.set({
      'Content-Type': fileResponse.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });

    console.log('DEBUG: Streaming file to response');

    // Stream the file to the response
    fileResponse.body?.pipe(res);
  } catch (error) {
    console.error('Error serving public object:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;