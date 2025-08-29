import { Router } from 'express';
import authRoutes from './auth';
import { usersRouter } from './users';
import adminUsersRouter from './users/admin';
import { comprehensiveUsersRouter } from './users/comprehensive';
import enhancedUsersRouter from './users/enhanced';
import hardenedOrganizationsRoutes from './organizations/hardened';
import sportsRoutes from './sports/index';
import uploadRoutes from './upload';
import { brandingRouter } from './files/branding.js';

const router = Router();

router.get('/healthcheck', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/users/comprehensive', comprehensiveUsersRouter);
router.use('/users/admin', adminUsersRouter);
router.use('/users/enhanced', enhancedUsersRouter);
router.use('/users', usersRouter);
router.use('/organizations', hardenedOrganizationsRoutes);
router.use('/organizations', brandingRouter); // Mount branding routes under /organizations
router.use('/sports', sportsRoutes);
router.use('/upload', uploadRoutes);

// Temporary placeholder for public objects until object storage is properly configured
router.get('/public-objects/*', (req, res) => {
  // Extract path info for debugging
  const path = (req.params as any)[0] || '';
  console.log('Public objects request for path:', path);

  // For now, return a generic placeholder
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#1a1a2e"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="64" fill="#6EE7F9">
      📎
    </text>
  </svg>`);
});

export default router;