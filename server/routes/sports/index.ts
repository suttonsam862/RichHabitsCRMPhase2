import { Router } from 'express';
import { z } from 'zod';
import { sendOk, sendErr, sendCreated, sendNoContent } from '../../lib/http';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';

const r = Router();
// TODO: Re-enable auth when user login is implemented
// r.use(requireAuth);

const createSportSchema = z.object({
  name: z.string().min(2).max(50)
});

const updateSportSchema = z.object({
  name: z.string().min(2).max(50)
});

/* ---------- List all sports ---------- */
r.get('/', async (req: any, res) => {
  const sb = supabaseAdmin;
  
  const { data, error } = await sb
    .from('sports')
    .select('id, name')
    .order('name');
    
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data || []);
});

/* ---------- Create sport ---------- */
r.post('/', async (req: any, res) => {
  const parse = createSportSchema.safeParse(req.body);
  if (!parse.success) return sendErr(res, 'BAD_REQUEST', 'Invalid sport data', parse.error.flatten(), 400);
  
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from('sports')
    .insert([{ name: parse.data.name }])
    .select()
    .single();
    
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendCreated(res, data);
});

/* ---------- Update sport ---------- */
r.patch('/:id', async (req: any, res) => {
  const parse = updateSportSchema.safeParse(req.body);
  if (!parse.success) return sendErr(res, 'BAD_REQUEST', 'Invalid sport data', parse.error.flatten(), 400);
  
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from('sports')
    .update({ name: parse.data.name })
    .eq('id', req.params.id)
    .select()
    .single();
    
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data);
});

/* ---------- Delete sport ---------- */
r.delete('/:id', async (req: any, res) => {
  const sb = supabaseAdmin;
  const { error } = await sb
    .from('sports')
    .delete()
    .eq('id', req.params.id);
    
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendNoContent(res);
});

export default r;