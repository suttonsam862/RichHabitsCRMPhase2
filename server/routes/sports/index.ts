import { Router } from 'express';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseForUser } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';

const r = Router();
r.use(requireAuth);

/* ---------- List all sports ---------- */
r.get('/', async (req: any, res) => {
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  
  const { data, error } = await sb
    .from('sports')
    .select('id, name')
    .order('name');
    
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data || []);
});

export default r;