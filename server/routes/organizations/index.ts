
import express from 'express';
import { z } from 'zod';
import { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationDTO } from '@shared/dtos';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '../../../shared/schema';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';

const router = express.Router();

// List all organizations with filtering, sorting, and pagination
router.get('/', asyncHandler(async (req, res) => {
  const {
    q = '',
    state,
    type = 'all',
    sort = 'created_at',
    order = 'desc',
    page = '1',
    pageSize = '20'
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const pageSizeNum = parseInt(pageSize as string) || 20;
  const offset = (pageNum - 1) * pageSizeNum;

  // Build where conditions
  const conditions = [];
  
  // Search query
  if (q && q.trim()) {
    conditions.push(ilike(organizations.name, `%${q.trim()}%`));
  }
  
  // State filter
  if (state && state !== 'any') {
    conditions.push(eq(organizations.state, state as string));
  }
  
  // Type filter
  if (type && type !== 'all') {
    if (type === 'business') {
      conditions.push(eq(organizations.is_business, true));
    } else if (type === 'school') {
      conditions.push(eq(organizations.is_business, false));
    }
  }

  // Build order by
  const sortField = sort === 'name' ? organizations.name : organizations.created_at;
  const orderDirection = order === 'asc' ? asc : desc;

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const results = await db
      .select()
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderDirection(sortField))
      .limit(pageSizeNum)
      .offset(offset);

    const totalPages = Math.ceil(total / pageSizeNum);

    res.json({
      items: results,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      error: 'Failed to fetch organizations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get organization by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      error: 'Failed to fetch organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Create new organization
router.post('/', 
  validateRequest({ body: CreateOrganizationDTO }),
  asyncHandler(async (req, res) => {
    const orgData = req.body;
    
    try {
      const result = await db
        .insert(organizations)
        .values({
          ...orgData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();

      res.status(201).json({
        ok: true,
        organization: result[0]
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({
        error: 'Failed to create organization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Update organization
router.put('/:id',
  validateRequest({ body: UpdateOrganizationDTO }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    try {
      const result = await db
        .update(organizations)
        .set({
          ...updateData,
          updated_at: new Date()
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          error: 'Organization not found'
        });
      }

      res.json({
        ok: true,
        organization: result[0]
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({
        error: 'Failed to update organization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Delete organization
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      error: 'Failed to delete organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export { router as organizationsRouter };
