/**
 * Main API router - consolidates all feature routers
 * Provides centralized route organization and middleware
 */

import express from 'express';
import { organizationsRouter } from './organizations/index';
import { usersRouter } from './users/index';
import uploadRouter from './upload';
// TODO: Fix TypeScript type imports in sales router before enabling
// import { salesRouter } from './sales/index';
// import { ordersRouter } from './orders/index';
// import { manufacturingRouter } from './manufacturing/index';
// import { catalogRouter } from './catalog/index';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    db: 'connected',
    orgs: 0, // TODO: Get actual count from database
  });
});

// Feature routers
router.use('/organizations', organizationsRouter);
router.use('/users', usersRouter);
router.use('/upload', uploadRouter);
// TODO: Enable sales router after fixing TypeScript type import issues
// router.use('/sales', salesRouter);
// router.use('/orders', ordersRouter);
// router.use('/manufacturing', manufacturingRouter);
// router.use('/catalog', catalogRouter);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

export { router as apiRouter };