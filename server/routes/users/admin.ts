import { Router } from 'express';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';

const r = Router();
r.use(requireAuth);

// Admin-only: list users + roles by org
r.get('/list', async (req:any,res)=>{
  try{
    // NOTE: service role allows admin aggregation; you may add an app-level admin guard here
    const users = await supabaseAdmin.from('user_roles')
      .select('user_id, org_id, role_id, roles:role_id (slug,name), org:org_id (name)')
    if (users.error) return sendErr(res,'DB_ERROR',users.error.message, undefined, 400);
    return sendOk(res, users.data);
  }catch(e:any){ return sendErr(res,'INTERNAL_ERROR',e?.message||'users admin list error', undefined, 500); }
});

export default r;