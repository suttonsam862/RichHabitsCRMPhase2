import express from 'express';
import { z } from 'zod';
import { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationDTO } from '@shared/dtos/OrganizationDTO';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '@shared/schema';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';
import { sendSuccess, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';

// DTO <-> DB field mappings for camelCase <-> snake_case conversion
const DTO_TO_DB_MAPPING = {
  brandPrimary: 'brand_primary',
  brandSecondary: 'brand_secondary',
  emailDomain: 'email_domain', 
  billingEmail: 'billing_email',
  colorPalette: 'color_palette',
  universalDiscounts: 'universal_discounts',
  logoUrl: 'logo_url',
  titleCardUrl: 'title_card_url',
  addressLine1: 'address_line_1',
  addressLine2: 'address_line_2',
  postalCode: 'postal_code',
  contactEmail: 'contact_email',
  isBusiness: 'is_business',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

// Helper to map DB row to DTO
function dbRowToDto(row: any): any {
  if (!row) return null;

  const mapped = mapDbToDto(row, DTO_TO_DB_MAPPING);
  
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    city: row.city,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    website: row.website,
    country: row.country,
    status: row.is_business ? 'Business' : 'School',
    ...mapped,
    // Ensure arrays and objects are properly handled
    colorPalette: row.color_palette || [],
    universalDiscounts: row.universal_discounts || {},
  };
}

// Validate colorPalette colors (hex or HSL)
function validateColorPalette(colors: string[]): boolean {
  return colors.every(color => 
    /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color) || // hex: #RGB or #RRGGBB
    /^\d+\s+\d+%\s+\d+%$/.test(color) // HSL: H S% L%
  );
}

const router = express.Router();

// Debug endpoint to check available columns - MUST be before /:id route
router.get('/__columns', asyncHandler(async (req, res) => {
  sendSuccess(res, Object.keys(organizations));
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

    // Get paginated results
    const results = await db
      .select()
      .from(organizations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(organizations.createdAt))
      .limit(pageSizeNum)
      .offset(offset);

    // Map database rows to DTOs
    const data = results.map(dbRowToDto);

    sendSuccess(res, data, total);
  } catch (error) {
    handleDatabaseError(res, error, 'list organizations');
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
      return HttpErrors.notFound(res, 'Organization not found');
    }

    const mappedOrg = dbRowToDto(result[0]);
    sendSuccess(res, mappedOrg);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch organization');
  }
}));

// Create new organization
router.post('/', 
  validateRequest({ body: CreateOrganizationDTO }),
  asyncHandler(async (req, res) => {
    const validatedData = req.body;

    try {
      // Validate colorPalette if provided
      if (validatedData.colorPalette && validatedData.colorPalette.length > 0) {
        if (!validateColorPalette(validatedData.colorPalette)) {
          return HttpErrors.validationError(res, 
            'Invalid colorPalette: colors must be hex (#RGB or #RRGGBB) or HSL format (H S% L%)')
        }
        if (validatedData.colorPalette.length > 12) {
          return HttpErrors.validationError(res, 'colorPalette cannot have more than 12 colors');
        }
      }

      // Map DTO fields to DB fields using helper
      const mappedData = mapDtoToDb(validatedData, DTO_TO_DB_MAPPING);
      
      // Prepare the organization data with proper field mapping
      const now = new Date();
      const orgData = {
        name: validatedData.name,
        state: validatedData.state || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        city: validatedData.city || null,
        notes: validatedData.notes || null,
        website: validatedData.website || null,
        country: validatedData.country || 'United States',
        status: 'active',
        created_at: now,
        updated_at: now,
        // Mapped fields
        ...mappedData,
        // Ensure proper defaults
        universal_discounts: validatedData.universalDiscounts || {},
        color_palette: validatedData.colorPalette || [],
        brand_primary: validatedData.brandPrimary || '#3B82F6',
        brand_secondary: validatedData.brandSecondary || '#8B5CF6',
        is_business: validatedData.isBusiness || false,
        // Handle address fallback
        address_line_1: validatedData.addressLine1 || validatedData.address || null,
      };

      const result = await db
        .insert(organizations)
        .values(orgData)
        .returning();

      const createdOrg = result[0];
      let createdUser = null;

      // Create owner user if requested
      if (validatedData.createOwnerUser && validatedData.userEmail && validatedData.userFullName) {
        try {
          const userResult = await db.execute(sql`
            INSERT INTO users (email, full_name, phone)
            VALUES (${validatedData.userEmail}, ${validatedData.userFullName}, ${validatedData.userPhone || null})
            ON CONFLICT (email) DO UPDATE SET 
              full_name = EXCLUDED.full_name,
              phone = EXCLUDED.phone,
              updated_at = NOW()
            RETURNING id, email, full_name, phone
          `);
          
          createdUser = userResult.rows[0];

          // Assign owner role
          const ownerRoleResult = await db.execute(sql`
            SELECT id FROM roles WHERE slug = 'owner' LIMIT 1
          `);

          if (ownerRoleResult.rows.length > 0) {
            await db.execute(sql`
              INSERT INTO user_roles (user_id, org_id, role_id)
              VALUES (${createdUser.id}, ${createdOrg.id}, ${ownerRoleResult.rows[0].id})
              ON CONFLICT (user_id, org_id, role_id) DO NOTHING
            `);
          }
        } catch (userError) {
          console.warn('Failed to create user or assign role:', userError);
        }
      }

      // Create sports contacts
      if (validatedData.sports && validatedData.sports.length > 0) {
        try {
          for (const sport of validatedData.sports) {
            await db.execute(sql`
              INSERT INTO org_sports (organization_id, sport_id, contact_name, contact_email, contact_phone)
              VALUES (${createdOrg.id}, ${sport.sportId}, ${sport.contactName}, ${sport.contactEmail}, ${sport.contactPhone || null})
            `);
          }
        } catch (sportsError) {
          console.warn('Failed to create sports contacts:', sportsError);
        }
      }

      const responseData = {
        organization: dbRowToDto(createdOrg),
        user: createdUser,
        sportsCount: validatedData.sports?.length || 0
      };
      
      sendSuccess(res, responseData, undefined, 201);
    } catch (error) {
      handleDatabaseError(res, error, 'create organization');
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
      // Validate colorPalette if provided
      if (updateData.colorPalette && updateData.colorPalette.length > 0) {
        if (!validateColorPalette(updateData.colorPalette)) {
          return HttpErrors.validationError(res, 
            'Invalid colorPalette: colors must be hex (#RGB or #RRGGBB) or HSL format (H S% L%)')
        }
        if (updateData.colorPalette.length > 12) {
          return HttpErrors.validationError(res, 'colorPalette cannot have more than 12 colors');
        }
      }

      // Map DTO fields to DB fields
      const mappedData = mapDtoToDb(updateData, DTO_TO_DB_MAPPING);
      
      const result = await db
        .update(organizations)
        .set({
          ...mappedData,
          updated_at: new Date()
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'Organization not found');
      }

      const mappedResult = dbRowToDto(result[0]);
      sendSuccess(res, mappedResult);
    } catch (error) {
      handleDatabaseError(res, error, 'update organization');
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
      return HttpErrors.notFound(res, 'Organization not found');
    }

    res.status(204).send();
  } catch (error) {
    handleDatabaseError(res, error, 'delete organization');
  }
}));

export { router as organizationsRouter };