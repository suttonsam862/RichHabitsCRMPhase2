import express from 'express';
import { brandingRouter } from './branding';
import portfolioRouter from './portfolio';

const router = express.Router();

// Mount branding file routes under /organizations/:id
router.use('/organizations', brandingRouter);

// Mount portfolio routes
router.use('/portfolio', portfolioRouter);

export { router as filesRouter };