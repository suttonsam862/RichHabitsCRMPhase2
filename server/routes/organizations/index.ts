import express from 'express';
import { z } from 'zod';
import { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationDTO } from '@shared/dtos/OrganizationDTO';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../../db';
import { organizations } from '@shared/schema';
import { sql, eq, and, or, ilike, desc, asc } from 'drizzle-orm';
import { listBrandingFiles } from '../../lib/storage';
import { sendSuccess, sendOk, sendErr, HttpErrors, handleDatabaseError, mapDtoToDb, mapDbToDto } from '../../lib/http';

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

    sendOk(res, data, total);
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
    sendOk(res, mappedOrg);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch organization');
  }
}));

// Get organization summary with branding, contacts/sports, and users
router.get('/:id/summary', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Get organization basic info
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (orgResult.length === 0) {
      return HttpErrors.notFound(res, 'Organization not found');
    }

    const organization = dbRowToDto(orgResult[0]);

    // Get branding files
    let brandingFiles: any[] = [];
    try {
      brandingFiles = await listBrandingFiles(id);
    } catch (error) {
      console.warn('Failed to load branding files:', error);
      // Continue without branding files rather than failing the whole request
    }

    // Get sports contacts
    const sportsContacts = await db.execute(sql`
      SELECT 
        os.id,
        os.sport_id,
        os.contact_name,
        os.contact_email,
        os.contact_phone,
        os.contact_user_id,
        s.name as sport_name,
        s.emoji as sport_emoji,
        u.full_name as contact_user_full_name,
        u.email as contact_user_email
      FROM org_sports os
      LEFT JOIN sports s ON os.sport_id = s.id
      LEFT JOIN users u ON os.contact_user_id = u.id
      WHERE os.organization_id = ${id}
      ORDER BY s.name
    `);

    // Get organization users with roles
    const orgUsers = await db.execute(sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.avatar_url,
        u.is_active,
        u.last_login,
        COALESCE(
          json_agg(
            CASE WHEN r.id IS NOT NULL THEN
              json_build_object(
                'id', r.id,
                'name', r.name,
                'slug', r.slug,
                'description', r.description
              )
            END
          ) FILTER (WHERE r.id IS NOT NULL), 
          '[]'::json
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.org_id = ${id}
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id IN (
        SELECT DISTINCT user_id 
        FROM user_roles 
        WHERE org_id = ${id}
      )
      GROUP BY u.id, u.email, u.full_name, u.phone, u.avatar_url, u.is_active, u.last_login
      ORDER BY u.full_name, u.email
    `);

    // Format sports contacts  
    const sports = (sportsContacts as any).map((contact: any) => ({
      id: contact.id,
      sportId: contact.sport_id,
      sportName: contact.sport_name,
      sportEmoji: contact.sport_emoji,
      contactName: contact.contact_name,
      contactEmail: contact.contact_email,
      contactPhone: contact.contact_phone,
      contactUserId: contact.contact_user_id,
      contactUserFullName: contact.contact_user_full_name,
      contactUserEmail: contact.contact_user_email
    }));

    // Format users
    const users = (orgUsers as any).map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      lastLogin: user.last_login ? new Date(user.last_login).toISOString() : null,
      roles: user.roles || []
    }));

    // Get summary stats
    const stats = {
      sportsCount: sports.length,
      usersCount: users.length,
      brandingFilesCount: brandingFiles.length,
      activeUsersCount: users.filter((u: any) => u.isActive).length
    };

    const summary = {
      organization,
      brandingFiles,
      sports,
      users,
      stats
    };

    sendOk(res, summary);
  } catch (error) {
    handleDatabaseError(res, error, 'fetch organization summary');
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
          
          createdUser = (userResult as any)[0];

          // Assign owner role
          const ownerRoleResult = await db.execute(sql`
            SELECT id FROM roles WHERE slug = 'owner' LIMIT 1
          `);

          if ((ownerRoleResult as any).length > 0) {
            await db.execute(sql`
              INSERT INTO user_roles (user_id, org_id, role_id)
              VALUES (${createdUser.id}, ${createdOrg.id}, ${(ownerRoleResult as any)[0].id})
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
      
      sendOk(res, responseData, undefined, 201);
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
          updatedAt: new Date().toISOString()
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return HttpErrors.notFound(res, 'Organization not found');
      }

      const mappedResult = dbRowToDto(result[0]);
      sendOk(res, mappedResult);
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