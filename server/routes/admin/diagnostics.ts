import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';
import { getLogs } from '../../lib/ringlog';

const r = Router();
r.use(requireAuth); // TODO: add admin guard

r.post('/schema/reload', async (_req,res)=>{
  const { error } = await supabaseAdmin.rpc('pgrst_reload');
  if (error) return sendErr(res, 500, error.message);
  return sendOk(res, { reloaded:true });
});

r.post('/rls/selftest', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { data, error } = await sb.rpc('org_can_insert');
  if (error) return sendErr(res, 500, error.message);
  return sendOk(res, { canInsert: !!data });
});

r.get('/heartbeat', (_req,res)=> sendOk(res, { ts: new Date().toISOString() }));

r.get('/logs', (_req,res)=> {
  return sendOk(res, getLogs());
});

export default r;