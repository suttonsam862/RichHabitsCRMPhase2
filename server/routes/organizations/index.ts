import express from 'express';
import { z } from 'zod';
import { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationDTO } from '@shared/dtos/OrganizationDTO';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '@shared/schema';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';

// Explicit column selection for consistent API responses
const cols = {
  id: organizations.id,
  name: organizations.name,
  status: organizations.status,
  logo_url: organizations.logoUrl,
  title_card_url: organizations.titleCardUrl,
  created_at: organizations.createdAt,
  updated_at: organizations.updatedAt,
};

function dbToDto(row: any): any {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    logoUrl: row.logo_url,
    titleCardUrl: row.title_card_url,
    createdAt: row.created_at?.toISOString?.() ?? null,
    updatedAt: row.updated_at?.toISOString?.() ?? null,
  };
}

const router = express.Router();

// Debug endpoint to check available columns - MUST be before /:id route
router.get('/__columns', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: Object.keys(organizations)
  });
}));

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
  if (q && typeof q === 'string' && q.trim()) {
    conditions.push(ilike(organizations.name, `%${q.trim()}%`));
  }
  
  // State filter
  if (state && state !== 'any') {
    conditions.push(eq(organizations.state, state as string));
  }
  
  // Type filter
  if (type && type !== 'all') {
    if (type === 'business') {
      conditions.push(eq(organizations.isBusiness, true));
    } else if (type === 'school') {
      conditions.push(eq(organizations.isBusiness, false));
    }
  }

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results with explicit column selection
    const results = await db
      .select(cols)
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(organizations.createdAt))
      .limit(pageSizeNum)
      .offset(offset);

    // Map database rows to DTOs
    const data = results.map(dbToDto);

    // Return response envelope
    res.json({
      success: true,
      data,
      count: total
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
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
      .select(cols)
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Not found'
      });
    }

    const data = dbToDto(result[0]);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
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
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.status(201).json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create organization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Update organization
router.patch('/:id',
  validateRequest({ body: UpdateOrganizationDTO }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const result = await db
        .update(organizations)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }

      res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({
        success: false,
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
        success: false,
        error: 'Organization not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export { router as organizationsRouter };