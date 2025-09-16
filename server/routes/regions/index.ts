import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { systemRegions } from '../../../shared/schema';
import { eq, like, and, desc } from 'drizzle-orm';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr } from '../../lib/http';

const router = express.Router();

// Validation schemas
const createRegionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
  country: z.string().default('US'),
  isActive: z.boolean().default(true)
});

const updateRegionSchema = createRegionSchema.partial();

// GET /api/v1/regions - List all regions with optional filtering
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { 
      search = '', 
      country = '', 
      isActive = '',
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    
    if (search && typeof search === 'string') {
      conditions.push(like(systemRegions.name, `%${search}%`));
    }
    
    if (country && typeof country === 'string') {
      conditions.push(eq(systemRegions.country, country));
    }
    
    if (isActive === 'true') {
      conditions.push(eq(systemRegions.isActive, true));
    } else if (isActive === 'false') {
      conditions.push(eq(systemRegions.isActive, false));
    }

    const baseQuery = db.select().from(systemRegions);
    const regions = await (conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery
    )
      .orderBy(systemRegions.name)
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination  
    const countQuery = db.select({ count: systemRegions.id }).from(systemRegions);
    const [{ count }] = await (conditions.length > 0
      ? countQuery.where(and(...conditions))
      : countQuery
    );

    return sendSuccess(res, {
      regions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: regions.length,
        totalPages: Math.ceil(Number(count) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing regions:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch regions', undefined, 500);
  }
});

// GET /api/v1/regions/:id - Get single region
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    const [region] = await db.select()
      .from(systemRegions)
      .where(eq(systemRegions.id, id))
      .limit(1);

    if (!region) {
      return sendErr(res, 'NOT_FOUND', 'Region not found', undefined, 404);
    }

    return sendOk(res, region);
  } catch (error) {
    console.error('Error fetching region:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch region', undefined, 500);
  }
});

// POST /api/v1/regions - Create new region
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const validation = createRegionSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid region data', validation.error.errors, 400);
    }

    const regionData = validation.data;

    // Check for duplicate code
    const [existingRegion] = await db.select()
      .from(systemRegions)
      .where(eq(systemRegions.code, regionData.code))
      .limit(1);

    if (existingRegion) {
      return sendErr(res, 'DUPLICATE_CODE', 'Region code already exists', undefined, 400);
    }

    const [newRegion] = await db.insert(systemRegions)
      .values({
        name: regionData.name,
        code: regionData.code,
        country: regionData.country,
        isActive: regionData.isActive
      })
      .returning();

    return sendCreated(res, newRegion);
  } catch (error) {
    console.error('Error creating region:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to create region', undefined, 500);
  }
});

// PATCH /api/v1/regions/:id - Update region
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const validation = updateRegionSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid region data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if region exists
    const [existingRegion] = await db.select()
      .from(systemRegions)
      .where(eq(systemRegions.id, id))
      .limit(1);

    if (!existingRegion) {
      return sendErr(res, 'NOT_FOUND', 'Region not found', undefined, 404);
    }

    // Check for duplicate code if code is being updated
    if (updateData.code && updateData.code !== existingRegion.code) {
      const [duplicateRegion] = await db.select()
        .from(systemRegions)
        .where(eq(systemRegions.code, updateData.code))
        .limit(1);

      if (duplicateRegion) {
        return sendErr(res, 'DUPLICATE_CODE', 'Region code already exists', undefined, 400);
      }
    }

    const [updatedRegion] = await db.update(systemRegions)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(systemRegions.id, id))
      .returning();

    return sendOk(res, updatedRegion);
  } catch (error) {
    console.error('Error updating region:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update region', undefined, 500);
  }
});

// DELETE /api/v1/regions/:id - Delete region
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if region exists
    const [existingRegion] = await db.select()
      .from(systemRegions)
      .where(eq(systemRegions.id, id))
      .limit(1);

    if (!existingRegion) {
      return sendErr(res, 'NOT_FOUND', 'Region not found', undefined, 404);
    }

    await db.delete(systemRegions)
      .where(eq(systemRegions.id, id));

    return sendNoContent(res);
  } catch (error) {
    console.error('Error deleting region:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete region', undefined, 500);
  }
});

// POST /api/v1/regions/:id/toggle - Toggle region active status
router.post('/:id/toggle', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if region exists
    const [existingRegion] = await db.select()
      .from(systemRegions)
      .where(eq(systemRegions.id, id))
      .limit(1);

    if (!existingRegion) {
      return sendErr(res, 'NOT_FOUND', 'Region not found', undefined, 404);
    }

    const [updatedRegion] = await db.update(systemRegions)
      .set({
        isActive: !existingRegion.isActive,
        updatedAt: new Date().toISOString()
      })
      .where(eq(systemRegions.id, id))
      .returning();

    return sendOk(res, updatedRegion);
  } catch (error) {
    console.error('Error toggling region status:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to toggle region status', undefined, 500);
  }
});

export default router;