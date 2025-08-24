import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk } from '../../lib/http';
import { isEmailConfigured, emailConfigIssues } from '../../lib/email';

const r = Router();

r.use(requireAuth); // TODO: guard with admin role if desired

r.get('/email', (_req,res)=> sendOk(res, { ok: isEmailConfigured(), missing: isEmailConfigured()? [] : emailConfigIssues() }));

export default r;