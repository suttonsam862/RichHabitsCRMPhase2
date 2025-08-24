import { Router } from 'express';
import { z } from 'zod';
import { sendOk, sendErr, sendNoContent } from '../../lib/http';
import { supabaseForUser, supabaseAdmin } from '../../lib/supabase';
import { requireAuth } from '../../middleware/auth';

const r = Router();
r.use(requireAuth);

/* ---------- Schemas ---------- */
const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
const hsl = z.string().regex(/^\d{1,3}\s\d{1,3}%\s\d{1,3}%$/);
const color = z.union([hex, hsl]);
const colorPalette = z.array(color).max(12);
const tagsSchema = z.array(z.string().max(24)).max(20);

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  // Frontend sends camelCase - match that
  isBusiness: z.boolean().default(false),
  brandPrimary: z.string().optional(),
  brandSecondary: z.string().optional(),
  colorPalette: z.array(z.string()).default([]),
  emailDomain: z.string().optional().or(z.literal('').transform(()=>undefined)),
  billingEmail: z.string().optional().or(z.literal('').transform(()=>undefined)),
  tags: z.array(z.string()).default([]),
  sports: z.array(z.object({
    sportId: z.string(),
    contactName: z.string().min(1).max(100),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
    saved: z.boolean().optional(),
    id: z.string().optional(),
    sportName: z.string().optional()
  })).default([]),
  // Address fields - keep snake_case as they match DB
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('United States'),
  // Legacy compatibility
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  logo_file: z.any().optional(),
  logo_url: z.string().optional()
}).passthrough();

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  brand_primary: color.optional(),
  brand_secondary: color.optional(),
  colorPalette: colorPalette.optional(),
  email_domain: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  billing_email: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  tags: tagsSchema.optional(),
  is_business: z.boolean().optional()
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  onlyFavorites: z.coerce.boolean().optional(),
  includeArchived: z.coerce.boolean().optional(),
  sort: z.enum(['name','created','updated']).optional().default('created'),
  dir: z.enum(['asc','desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function gradientFrom(a:string,b:string){
  // return CSS string that works in card backgrounds (client also recomputes)
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

/* ---------- Create ---------- */
r.post('/', async (req:any, res) => {
  const parse = createOrgSchema.safeParse(req.body);
  if (!parse.success) {
    console.log('❌ Validation failed for payload:', JSON.stringify(req.body, null, 2));
    console.log('❌ Validation errors:', JSON.stringify(parse.error.flatten(), null, 2));
    return sendErr(res, 'BAD_REQUEST', 'Invalid org payload', parse.error.flatten(), 400);
  }
  const uid = req.user!.id;
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const p = parse.data;

  // insert organization using user token client for RLS
  // Ensure colorPalette defaults to [] when absent and always compute gradient_css
  const colorPalette = p.colorPalette || [];
  const brandPrimary = p.brand_primary || '#3B82F6';
  const brandSecondary = p.brand_secondary || '#8B5CF6';
  const gradient = `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`;
  
  const { data: org, error: orgErr } = await sb.from('organizations').insert([{
    name: p.name,
    is_business: p.isBusiness,
    brand_primary: p.brandPrimary || brandPrimary,
    brand_secondary: p.brandSecondary || brandSecondary,
    color_palette: p.colorPalette || colorPalette,
    email_domain: p.emailDomain,
    billing_email: p.billingEmail,
    tags: p.tags,
    gradient_css: gradient
  }]).select().single();
  if (orgErr) return sendErr(res, 'BAD_REQUEST', orgErr.message, undefined, 400);

  // Re-select the row with the same client to reflect RLS membership
  const { data: freshOrg, error: selectErr } = await sb.from('organizations').select('*').eq('id', org.id).single();
  if (selectErr) return sendErr(res, 'BAD_REQUEST', selectErr.message, undefined, 400);

  // auto-create coach users & user_roles for regular orgs with sports contacts
  for (const s of p.sports){
    // create or locate auth user by email
    const { data: existing, error: gErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (gErr) return sendErr(res, 'BAD_REQUEST', gErr.message, undefined, 400);
    let coachId = existing?.users?.find(u => u.email === s.contact_email)?.id;
    if (!coachId){
      const create = await supabaseAdmin.auth.admin.createUser({
        email: s.contact_email, email_confirm: false,
        user_metadata: { full_name: s.contact_name, desired_role: 'customer' }
      });
      if (create.error || !create.data?.user) return sendErr(res, 'BAD_REQUEST', create.error?.message || 'Unable to create contact user', undefined, 400);
      coachId = create.data.user.id;
    }
    // add org_sports entry
    const { error: osErr } = await sb.from('org_sports').insert([{
      organization_id: org.id, sport_id: s.sportId,
      contact_name: s.contact_name, contact_email: s.contact_email, contact_user_id: coachId
    }]);
    if (osErr) return sendErr(res, 'BAD_REQUEST', osErr.message, undefined, 400);
    // assign Customer role scoped to this org
    const { data: roles } = await supabaseAdmin.from('roles').select('id,slug');
    const customer = roles?.find(r=>r.slug==='customer')?.id;
    if (customer) {
      await supabaseAdmin.from('user_roles').upsert({ user_id: coachId, org_id: org.id, role_id: customer }, { onConflict: 'user_id,org_id,role_id' });
    }
  }

  return sendOk(res, freshOrg);
});

/* ---------- List (search/filter/sort/pagination/favorites/archived) ---------- */
r.get('/', async (req:any,res) => {
  const q = listQuerySchema.parse(req.query);
  const uid = req.user!.id;
  const sb = supabaseForUser(req.headers.authorization?.slice(7));

  let query = sb.from('organizations')
    .select('id,name,logo_url,brand_primary,brand_secondary,color_palette,gradient_css,tags,is_business,is_archived,created_at,updated_at', { count:'exact' });

  if (!q.includeArchived) query = query.eq('is_archived', false);
  if (q.q) query = query.ilike('name', `%${q.q}%`);
  if (q.tag) query = query.contains('tags', [q.tag]);

  if (q.onlyFavorites) {
    // join with organization_favorites via filter (two-step: fetch ids then filter)
    const favs = await supabaseForUser(req.headers.authorization?.slice(7)).from('organization_favorites')
      .select('org_id').eq('user_id', uid);
    const favIds = (favs.data||[]).map(x=>x.org_id);
    if (favIds.length===0) return sendOk(res, [], 0);
    query = query.in('id', favIds);
  }

  // sort
  if (q.sort==='name') query = query.order('name', { ascending: q.dir==='asc' });
  if (q.sort==='created') query = query.order('created_at', { ascending: q.dir==='asc' });
  if (q.sort==='updated') query = query.order('updated_at', { ascending: q.dir==='asc' });

  query = query.range(q.offset, q.offset + q.limit - 1);
  const { data, error, count } = await query;
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data, count || 0);
});

/* ---------- Get summary (tabs) ---------- */
r.get('/:id', async (req:any,res)=>{
  const orgId = req.params.id;
  const uid = req.user!.id;
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  
  // For now, just return basic org data until we have the RPC function
  const { data, error } = await sb.from('organizations').select('*').eq('id', orgId).single();
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data);
});

/* ---------- Update ---------- */
r.patch('/:id', async (req:any,res)=>{
  const body = updateOrgSchema.safeParse(req.body);
  if (!body.success) return sendErr(res, 'BAD_REQUEST', 'Invalid update payload', body.error.flatten(), 400);
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const payload:any = {};
  if (body.data.name !== undefined) payload.name = body.data.name;
  if (body.data.is_business !== undefined) payload.is_business = body.data.is_business;
  if (body.data.brand_primary) payload.brand_primary = body.data.brand_primary;
  if (body.data.brand_secondary) payload.brand_secondary = body.data.brand_secondary;
  if (body.data.colorPalette) payload.color_palette = body.data.colorPalette;
  if (body.data.email_domain !== undefined) payload.email_domain = body.data.email_domain;
  if (body.data.billing_email !== undefined) payload.billing_email = body.data.billing_email;
  if (body.data.tags) payload.tags = body.data.tags;
  if (payload.brand_primary && payload.brand_secondary) {
    payload.gradient_css = `linear-gradient(135deg, ${payload.brand_primary} 0%, ${payload.brand_secondary} 100%)`;
  }
  const { data, error } = await sb.from('organizations').update(payload).eq('id', req.params.id).select().single();
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data);
});

/* ---------- Delete (hard) ---------- */
r.delete('/:id', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { error } = await sb.from('organizations').delete().eq('id', req.params.id);
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendNoContent(res);
});

/* ---------- Archive / Restore (soft) ---------- */
r.post('/:id/archive', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { error } = await sb.from('organizations').update({ is_archived: true }).eq('id', req.params.id);
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, { ok:true });
});
r.post('/:id/restore', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { error } = await sb.from('organizations').update({ is_archived: false }).eq('id', req.params.id);
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, { ok:true });
});

/* ---------- Tags ---------- */
r.post('/:id/tags', async (req:any,res)=>{
  const tags = tagsSchema.safeParse(req.body?.tags);
  if (!tags.success) return sendErr(res, 'BAD_REQUEST', 'Invalid tags', undefined, 400);
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { data, error } = await sb.from('organizations').update({ tags: tags.data }).eq('id', req.params.id).select('tags').single();
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data);
});

/* ---------- Favorites (pin) ---------- */
r.post('/:id/favorite', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const uid = req.user!.id;
  const { error } = await sb.from('organization_favorites').upsert({ user_id: uid, org_id: req.params.id });
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, { ok:true });
});
r.delete('/:id/favorite', async (req:any,res)=>{
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const uid = req.user!.id;
  const { error } = await sb.from('organization_favorites').delete().eq('user_id', uid).eq('org_id', req.params.id);
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, { ok:true });
});

/* ---------- Logo upload sign ---------- */
function safeName(name:string){ if (name.includes('..')||name.startsWith('/')||name.includes('\\')) throw new Error('invalid_name'); return name.replace(/[^a-zA-Z0-9._-]/g,'_'); }
r.post('/:id/logo/sign', async (req:any,res)=>{
  try{
    const { fileName } = req.body||{};
    if (!fileName) return sendErr(res, 'BAD_REQUEST', 'fileName required', undefined, 400);
    const key = `org/${req.params.id}/branding/${safeName(fileName)}`;
    const { data, error } = await supabaseAdmin.storage.from('app').createSignedUploadUrl(key, { upsert:true });
    if (error || !data?.signedUrl) return sendErr(res, 'BAD_REQUEST', error?.message || 'sign error', undefined, 400);
    return sendOk(res, { uploadUrl: data.signedUrl, key });
  }catch(e:any){ return sendErr(res, 'BAD_REQUEST', e?.message || 'sign error', undefined, 400); }
});
r.post('/:id/logo/apply', async (req:any,res)=>{
  const key = req.body?.key; if(!key) return sendErr(res, 'BAD_REQUEST', 'key required', undefined, 400);
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const { data, error } = await sb.from('organizations').update({ logo_url: key }).eq('id', req.params.id).select('logo_url').single();
  if (error) return sendErr(res, 'BAD_REQUEST', error.message, undefined, 400);
  return sendOk(res, data);
});

export default r;