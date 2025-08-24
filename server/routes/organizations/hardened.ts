import { Router } from 'express';
import { db } from '../../db';
import { organizations, orgSports } from '../../../shared/schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { CreateOrganizationDTO } from '../../../shared/dtos/OrganizationDTO';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

class BadRequestError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'BadRequestError';
  }
}
const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(async (req, res) => {
    const orgs = await db.select().from(organizations);
    res.status(200).json(orgs);
}));
router.post('/', asyncHandler(async (req, res) => {
    const userId = (req as any).user?.id;
    if (!userId) { throw new BadRequestError('User ID not found on authenticated request.'); }
    const validation = CreateOrganizationDTO.safeParse(req.body);
    if (!validation.success) { throw new BadRequestError('Invalid organization data', validation.error.flatten().fieldErrors); }
    const { sports: sportData, ...orgData } = validation.data;

    // Use supabaseAdmin for writes to bypass RLS
    if (!supabaseAdmin) {
        throw new Error('Supabase admin client not available');
    }

    // Insert organization using supabaseAdmin
    const orgRes = await supabaseAdmin
        .from('organizations')
        .insert({
            ...orgData,
            created_by: userId,
            status: 'active',
            brand_primary: orgData.brandPrimary || null,
            brand_secondary: orgData.brandSecondary || null,
        })
        .select('*')
        .single();

    if (orgRes.error) {
        throw new BadRequestError(`Failed to create organization: ${orgRes.error.message}`);
    }

    // Insert org_sports if provided
    if (sportData && sportData.length > 0) {
        const orgSportsData = sportData.map((sport: any) => ({
            organization_id: orgRes.data.id,
            sport_id: sport.sportId || sport,
            contact_name: sport.contactName || '',
            contact_email: sport.contactEmail || '',
            contact_phone: sport.contactPhone || '',
            contact_user_id: sport.contactUserId || null
        }));

        const sportRes = await supabaseAdmin
            .from('org_sports')
            .insert(orgSportsData);

        if (sportRes.error) {
            // Attempt to rollback by deleting the organization
            await supabaseAdmin.from('organizations').delete().eq('id', orgRes.data.id);
            throw new BadRequestError(`Failed to create organization sports: ${sportRes.error.message}`);
        }
    }

    res.status(201).json(orgRes.data);
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) { return res.status(404).json({ message: 'Organization not found or you do not have permission to view it.' }); }
    res.status(200).json(org);
}));
export default router;