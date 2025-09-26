/**
 * Catalog Management API Routes
 * Handles CRUD operations for catalog items, categories, and manufacturer relationships
 */

import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../../db';
import { catalogItems, catalogItemImages, catalogItemManufacturers, categories, manufacturers, sports } from '@shared/schema';
import { eq, sql, and, inArray, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';

const router = Router();

// Validation schemas
const createCatalogItemSchema = z.object({
  name: z.string().min(1),
  orgId: z.string().uuid().optional(),
  sportId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.string().or(z.number()).transform(val => String(val)),
  turnaroundDays: z.number().optional(),
  fabric: z.string().optional(),
  buildInstructions: z.string().optional(),
  moq: z.number().optional(),
  embellishmentsJson: z.any().optional(),
  colorwaysJson: z.any().optional(),
  care: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  manufacturerIds: z.array(z.string().uuid()).optional()
});

const updateCatalogItemSchema = createCatalogItemSchema.partial();

// GET /api/v1/catalog - List all catalog items with filters
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { 
      search, 
      sportId, 
      categoryId, 
      manufacturerId,
      minPrice,
      maxPrice,
      page = '1', 
      limit = '20' 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(ilike(catalogItems.name, `%${search}%`));
    }
    if (sportId) {
      conditions.push(eq(catalogItems.sportId, sportId as string));
    }
    if (categoryId) {
      conditions.push(eq(catalogItems.categoryId, categoryId as string));
    }
    if (minPrice) {
      conditions.push(sql`${catalogItems.basePrice} >= ${minPrice}`);
    }
    if (maxPrice) {
      conditions.push(sql`${catalogItems.basePrice} <= ${maxPrice}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get catalog items with related data
    const items = await db
      .select({
        catalogItem: catalogItems,
        category: categories,
        sport: sports
      })
      .from(catalogItems)
      .leftJoin(categories, eq(catalogItems.categoryId, categories.id))
      .leftJoin(sports, eq(catalogItems.sportId, sports.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(catalogItems.createdAt);

    // Get manufacturer relationships
    const itemIds = items.map(item => item.catalogItem.id);
    const manufacturerRelations = itemIds.length > 0 
      ? await db
          .select({
            catalogItemId: catalogItemManufacturers.catalogItemId,
            manufacturer: manufacturers
          })
          .from(catalogItemManufacturers)
          .innerJoin(manufacturers, eq(catalogItemManufacturers.manufacturerId, manufacturers.id))
          .where(inArray(catalogItemManufacturers.catalogItemId, itemIds))
      : [];

    // Group manufacturers by catalog item
    const manufacturersByItem = manufacturerRelations.reduce((acc, rel) => {
      if (!acc[rel.catalogItemId]) {
        acc[rel.catalogItemId] = [];
      }
      acc[rel.catalogItemId].push(rel.manufacturer);
      return acc;
    }, {} as Record<string, typeof manufacturers.$inferSelect[]>);

    // Combine results
    const result = items.map(item => ({
      ...item.catalogItem,
      category: item.category,
      sport: item.sport,
      manufacturers: manufacturersByItem[item.catalogItem.id] || []
    }));

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(catalogItems)
      .where(whereClause);

    res.setHeader('X-Total-Count', String(count));
    res.json(result);
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    res.status(500).json({ error: 'Failed to fetch catalog items' });
  }
});

// GET /api/v1/catalog/:id - Get single catalog item with full details
router.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [item] = await db
      .select({
        catalogItem: catalogItems,
        category: categories,
        sport: sports
      })
      .from(catalogItems)
      .leftJoin(categories, eq(catalogItems.categoryId, categories.id))
      .leftJoin(sports, eq(catalogItems.sportId, sports.id))
      .where(eq(catalogItems.id, id));

    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    // Get manufacturers
    const itemManufacturers = await db
      .select({ manufacturer: manufacturers })
      .from(catalogItemManufacturers)
      .innerJoin(manufacturers, eq(catalogItemManufacturers.manufacturerId, manufacturers.id))
      .where(eq(catalogItemManufacturers.catalogItemId, id));

    // Get images
    const images = await db
      .select()
      .from(catalogItemImages)
      .where(eq(catalogItemImages.catalogItemId, id))
      .orderBy(catalogItemImages.position);

    const result = {
      ...item.catalogItem,
      category: item.category,
      sport: item.sport,
      manufacturers: itemManufacturers.map(m => m.manufacturer),
      images
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching catalog item:', error);
    res.status(500).json({ error: 'Failed to fetch catalog item' });
  }
});

// POST /api/v1/catalog - Create new catalog item
router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = createCatalogItemSchema.parse(req.body);
    const { manufacturerIds, ...catalogData } = validatedData;

    // Create catalog item
    const [newItem] = await db
      .insert(catalogItems)
      .values({
        ...catalogData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Add manufacturer relationships
    if (manufacturerIds && manufacturerIds.length > 0) {
      await db.insert(catalogItemManufacturers).values(
        manufacturerIds.map(mId => ({
          catalogItemId: newItem.id,
          manufacturerId: mId
        }))
      );
    }

    res.status(201).json(newItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating catalog item:', error);
    res.status(500).json({ error: 'Failed to create catalog item' });
  }
});

// PATCH /api/v1/catalog/:id - Update catalog item
router.patch('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateCatalogItemSchema.parse(req.body);
    const { manufacturerIds, ...catalogData } = validatedData;

    // Update catalog item
    const [updatedItem] = await db
      .update(catalogItems)
      .set({
        ...catalogData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(catalogItems.id, id))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    // Update manufacturer relationships if provided
    if (manufacturerIds !== undefined) {
      // Delete existing relationships
      await db
        .delete(catalogItemManufacturers)
        .where(eq(catalogItemManufacturers.catalogItemId, id));

      // Add new relationships
      if (manufacturerIds.length > 0) {
        await db.insert(catalogItemManufacturers).values(
          manufacturerIds.map(mId => ({
            catalogItemId: id,
            manufacturerId: mId
          }))
        );
      }
    }

    res.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating catalog item:', error);
    res.status(500).json({ error: 'Failed to update catalog item' });
  }
});

// DELETE /api/v1/catalog/:id - Delete catalog item
router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete related data first
    await db.delete(catalogItemManufacturers).where(eq(catalogItemManufacturers.catalogItemId, id));
    await db.delete(catalogItemImages).where(eq(catalogItemImages.catalogItemId, id));

    // Delete catalog item
    const [deletedItem] = await db
      .delete(catalogItems)
      .where(eq(catalogItems.id, id))
      .returning();

    if (!deletedItem) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    res.json({ message: 'Catalog item deleted successfully' });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ error: 'Failed to delete catalog item' });
  }
});

// GET /api/v1/catalog/categories - List all categories
router.get('/meta/categories', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const allCategories = await db.select().from(categories).orderBy(categories.name);
    res.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/v1/catalog/categories - Create category
router.post('/meta/categories', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({ name })
      .returning();

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;