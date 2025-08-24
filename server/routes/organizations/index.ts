// This file is deprecated and has been replaced by ./organizations/hardened.ts
import { Router } from 'express';
import createRouter from './create.js';
import hardenedRouter from './hardened.js';
import diagnosticsRouter from './diagnostics.js';

const router = Router();

router.use('/', createRouter);
router.use('/', hardenedRouter);
router.use('/', diagnosticsRouter);

export default router;