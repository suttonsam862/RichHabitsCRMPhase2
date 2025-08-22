/**
 * Canonical API router - single source of truth for all API routes
 * Mounts all domain-specific routers under /api
 */

import express from 'express';
import { organizationsRouter } from './organizations/index';
import { usersRouter } from './users/index';
import { ordersRouter } from './orders/index';
// Import additional routers as they become available
// import { salesRouter } from './sales/index';
// import { manufacturingRouter } from './manufacturing/index';  
// import { catalogRouter } from './catalog/index';
import uploadRouter from './upload';

const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// Domain-specific routers - canonical mounts
apiRouter.use('/organizations', organizationsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/upload', uploadRouter);

// Additional routers to be mounted as they become available
// apiRouter.use('/sales', salesRouter);
// apiRouter.use('/manufacturing', manufacturingRouter);
// apiRouter.use('/catalog', catalogRouter);

// 404 handler for API routes
apiRouter.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
      details: {
        path: req.originalUrl,
        method: req.method
      }
    }
  });
});

export { apiRouter };