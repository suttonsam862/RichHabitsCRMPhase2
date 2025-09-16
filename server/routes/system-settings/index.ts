import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { systemSettings } from '../../../shared/schema';
import { eq, like, and, sql } from 'drizzle-orm';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { sendSuccess, sendOk, sendCreated, sendNoContent, sendErr } from '../../lib/http';

const router = express.Router();

// Validation schemas
const createSystemSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.any(),
  dataType: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateSystemSettingSchema = createSystemSettingSchema.partial();

// GET /api/v1/system-settings - List all system settings with optional filtering
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { 
      category = '', 
      search = '', 
      isActive = '',
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    
    if (category && typeof category === 'string') {
      conditions.push(eq(systemSettings.category, category));
    }
    
    if (search && typeof search === 'string') {
      conditions.push(like(systemSettings.key, `%${search}%`));
    }
    
    if (isActive === 'true') {
      conditions.push(eq(systemSettings.isActive, true));
    } else if (isActive === 'false') {
      conditions.push(eq(systemSettings.isActive, false));
    }

    const baseQuery = db.select().from(systemSettings);
    const settings = await (conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery
    )
      .orderBy(systemSettings.category, systemSettings.key)
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const countQuery = db.select({ count: sql`count(*)` }).from(systemSettings);
    const [{ count }] = await (conditions.length > 0
      ? countQuery.where(and(...conditions))
      : countQuery
    );

    return sendSuccess(res, {
      settings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: settings.length,
        totalPages: Math.ceil(Number(count) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing system settings:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch system settings', undefined, 500);
  }
});

// GET /api/v1/system-settings/categories - Get all categories
router.get('/categories', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const categories = await db.selectDistinct({ category: systemSettings.category })
      .from(systemSettings)
      .where(eq(systemSettings.isActive, true));

    return sendOk(res, categories.map(c => c.category));
  } catch (error) {
    console.error('Error fetching setting categories:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch setting categories', undefined, 500);
  }
});

// GET /api/v1/system-settings/by-key/:category/:key - Get setting by category and key
router.get('/by-key/:category/:key', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { category, key } = req.params;

    const [setting] = await db.select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.category, category),
        eq(systemSettings.key, key),
        eq(systemSettings.isActive, true)
      ))
      .limit(1);

    if (!setting) {
      return sendErr(res, 'NOT_FOUND', 'System setting not found', undefined, 404);
    }

    return sendOk(res, setting);
  } catch (error) {
    console.error('Error fetching system setting by key:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch system setting', undefined, 500);
  }
});

// GET /api/v1/system-settings/:id - Get single system setting
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    const [setting] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.id, id))
      .limit(1);

    if (!setting) {
      return sendErr(res, 'NOT_FOUND', 'System setting not found', undefined, 404);
    }

    return sendOk(res, setting);
  } catch (error) {
    console.error('Error fetching system setting:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to fetch system setting', undefined, 500);
  }
});

// POST /api/v1/system-settings - Create new system setting
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const validation = createSystemSettingSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid system setting data', validation.error.errors, 400);
    }

    const settingData = validation.data;

    // Check for duplicate category/key combination
    const [existingSetting] = await db.select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.category, settingData.category),
        eq(systemSettings.key, settingData.key)
      ))
      .limit(1);

    if (existingSetting) {
      return sendErr(res, 'DUPLICATE_KEY', 'System setting with this category and key already exists', undefined, 400);
    }

    const [newSetting] = await db.insert(systemSettings)
      .values({
        category: settingData.category,
        key: settingData.key,
        value: settingData.value,
        dataType: settingData.dataType,
        description: settingData.description,
        isActive: settingData.isActive
      })
      .returning();

    return sendCreated(res, newSetting);
  } catch (error) {
    console.error('Error creating system setting:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to create system setting', undefined, 500);
  }
});

// PATCH /api/v1/system-settings/:id - Update system setting
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const validation = updateSystemSettingSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid system setting data', validation.error.errors, 400);
    }

    const updateData = validation.data;

    // Check if setting exists
    const [existingSetting] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.id, id))
      .limit(1);

    if (!existingSetting) {
      return sendErr(res, 'NOT_FOUND', 'System setting not found', undefined, 404);
    }

    // Check for duplicate category/key if they're being updated
    if ((updateData.category || updateData.key) && 
        (updateData.category !== existingSetting.category || updateData.key !== existingSetting.key)) {
      
      const [duplicateSetting] = await db.select()
        .from(systemSettings)
        .where(and(
          eq(systemSettings.category, updateData.category || existingSetting.category),
          eq(systemSettings.key, updateData.key || existingSetting.key)
        ))
        .limit(1);

      if (duplicateSetting && duplicateSetting.id !== id) {
        return sendErr(res, 'DUPLICATE_KEY', 'System setting with this category and key already exists', undefined, 400);
      }
    }

    const [updatedSetting] = await db.update(systemSettings)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(systemSettings.id, id))
      .returning();

    return sendOk(res, updatedSetting);
  } catch (error) {
    console.error('Error updating system setting:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to update system setting', undefined, 500);
  }
});

// DELETE /api/v1/system-settings/:id - Delete system setting
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if setting exists
    const [existingSetting] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.id, id))
      .limit(1);

    if (!existingSetting) {
      return sendErr(res, 'NOT_FOUND', 'System setting not found', undefined, 404);
    }

    await db.delete(systemSettings)
      .where(eq(systemSettings.id, id));

    return sendNoContent(res);
  } catch (error) {
    console.error('Error deleting system setting:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to delete system setting', undefined, 500);
  }
});

// POST /api/v1/system-settings/bulk - Bulk update system settings
router.post('/bulk', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const bulkUpdateSchema = z.object({
      settings: z.array(z.object({
        category: z.string().min(1).max(50),
        key: z.string().min(1).max(100),
        value: z.any(),
        dataType: z.enum(['string', 'number', 'boolean', 'json']).default('string')
      }))
    });

    const validation = bulkUpdateSchema.safeParse(req.body);

    if (!validation.success) {
      return sendErr(res, 'VALIDATION_ERROR', 'Invalid bulk update data', validation.error.errors, 400);
    }

    const { settings } = validation.data;

    // Process each setting (upsert logic)
    const results = [];
    
    for (const setting of settings) {
      // Check if setting exists
      const [existing] = await db.select()
        .from(systemSettings)
        .where(and(
          eq(systemSettings.category, setting.category),
          eq(systemSettings.key, setting.key)
        ))
        .limit(1);

      if (existing) {
        // Update existing
        const [updated] = await db.update(systemSettings)
          .set({
            value: setting.value,
            dataType: setting.dataType,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.id, existing.id))
          .returning();
        
        results.push(updated);
      } else {
        // Create new
        const [created] = await db.insert(systemSettings)
          .values({
            category: setting.category,
            key: setting.key,
            value: setting.value,
            dataType: setting.dataType
          })
          .returning();
        
        results.push(created);
      }
    }

    return sendOk(res, results);
  } catch (error) {
    console.error('Error bulk updating system settings:', error);
    return sendErr(res, 'INTERNAL_ERROR', 'Failed to bulk update system settings', undefined, 500);
  }
});

export default router;