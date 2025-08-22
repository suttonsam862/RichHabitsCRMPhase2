import express from 'express';
import { brandingRouter } from './branding';

const router = express.Router();

// Mount branding file routes under /organizations/:id
router.use('/organizations', brandingRouter);

export { router as filesRouter };