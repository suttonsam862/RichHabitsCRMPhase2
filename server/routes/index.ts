import { Router } from 'express';
import authRoutes from './auth';
import { usersRouter } from './users';
import adminUsersRouter from './users/admin';
import { comprehensiveUsersRouter } from './users/comprehensive';
import enhancedUsersRouter from './users/enhanced';
import hardenedOrganizationsRoutes from './organizations/hardened';
import sportsRoutes from './sports/index';
// Removed uploadRoutes import - deprecated in favor of objects endpoint
import { brandingRouter } from './files/branding.js';

const router = Router();

router.get('/healthcheck', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1.1' }));
router.use('/auth', authRoutes);
router.use('/users/comprehensive', comprehensiveUsersRouter);
router.use('/users/admin', adminUsersRouter);
router.use('/users/enhanced', enhancedUsersRouter);
router.use('/users', usersRouter);
router.use('/organizations', hardenedOrganizationsRoutes);
router.use('/files', brandingRouter); // Mount branding routes under /files
router.use('/sports', sportsRoutes);
// Removed deprecated upload routes - now handled by objects endpoint

// Object storage routes
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

// Public objects serving using ObjectStorageService
router.get('/public-objects/:filePath(*)', async (req, res) => {
  const filePath = req.params.filePath;
  const objectStorageService = new (await import('../objectStorage')).ObjectStorageService();
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    objectStorageService.downloadObject(file, res);
  } catch (error) {
    console.error("Error searching for public object:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;