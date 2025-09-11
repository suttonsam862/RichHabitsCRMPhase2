/**
 * Designer Management API Routes
 * Handles CRUD operations for designers and their specializations
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../../db';
import { designers, users } from '@shared/schema';
import { eq, sql, and, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';

const router = Router();

// Validation schemas
const createDesignerSchema = z.object({
  userId: z.string().uuid(),
  specializations: z.array(z.string()).optional(),
  portfolioUrl: z.string().url().optional(),
  hourlyRate: z.string().optional(),
  isActive: z.boolean().optional()
});

const updateDesignerSchema = createDesignerSchema.partial();

// GET /api/v1/designers - List all designers with filters
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { 
      search, 
      specialization,
      isActive = 'true',
      limit = '50', 
      offset = '0' 
    } = req.query;

    let query = db
      .select({
        designer: designers,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone
        }
      })
      .from(designers)
      .leftJoin(users, eq(designers.userId, users.id))
      .$dynamic();

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (specialization) {
      conditions.push(
        sql`${designers.specializations} @> ARRAY[${specialization}]::text[]`
      );
    }

    if (isActive !== 'all') {
      conditions.push(eq(designers.isActive, isActive === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination
    query = query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(designers.createdAt);

    const results = await query;

    // Format response
    const formattedResults = results.map(row => ({
      id: row.designer.id,
      userId: row.designer.userId,
      name: row.user?.fullName || 'Unknown',
      email: row.user?.email,
      phone: row.user?.phone,
      specializations: row.designer.specializations || [],
      portfolioUrl: row.designer.portfolioUrl,
      hourlyRate: row.designer.hourlyRate,
      isActive: row.designer.isActive,
      createdAt: row.designer.createdAt,
      updatedAt: row.designer.updatedAt
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Error fetching designers:', error);
    res.status(500).json({ error: 'Failed to fetch designers' });
  }
});

// GET /api/v1/designers/:id - Get single designer with full details
router.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await db
      .select({
        designer: designers,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone
        }
      })
      .from(designers)
      .leftJoin(users, eq(designers.userId, users.id))
      .where(eq(designers.id, id));

    if (!result) {
      return res.status(404).json({ error: 'Designer not found' });
    }

    const formattedResult = {
      id: result.designer.id,
      userId: result.designer.userId,
      name: result.user?.fullName || 'Unknown',
      email: result.user?.email,
      phone: result.user?.phone,
      specializations: result.designer.specializations || [],
      portfolioUrl: result.designer.portfolioUrl,
      hourlyRate: result.designer.hourlyRate,
      isActive: result.designer.isActive,
      createdAt: result.designer.createdAt,
      updatedAt: result.designer.updatedAt
    };

    res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching designer:', error);
    res.status(500).json({ error: 'Failed to fetch designer' });
  }
});

// POST /api/v1/designers - Create new designer
router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = createDesignerSchema.parse(req.body);

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId));

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check if designer already exists for this user
    const [existingDesigner] = await db
      .select()
      .from(designers)
      .where(eq(designers.userId, validatedData.userId));

    if (existingDesigner) {
      return res.status(400).json({ error: 'Designer profile already exists for this user' });
    }

    const [newDesigner] = await db
      .insert(designers)
      .values({
        ...validatedData,
        isActive: validatedData.isActive ?? true
      })
      .returning();

    res.status(201).json(newDesigner);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating designer:', error);
    res.status(500).json({ error: 'Failed to create designer' });
  }
});

// PATCH /api/v1/designers/:id - Update designer
router.patch('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateDesignerSchema.parse(req.body);

    // Check if designer exists
    const [existingDesigner] = await db
      .select()
      .from(designers)
      .where(eq(designers.id, id));

    if (!existingDesigner) {
      return res.status(404).json({ error: 'Designer not found' });
    }

    const [updatedDesigner] = await db
      .update(designers)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(designers.id, id))
      .returning();

    res.json(updatedDesigner);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating designer:', error);
    res.status(500).json({ error: 'Failed to update designer' });
  }
});

// DELETE /api/v1/designers/:id - Delete designer (soft delete by setting isActive to false)
router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const [updatedDesigner] = await db
      .update(designers)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(designers.id, id))
      .returning();

    if (!updatedDesigner) {
      return res.status(404).json({ error: 'Designer not found' });
    }

    res.json({ message: 'Designer deactivated successfully', designer: updatedDesigner });
  } catch (error) {
    console.error('Error deleting designer:', error);
    res.status(500).json({ error: 'Failed to delete designer' });
  }
});

// GET /api/v1/designers/specializations - Get all unique specializations
router.get('/meta/specializations', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const allDesigners = await db.select({ specializations: designers.specializations }).from(designers);
    
    // Extract unique specializations
    const specializationSet = new Set<string>();
    allDesigners.forEach(designer => {
      if (designer.specializations) {
        designer.specializations.forEach(spec => specializationSet.add(spec));
      }
    });

    const uniqueSpecializations = Array.from(specializationSet).sort();
    res.json(uniqueSpecializations);
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ error: 'Failed to fetch specializations' });
  }
});

export default router;