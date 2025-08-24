import { Router } from 'express';
import { db } from '../../db';
import { organizations, orgSports } from '../../../shared/schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { CreateOrganizationDTO } from '../../../shared/dtos/OrganizationDTO';
import { eq } from 'drizzle-orm';

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
    const { sports: sportIds, ...orgData } = validation.data;
    const dataToInsert = { ...orgData, createdBy: userId };
    const newOrg = await db.transaction(async (tx) => {
        const [insertedOrg] = await tx.insert(organizations).values(dataToInsert).returning();
        if (sportIds && sportIds.length > 0) {
            const orgSportsData = sportIds.map((sport: any) => ({ organizationId: insertedOrg.id, sportId: sport.sportId || sport }));
            await tx.insert(orgSports).values(orgSportsData);
        }
        return insertedOrg;
    });
    res.status(201).json(newOrg);
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) { return res.status(404).json({ message: 'Organization not found or you do not have permission to view it.' }); }
    res.status(200).json(org);
}));
export default router;