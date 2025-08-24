import { Router } from 'express';
import { supabaseAdmin } from '../../lib/supabase';
import { sendOk, sendErr } from '../../lib/http';

function safeName(name:string){ 
  if(name.includes('..')||name.startsWith('/')||name.includes('\\')) throw new Error('invalid_name'); 
  return name.replace(/[^a-zA-Z0-9._-]/g,'_'); 
}

const r = Router();

r.post('/sign', async (req, res) => {
  try{
    const { email, name } = req.body || {};
    if (!email || !name) return sendErr(res,'BAD_REQUEST','email and name required', undefined, 400);
    const s = safeName(name);
    const key = `designers/prospects/${email}/${s}`;
    const { data, error } = await supabaseAdmin.storage.from('app').createSignedUploadUrl(key, { upsert: true });
    if (error || !data?.signedUrl) return sendErr(res,'BAD_REQUEST',error?.message || 'sign error', undefined, 400);
    return sendOk(res,{ name: s, uploadUrl: data.signedUrl, key });
  }catch(e:any){ return sendErr(res,'INTERNAL_ERROR',e?.message || 'sign error', undefined, 500); }
});

export default r;