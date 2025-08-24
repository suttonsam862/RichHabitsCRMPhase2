import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';

const r = Router();
r.use(requireAuth);

// POST /api/v1/admin/schema/reload - triggers PostgREST schema reload
r.post('/reload', async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('pgrst_reload');
    if (error) {
      return sendErr(res, 'BAD_REQUEST', 'Schema reload failed', error, 500);
    }
    return sendOk(res, { reloaded: true, data });
  } catch (err: any) {
    return sendErr(res, 'INTERNAL_ERROR', 'Schema reload error', err.message, 500);
  }
});

export default r;