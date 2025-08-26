// This file is deprecated and has been replaced by ./organizations/hardened.ts
import { Router } from 'express';
import createRouter from './create.js';
import hardenedRouter from './hardened.js';
import diagnosticsRouter from './diagnostics.js';
import setupRouter from './setup.js';

const router = Router();

router.use('/', createRouter);
router.use('/', hardenedRouter);
router.use('/', diagnosticsRouter);
router.use('/', setupRouter);

export default router;