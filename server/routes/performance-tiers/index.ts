import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { performanceTiers } from '../../../shared/schema';
import { eq, like, and, desc } from 'drizzle-orm';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr } from '../../lib/http';

const router = express.Router();

// Validation schemas
const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  commissionMultiplier: z.number().min(0.1).max(10.0).default(1.0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0)
});

const updateTierSchema = createTierSchema.partial();

// GET /api/v1/performance-tiers - List all performance tiers
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { 
      search = '', 
      isActive = '',
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    
    if (search && typeof search === 'string') {
      conditions.push(like(performanceTiers.name, `%${search}%`));
    }
    
    if (isActive === 'true') {
      conditions.push(eq(performanceTiers.isActive, true));
    } else if (isActive === 'false') {
      conditions.push(eq(performanceTiers.isActive, false));
    }

    const baseQuery = db.select().from(performanceTiers);
    const tiers = await (conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery
    )
      .orderBy(performanceTiers.sortOrder, performanceTiers.name)
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const countQuery = db.select({ count: performanceTiers.id }).from(performanceTiers);
    const [{ count }] = await (conditions.length > 0
      ? countQuery.where(and(...conditions))
      : countQuery
    );

    return sendSuccess(res, {
      tiers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: tiers.length,
        totalPages: Math.ceil(Number(count) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing performance tiers:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch performance tiers', undefined, 500);
  }
});

// GET /api/v1/performance-tiers/:id - Get single performance tier
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    const [tier] = await db.select()
      .from(performanceTiers)
      .where(eq(performanceTiers.id, id))
      .limit(1);

    if (!tier) {
      return sendErr(res, 'NOT_FOUND', 'Performance tier not found', undefined, 404);
    }

    return sendOk(res, tier);
  } catch (error) {
    console.error('Error fetching performance tier:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch performance tier', undefined, 500);
  }
});

// POST /api/v1/performance-tiers - Create new performance tier
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const validation = createTierSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid performance tier data', validation.error.errors, 400);
    }

    const tierData = validation.data;

    // Check for duplicate slug
    const [existingTier] = await db.select()
      .from(performanceTiers)
      .where(eq(performanceTiers.slug, tierData.slug))
      .limit(1);

    if (existingTier) {
      return sendErr(res, 'DUPLICATE_SLUG', 'Performance tier slug already exists', undefined, 400);
    }

    const [newTier] = await db.insert(performanceTiers)
      .values({
        name: tierData.name,
        slug: tierData.slug,
        description: tierData.description,
        commissionMultiplier: tierData.commissionMultiplier.toString(),
        isActive: tierData.isActive,
        sortOrder: tierData.sortOrder
      })
      .returning();

    return sendCreated(res, newTier);
  } catch (error) {
    console.error('Error creating performance tier:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to create performance tier', undefined, 500);
  }
});

// PATCH /api/v1/performance-tiers/:id - Update performance tier
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const validation = updateTierSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid performance tier data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if tier exists
    const [existingTier] = await db.select()
      .from(performanceTiers)
      .where(eq(performanceTiers.id, id))
      .limit(1);

    if (!existingTier) {
      return sendErr(res, 'NOT_FOUND', 'Performance tier not found', undefined, 404);
    }

    // Check for duplicate slug if slug is being updated
    if (updateData.slug && updateData.slug !== existingTier.slug) {
      const [duplicateTier] = await db.select()
        .from(performanceTiers)
        .where(eq(performanceTiers.slug, updateData.slug))
        .limit(1);

      if (duplicateTier) {
        return sendErr(res, 'DUPLICATE_SLUG', 'Performance tier slug already exists', undefined, 400);
      }
    }

    const updatePayload = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Convert commission multiplier to string for decimal storage
    if (updateData.commissionMultiplier !== undefined) {
      updatePayload.commissionMultiplier = updateData.commissionMultiplier.toString();
    }

    const [updatedTier] = await db.update(performanceTiers)
      .set(updatePayload)
      .where(eq(performanceTiers.id, id))
      .returning();

    return sendOk(res, updatedTier);
  } catch (error) {
    console.error('Error updating performance tier:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update performance tier', undefined, 500);
  }
});

// DELETE /api/v1/performance-tiers/:id - Delete performance tier
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if tier exists
    const [existingTier] = await db.select()
      .from(performanceTiers)
      .where(eq(performanceTiers.id, id))
      .limit(1);

    if (!existingTier) {
      return sendErr(res, 'NOT_FOUND', 'Performance tier not found', undefined, 404);
    }

    await db.delete(performanceTiers)
      .where(eq(performanceTiers.id, id));

    return sendNoContent(res);
  } catch (error) {
    console.error('Error deleting performance tier:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete performance tier', undefined, 500);
  }
});

// POST /api/v1/performance-tiers/:id/toggle - Toggle tier active status
router.post('/:id/toggle', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if tier exists
    const [existingTier] = await db.select()
      .from(performanceTiers)
      .where(eq(performanceTiers.id, id))
      .limit(1);

    if (!existingTier) {
      return sendErr(res, 'NOT_FOUND', 'Performance tier not found', undefined, 404);
    }

    const [updatedTier] = await db.update(performanceTiers)
      .set({
        isActive: !existingTier.isActive,
        updatedAt: new Date().toISOString()
      })
      .where(eq(performanceTiers.id, id))
      .returning();

    return sendOk(res, updatedTier);
  } catch (error) {
    console.error('Error toggling performance tier status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to toggle performance tier status', undefined, 500);
  }
});

// POST /api/v1/performance-tiers/reorder - Reorder performance tiers
router.post('/reorder', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const reorderSchema = z.object({
      tierIds: z.array(z.string().uuid())
    });

    const validation = reorderSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid reorder data', validation.error.errors, 400);
    }

    const { tierIds } = validation.data;

    // Update sort order for each tier
    const updates = tierIds.map(async (tierId, index) => {
      return db.update(performanceTiers)
        .set({
          sortOrder: index,
          updatedAt: new Date().toISOString()
        })
        .where(eq(performanceTiers.id, tierId));
    });

    await Promise.all(updates);

    // Return updated tiers in new order
    const updatedTiers = await db.select()
      .from(performanceTiers)
      .orderBy(performanceTiers.sortOrder);

    return sendOk(res, updatedTiers);
  } catch (error) {
    console.error('Error reordering performance tiers:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to reorder performance tiers', undefined, 500);
  }
});

export default router;