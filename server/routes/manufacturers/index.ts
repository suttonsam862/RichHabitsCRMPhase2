/**
 * Manufacturer Management API Routes
 * Handles CRUD operations for manufacturers and their capabilities
 */

import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../../db';
import { manufacturers } from '@shared/schema';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';

const router = Router();

// Validation schemas
const createManufacturerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minimumOrderQuantity: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

const updateManufacturerSchema = createManufacturerSchema.partial();

// GET /api/v1/manufacturers - List all manufacturers with filters
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { 
      search, 
      specialty,
      isActive = 'true',
      limit = '50', 
      offset = '0' 
    } = req.query;

    let query = db
      .select()
      .from(manufacturers)
      .$dynamic();

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(manufacturers.name, `%${search}%`),
          ilike(manufacturers.contactEmail, `%${search}%`),
          ilike(manufacturers.city, `%${search}%`)
        )
      );
    }

    if (specialty) {
      // Using PostgreSQL array contains operator
      conditions.push(
        sql`${manufacturers.specialties} @> ARRAY[${specialty}]::text[]`
      );
    }

    if (isActive !== 'all') {
      conditions.push(eq(manufacturers.isActive, isActive === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination
    query = query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(manufacturers.name);

    const results = await query;

    res.json(results);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  }
});

// GET /api/v1/manufacturers/:id - Get single manufacturer
router.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [manufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id));

    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }

    res.json(manufacturer);
  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturer' });
  }
});

// POST /api/v1/manufacturers - Create new manufacturer
router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = createManufacturerSchema.parse(req.body);

    // Check if manufacturer with same name exists
    const [existingManufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.name, validatedData.name));

    if (existingManufacturer) {
      return res.status(400).json({ error: 'Manufacturer with this name already exists' });
    }

    const [newManufacturer] = await db
      .insert(manufacturers)
      .values({
        ...validatedData,
        isActive: validatedData.isActive ?? true
      })
      .returning();

    res.status(201).json(newManufacturer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating manufacturer:', error);
    res.status(500).json({ error: 'Failed to create manufacturer' });
  }
});

// PATCH /api/v1/manufacturers/:id - Update manufacturer
router.patch('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateManufacturerSchema.parse(req.body);

    // Check if manufacturer exists
    const [existingManufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id));

    if (!existingManufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingManufacturer.name) {
      const [duplicateManufacturer] = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.name, validatedData.name));

      if (duplicateManufacturer) {
        return res.status(400).json({ error: 'Manufacturer with this name already exists' });
      }
    }

    const [updatedManufacturer] = await db
      .update(manufacturers)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(manufacturers.id, id))
      .returning();

    res.json(updatedManufacturer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating manufacturer:', error);
    res.status(500).json({ error: 'Failed to update manufacturer' });
  }
});

// DELETE /api/v1/manufacturers/:id - Delete manufacturer (soft delete)
router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const [updatedManufacturer] = await db
      .update(manufacturers)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(manufacturers.id, id))
      .returning();

    if (!updatedManufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }

    res.json({ message: 'Manufacturer deactivated successfully', manufacturer: updatedManufacturer });
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    res.status(500).json({ error: 'Failed to delete manufacturer' });
  }
});

// GET /api/v1/manufacturers/specialties - Get all unique specialties
router.get('/meta/specialties', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const allManufacturers = await db.select({ specialties: manufacturers.specialties }).from(manufacturers);
    
    // Extract unique specialties
    const specialtySet = new Set<string>();
    allManufacturers.forEach(manufacturer => {
      if (manufacturer.specialties) {
        manufacturer.specialties.forEach(spec => specialtySet.add(spec));
      }
    });

    const uniqueSpecialties = Array.from(specialtySet).sort();
    res.json(uniqueSpecialties);
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

export default router;