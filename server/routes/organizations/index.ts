
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

// Required columns that must exist
const REQUIRED_COLUMNS = ['id', 'name', 'created_at'];

// Optional columns to include if available
const OPTIONAL_COLUMNS = [
  'address', 'phone', 'email', 'notes', 'state', 'logo_url', 'is_business',
  'universal_discounts', 'title_card_url', 'brand_primary', 'brand_secondary', 
  'updated_at', 'address_line1', 'address_line2', 'city', 'postal_code',
  'contact_email', 'billing_email', 'email_domain', 'website', 'country', 'status'
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
    
    availableColumns = new Set(
      (result as any).rows.map((row: any) => row.column_name)
    );
    console.log('Available org columns:', Array.from(availableColumns));
    return availableColumns;
  } catch (error) {
    console.warn('Could not detect org columns:', error);
    // Fallback to required columns only
    availableColumns = new Set(REQUIRED_COLUMNS);
    return availableColumns;
  }
}

function dbToDto(row: any): any {
  const dto: any = {};
  
  // Always include required fields
  dto.id = row.id;
  dto.name = row.name;
  dto.createdAt = row.created_at || row.createdAt;
  
  // Map optional fields with snake_case -> camelCase conversion
  const fieldMap: Record<string, string> = {
    'address_line1': 'addressLine1',
    'address_line2': 'addressLine2', 
    'postal_code': 'postalCode',
    'contact_email': 'contactEmail',
    'billing_email': 'billingEmail',
    'email_domain': 'emailDomain',
    'logo_url': 'logoUrl',
    'is_business': 'isBusiness',
    'title_card_url': 'titleCardUrl',
    'brand_primary': 'brandPrimary',
    'brand_secondary': 'brandSecondary',
    'updated_at': 'updatedAt',
    'universal_discounts': 'universalDiscounts'
  };
  
  // Add fields that exist in row and are not undefined
  Object.keys(row).forEach(key => {
    if (row[key] !== undefined && key !== 'id' && key !== 'name' && key !== 'created_at') {
      const dtoKey = fieldMap[key] || key;
      dto[dtoKey] = row[key];
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
        .orderBy(sql`created_at DESC NULLS LAST`)
        .limit(pageSizeNum)
        .offset(offset);

      const data = minimalResults.map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at
      }));

      res.json({
        success: true,
        data,
        count: minimalResults.length,
        warning: 'Some columns missing - using minimal data set'
      });
    } catch (fallbackError) {
      res.status(500).json({
        error: 'Failed to fetch organizations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
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
