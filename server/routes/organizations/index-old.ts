
import express from 'express';
import { z } from 'zod';
import { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationDTO } from '@shared/dtos/OrganizationDTO';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '../../../shared/schema';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';

// Cache for available database columns
let availableColumns: Set<string> | null = null;
let columnDetectionLogged = false;

// Required columns that must exist
const REQUIRED_COLUMNS = ['id', 'name', 'created_at'];

// Preferred columns for better display
const PREFERRED_COLUMNS = ['status', 'logo_url', 'title_card_url'];

// Optional columns to include if available
const OPTIONAL_COLUMNS = [
  'email', 'phone', 'address_line1', 'city', 'state', 'zip', 'updated_at', 'universal_discounts'
];

async function getAvailableOrgColumns(): Promise<Set<string>> {
  if (availableColumns) return availableColumns;
  
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND table_schema = 'public'
    `);
    
    // Defensive check for rows
    const rows = (result as any)?.rows;
    if (!rows || !Array.isArray(rows)) {
      throw new Error('Invalid result structure from information_schema query');
    }
    
    availableColumns = new Set(rows.map((row: any) => row.column_name));
    console.log('Available org columns:', Array.from(availableColumns));
    return availableColumns;
  } catch (error) {
    // Log once and return empty set on any error
    if (!columnDetectionLogged) {
      console.warn('Org column detection unavailable; using minimal set');
      columnDetectionLogged = true;
    }
    
    availableColumns = new Set([]);
    return availableColumns;
  }
}

function dbToDto(row: any): any {
  if (!row) return null;
  
  const dto: any = {};
  
  // Always include required fields
  dto.id = row.id;
  dto.name = row.name;
  
  // Convert dates to ISO string format, coerce properly
  if (row.created_at) {
    dto.createdAt = new Date(row.created_at).toISOString();
  } else if (row.createdAt) {
    dto.createdAt = new Date(row.createdAt).toISOString();
  }
  
  // Map snake_case -> camelCase conversion
  const fieldMap: Record<string, string> = {
    'address_line1': 'addressLine1',
    'logo_url': 'logoUrl',
    'title_card_url': 'titleCardUrl',
    'updated_at': 'updatedAt',
    'universal_discounts': 'universalDiscounts'
  };
  
  // Add fields that exist in row and are not undefined, drop undefined
  Object.keys(row).forEach(key => {
    if (row[key] !== undefined && key !== 'id' && key !== 'name' && key !== 'created_at' && key !== 'createdAt') {
      const dtoKey = fieldMap[key] || key;
      if (key === 'updated_at' && row[key]) {
        dto[dtoKey] = new Date(row[key]).toISOString();
      } else {
        dto[dtoKey] = row[key];
      }
    }
  });
  
  return dto;
}

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

  // Build order by
  const sortField = sort === 'name' ? organizations.name : organizations.createdAt;

  try {
    // Get available columns and build select fields
    const availableCols = await getAvailableOrgColumns();
    const selectColumns: any = {};
    
    // Always include required columns
    REQUIRED_COLUMNS.forEach(col => {
      if (availableCols.has(col)) {
        selectColumns[col] = organizations[col as keyof typeof organizations];
      }
    });
    
    // Include optional columns that exist
    OPTIONAL_COLUMNS.forEach(col => {
      if (availableCols.has(col)) {
        selectColumns[col] = organizations[col as keyof typeof organizations];
      }
    });

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results with dynamic column selection
    const results = await db
      .select(selectColumns)
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`created_at DESC NULLS LAST`)
      .limit(pageSizeNum)
      .offset(offset);

    // Map database rows to DTOs
    const data = results.map(dbToDto);

    res.json({
      success: true,
      data,
      count: total
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    
    // Fallback: try with minimal required columns only
    try {
      const minimalResults = await db
        .select({
          id: organizations.id,
          name: organizations.name, 
          created_at: organizations.createdAt
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(pageSizeNum)
        .offset(offset);

      const minimalCount = await db
        .select({ count: sql`count(*)` })
        .from(organizations);

      const data = minimalResults.map(dbToDto);
      
      res.json({
        success: true,
        data,
        count: Number(minimalCount[0]?.count || 0),
        warning: 'reduced shape - some columns unavailable'
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      res.json({
        success: true,
        data: [],
        count: 0,
        warning: 'database query failed - returning empty result'
      });
    }
  }
}));

// Get organization by ID  
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get available columns and build select fields
    const availableCols = await getAvailableOrgColumns();
    const selectColumns: any = {};
    
    // Always include required columns
    REQUIRED_COLUMNS.forEach(col => {
      if (availableCols.has(col)) {
        selectColumns[col] = organizations[col as keyof typeof organizations];
      }
    });
    
    // Include optional columns that exist
    OPTIONAL_COLUMNS.forEach(col => {
      if (availableCols.has(col)) {
        selectColumns[col] = organizations[col as keyof typeof organizations];
      }
    });

    const results = await db
      .select(selectColumns)
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    const data = dbToDto(results[0]);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    
    // Fallback: try with minimal required columns only
    try {
      const minimalResults = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          created_at: organizations.createdAt
        })
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      if (minimalResults.length === 0) {
        return res.status(404).json({
          error: 'Organization not found'
        });
      }

      const data = dbToDto(minimalResults[0]);
      
      res.json({
        success: true,
        data,
        warning: 'reduced shape - some columns unavailable'
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      res.status(404).json({
        error: 'Organization not found'
      });
    }
  }
}));

// Delete organization by ID
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const results = await db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id });

    if (results.length === 0) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      id: results[0].id
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      error: 'Failed to delete organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Debug endpoint for column information
router.get('/__columns', asyncHandler(async (req, res) => {
  try {
    const availableCols = await getAvailableOrgColumns();
    res.json({
      success: true,
      data: {
        columns: Array.from(availableCols),
        required: REQUIRED_COLUMNS,
        optional: OPTIONAL_COLUMNS
      }
    });
  } catch (error) {
    console.error('Error getting columns:', error);
    res.status(500).json({
      error: 'Failed to get column information'
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

// Debug endpoint to check available columns
router.get('/__columns', asyncHandler(async (req, res) => {
  const columns = await getAvailableOrgColumns();
  res.json({
    columns: Array.from(columns).sort(),
    required: REQUIRED_COLUMNS,
    optional: OPTIONAL_COLUMNS
  });
}));

export { router as organizationsRouter };
