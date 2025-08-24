import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';

const r = Router();
r.use(requireAuth); // TODO: add admin guard

/* ---------- Policies endpoint ---------- */
r.get('/policies/organizations', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'organizations')
      .eq('schemaname', 'public');
    
    if (error) {
      return sendErr(res, 500, error.message);
    }
    
    return sendOk(res, data || []);
  } catch (error: any) {
    return sendErr(res, 500, error?.message || 'Failed to fetch policies');
  }
});

/* ---------- Self-test endpoint ---------- */
r.post('/selftest', async (req: any, res) => {
  try {
    const sb = supabaseForUser(req.headers.authorization?.slice(7));
    const { data, error } = await sb.rpc('org_can_insert');
    
    if (error) {
      return sendErr(res, 500, error.message);
    }
    
    return sendOk(res, { canInsert: !!data });
  } catch (error: any) {
    return sendErr(res, 500, error?.message || 'Self-test failed');
  }
});

/* ---------- Schema reload endpoint ---------- */
r.post('/schema/reload', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.rpc('pgrst_reload');
    
    if (error) {
      return sendErr(res, 500, error.message);
    }
    
    return sendOk(res, { reloaded: true });
  } catch (error: any) {
    return sendErr(res, 500, error?.message || 'Schema reload failed');
  }
});

export default r;