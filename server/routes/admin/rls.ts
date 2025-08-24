import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseForUser } from '../../lib/supabase';

const r = Router();
r.use(requireAuth);

// POST /api/v1/admin/rls/selftest - tests RLS org_can_insert function
r.post('/selftest', async (req: any, res) => {
  try {
    const token = req.headers.authorization?.slice(7); // Remove 'Bearer ' prefix
    if (!token) {
      return sendErr(res, 'UNAUTHORIZED', 'Missing authorization token', undefined, 401);
    }
    
    const sb = supabaseForUser(token);
    const { data, error } = await sb.rpc('org_can_insert');
    
    if (error) {
      return sendErr(res, 'BAD_REQUEST', 'RLS self-test failed', error, 500);
    }
    
    return sendOk(res, { canInsert: data });
  } catch (err: any) {
    return sendErr(res, 'INTERNAL_ERROR', 'RLS self-test error', err.message, 500);
  }
});

export default r;