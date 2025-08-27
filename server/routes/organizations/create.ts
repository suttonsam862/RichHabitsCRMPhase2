import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { logSbError } from '../../lib/dbLog.js';

const router = Router();

const OrgSchema = z.object({
  name: z.string().min(2),
  brand_primary: z.string().regex(/^#/),
  brand_secondary: z.string().regex(/^#/),
  is_business: z.boolean().optional(),
  sports: z.array(z.object({
    sport: z.string(),
    contact_user_id: z.string().uuid().nullable().optional()
  })).optional()
});

router.post('/', async (req, res) => {
  const parsed = OrgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const payload = parsed.data;

  const orgRes = await supabaseAdmin
    .from('organizations')
    .insert({
      name: payload.name,
      brand_primary: payload.brand_primary,
      brand_secondary: payload.brand_secondary,
      is_business: payload.is_business ?? false,
      status: 'active'
    })
    .select('id')
    .single();

  if (orgRes.error) {
    logSbError(req, 'orgs.create.insert', orgRes.error);
    return res.status(400).json({ error: orgRes.error });
  }

  if (payload.sports?.length) {
    const rows = payload.sports.map(s => ({
      org_id: orgRes.data!.id,
      sport: s.sport,
      contact_user_id: s.contact_user_id ?? null
    }));
    const sportRes = await supabaseAdmin.from('org_sports').insert(rows);
    if (sportRes.error) {
      logSbError(req, 'orgs.create.sports', sportRes.error);
      return res.status(400).json({ error: sportRes.error });
    }
  }

  return res.json({ success: true, data: { id: orgRes.data!.id } });
});

export default router;