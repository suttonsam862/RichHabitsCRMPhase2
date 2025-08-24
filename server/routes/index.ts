import { Router } from 'express';
import authRoutes from './auth';
import { usersRouter } from './users';
import hardenedOrganizationsRoutes from './organizations/hardened';
import sportsRoutes from './sports/index';
import uploadRoutes from './upload';

const router = Router();

router.get('/healthcheck', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/users', usersRouter);
router.use('/organizations', hardenedOrganizationsRoutes);
router.use('/sports', sportsRoutes);
router.use('/upload', uploadRoutes);

export { router as apiRouter };
export default router;