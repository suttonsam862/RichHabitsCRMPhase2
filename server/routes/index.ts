/**
 * Canonical API router - single source of truth for all API routes
 * Mounts all domain-specific routers under /api/v1
 */

import express from 'express';
import authRouter from './auth/index';
import organizationsRouter from './organizations/index';
import hardenedOrganizationsRouter from './organizations/hardened';
import sportsRouter from './sports/index';
import { usersRouter } from './users/index';
import ordersRouter from './orders/index';
import { filesRouter } from './files/index';
import adminConfigRouter from './admin/config';
import adminSchemaRouter from './admin/schema';
import adminDiagnosticsRouter from './admin/diagnostics';
import adminRlsRouter from './admin/rls';
// Import additional routers as they become available
// import { salesRouter } from './sales/index';
// import { manufacturingRouter } from './manufacturing/index';  
// import { catalogRouter } from './catalog/index';
import uploadRouter from './upload';

const apiRouter = express.Router();

// Create v1 router
const v1Router = express.Router();

// Mount auth routes (no requireAuth needed for auth endpoints)
v1Router.use('/auth', authRouter);

// Domain-specific routers - canonical mounts
v1Router.use('/organizations', organizationsRouter);
v1Router.use('/organizations', hardenedOrganizationsRouter);
v1Router.use('/sports', sportsRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/orders', ordersRouter);
v1Router.use('/files', filesRouter);
v1Router.use('/admin/config', adminConfigRouter);
v1Router.use('/admin/schema', adminSchemaRouter);
v1Router.use('/admin/diagnostics', adminDiagnosticsRouter);
v1Router.use('/admin/rls', adminRlsRouter);

// Mount v1 router
apiRouter.use('/v1', v1Router);

// Legacy routes (to be deprecated)
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