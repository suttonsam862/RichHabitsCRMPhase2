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
  isBusiness: z.boolean().default(false),
  brandPrimary: color,
  brandSecondary: color,
  colorPalette: colorPalette.default([]),
  emailDomain: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  billingEmail: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  tags: tagsSchema.default([]),
  sports: z.array(z.object({
    sportId: z.string().uuid(),
    contactName: z.string().min(2).max(100),
    contactEmail: z.string().email()
  })).default([])
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  brandPrimary: color.optional(),
  brandSecondary: color.optional(),
  colorPalette: colorPalette.optional(),
  emailDomain: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  billingEmail: z.string().email().optional().or(z.literal('').transform(()=>undefined)),
  tags: tagsSchema.optional(),
  isBusiness: z.boolean().optional()
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
  if (!parse.success) return sendErr(res, 'BAD_REQUEST', 'Invalid org payload', parse.error.flatten(), 400);
  const uid = req.user!.id;
  const sb = supabaseForUser(req.headers.authorization?.slice(7));
  const p = parse.data;

  // insert organization
  const gradient = gradientFrom(p.brandPrimary, p.brandSecondary);
  const { data: org, error: orgErr } = await sb.from('organizations').insert([{
    name: p.name,
    is_business: p.isBusiness,
    brand_primary: p.brandPrimary,
    brand_secondary: p.brandSecondary,
    color_palette: p.colorPalette,
    email_domain: p.emailDomain,
    billing_email: p.billingEmail,
    tags: p.tags,
    gradient_css: gradient
  }]).select().single();
  if (orgErr) return sendErr(res, 'BAD_REQUEST', orgErr.message, undefined, 400);

  // auto-create coach users & user_roles for regular orgs with sports contacts
  for (const s of p.sports){
    // create or locate auth user by email
    const { data: existing, error: gErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (gErr) return sendErr(res, 'BAD_REQUEST', gErr.message, undefined, 400);
    let coachId = existing?.users?.find(u => u.email === s.contactEmail)?.id;
    if (!coachId){
      const create = await supabaseAdmin.auth.admin.createUser({
        email: s.contactEmail, email_confirm: false,
        user_metadata: { full_name: s.contactName, desired_role: 'customer' }
      });
      if (create.error || !create.data?.user) return sendErr(res, 'BAD_REQUEST', create.error?.message || 'Unable to create contact user', undefined, 400);
      coachId = create.data.user.id;
    }
    // add org_sports entry
    const { error: osErr } = await sb.from('org_sports').insert([{
      organization_id: org.id, sport_id: s.sportId,
      contact_name: s.contactName, contact_email: s.contactEmail, contact_user_id: coachId
    }]);
    if (osErr) return sendErr(res, 'BAD_REQUEST', osErr.message, undefined, 400);
    // assign Customer role scoped to this org
    const { data: roles } = await supabaseAdmin.from('roles').select('id,slug');
    const customer = roles?.find(r=>r.slug==='customer')?.id;
    if (customer) {
      await supabaseAdmin.from('user_roles').upsert({ user_id: coachId, org_id: org.id, role_id: customer }, { onConflict: 'user_id,org_id,role_id' });
    }
  }

  return sendOk(res, org);
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
  if (body.data.isBusiness !== undefined) payload.is_business = body.data.isBusiness;
  if (body.data.brandPrimary) payload.brand_primary = body.data.brandPrimary;
  if (body.data.brandSecondary) payload.brand_secondary = body.data.brandSecondary;
  if (body.data.colorPalette) payload.color_palette = body.data.colorPalette;
  if (body.data.emailDomain !== undefined) payload.email_domain = body.data.emailDomain;
  if (body.data.billingEmail !== undefined) payload.billing_email = body.data.billingEmail;
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