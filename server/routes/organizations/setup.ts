import { Router } from 'express';
import { z } from 'zod';
import { sendOk, sendErr } from '../../lib/http';
import { supabaseAdmin, supabaseForUser } from '../../lib/supabase';

const router = Router();

// GET setup data
router.get('/:id/setup', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const orgId = req.params.id;
  // fetch org + its sports (ids & current addresses)
  const org = await sb.from('organizations')
    .select('id,name,logo_url,brand_primary,brand_secondary,finance_email,tax_exempt_doc_key,setup_complete,color_palette,gradient_css')
    .eq('id',orgId).maybeSingle();
  if (org.error) return sendErr(res, 'DB_ERROR', org.error.message, undefined, 400);
  const sports = await sb.from('org_sports')
    .select('organization_id,sport_id,ship_address_line1,ship_address_line2,ship_city,ship_state,ship_postal_code,ship_country,contact_user_id')
    .eq('organization_id', orgId);
  if (sports.error) return sendErr(res, 'DB_ERROR', sports.error.message, undefined, 400);
  return sendOk(res, { org: org.data, sports: sports.data });
});

// POST setup save (finance email, colors confirm, set complete if all present)
const SetupSchema = z.object({
  brand_primary: z.string().optional(),
  brand_secondary: z.string().optional(),
  color_palette: z.array(z.string()).optional(),
  finance_email: z.string().email().optional(),
  complete: z.boolean().optional()
});

router.post('/:id/setup', async (req:any,res)=>{
  const parse = SetupSchema.safeParse(req.body);
  if (!parse.success) return sendErr(res, 'VALIDATION_ERROR', 'Invalid payload', parse.error.flatten(), 400);
  const sb = supabaseAdmin; // server-side writes
  const orgId = req.params.id;
  const patch:any = {};
  if (parse.data.brand_primary)   patch.brand_primary   = parse.data.brand_primary;
  if (parse.data.brand_secondary) patch.brand_secondary = parse.data.brand_secondary;
  if (parse.data.color_palette)   patch.color_palette   = parse.data.color_palette;
  if (parse.data.finance_email)   patch.finance_email   = parse.data.finance_email;
  if (patch.brand_primary && patch.brand_secondary) {
    patch.gradient_css = `linear-gradient(135deg, ${patch.brand_primary} 0%, ${patch.brand_secondary} 100%)`;
  }
  if (parse.data.complete) {
    patch.setup_complete = true;
    patch.setup_completed_at = new Date().toISOString();
  }
  const up = await sb.from('organizations').update(patch).eq('id', orgId).select().single();
  if (up.error) return sendErr(res, 'DB_ERROR', up.error.message, undefined, 400);
  return sendOk(res, up.data);
});

// Per-sport shipping address upsert
const AddressSchema = z.object({
  ship_address_line1: z.string().min(3),
  ship_address_line2: z.string().optional().nullable(),
  ship_city:          z.string().min(2),
  ship_state:         z.string().min(2),
  ship_postal_code:   z.string().min(2),
  ship_country:       z.string().min(2)
});

router.post('/:id/sports/:sportId/address', async (req:any,res)=>{
  const parse = AddressSchema.safeParse(req.body);
  if (!parse.success) return sendErr(res, 'VALIDATION_ERROR', 'Invalid address', parse.error.flatten(), 400);
  const sb = supabaseAdmin;
  const orgId = req.params.id;
  const sportId = req.params.sportId;
  // merge into org_sports row
  const up = await sb.from('org_sports').update({
    ship_address_line1: parse.data.ship_address_line1,
    ship_address_line2: parse.data.ship_address_line2 ?? null,
    ship_city:          parse.data.ship_city,
    ship_state:         parse.data.ship_state,
    ship_postal_code:   parse.data.ship_postal_code,
    ship_country:       parse.data.ship_country
  }).eq('organization_id', orgId).eq('sport_id', sportId).select().maybeSingle();
  if (up.error) return sendErr(res, 'DB_ERROR', up.error.message, undefined, 400);
  return sendOk(res, up.data);
});

// Logo + Tax-Exemption signed-upload + apply
function safeName(n:string){ return n.includes('..')||n.startsWith('/')||n.includes('\\') ? '' : n.replace(/[^a-zA-Z0-9._-]/g,'_'); }

router.post('/:id/logo/sign', async (req:any,res)=>{
  const { fileName } = req.body||{};
  if (!fileName) return sendErr(res, 'VALIDATION_ERROR', 'fileName required', undefined, 400);
  const key = `org/${req.params.id}/branding/${safeName(fileName)}`;
  const sign = await supabaseAdmin.storage.from('app').createSignedUploadUrl(key, { upsert:true });
  if (sign.error || !sign.data?.signedUrl) return sendErr(res, 'STORAGE_ERROR', sign.error?.message || 'sign error', undefined, 400);
  return sendOk(res, { uploadUrl: sign.data.signedUrl, key });
});

router.post('/:id/logo/apply', async (req:any,res)=>{
  const { key } = req.body||{};
  if (!key) return sendErr(res, 'VALIDATION_ERROR', 'key required', undefined, 400);
  const up = await supabaseAdmin.from('organizations').update({ logo_url: key }).eq('id', req.params.id).select('logo_url').single();
  if (up.error) return sendErr(res, 'DB_ERROR', up.error.message, undefined, 400);
  return sendOk(res, up.data);
});

router.post('/:id/tax/sign', async (req:any,res)=>{
  const { fileName } = req.body||{};
  if (!fileName) return sendErr(res, 'VALIDATION_ERROR', 'fileName required', undefined, 400);
  const key = `org/${req.params.id}/tax/${safeName(fileName)}`;
  const sign = await supabaseAdmin.storage.from('app').createSignedUploadUrl(key, { upsert:true });
  if (sign.error || !sign.data?.signedUrl) return sendErr(res, 'STORAGE_ERROR', sign.error?.message || 'sign error', undefined, 400);
  return sendOk(res, { uploadUrl: sign.data.signedUrl, key });
});

router.post('/:id/tax/apply', async (req:any,res)=>{
  const { key } = req.body||{};
  if (!key) return sendErr(res, 'VALIDATION_ERROR', 'key required', undefined, 400);
  const up = await supabaseAdmin.from('organizations').update({ tax_exempt_doc_key: key }).eq('id', req.params.id).select('tax_exempt_doc_key').single();
  if (up.error) return sendErr(res, 'DB_ERROR', up.error.message, undefined, 400);
  return sendOk(res, up.data);
});

export default router;