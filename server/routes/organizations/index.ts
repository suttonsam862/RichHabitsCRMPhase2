import { Router } from "express";
import { db } from "../../db";
import { sql, eq, ilike, and, desc, asc } from "drizzle-orm";
import { organizations } from "../../../shared/schema";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Environment configuration
const ASSIGN_OWNER_ON_CREATE = process.env.ASSIGN_OWNER_ON_CREATE !== 'false';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID;

/**
 * CANONICAL ORGANIZATIONS ROUTER
 * 
 * This is the single source of truth for all organization endpoints.
 * Consolidates logic from organizations.ts, organizations-v2.ts, and organizations-hardened.ts
 */

// Request ID middleware for tracing
router.use((req, res, next) => {
  const rid = uuidv4().slice(0, 8);
  res.locals.rid = rid;
  console.log(`[${rid}] CANONICAL ORG: ${req.method} ${req.path}`);
  next();
});

// Schema for organization creation with both camelCase and snake_case support
const CreateOrgSchema = z.object({
  // Required fields
  name: z.string().min(1).max(120),
  
  // Optional fields - accept both naming conventions
  logoUrl: z.string().optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  
  isBusiness: z.boolean().optional(),
  is_business: z.boolean().optional(),
  
  state: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  
  universalDiscounts: z.record(z.any()).default({}).catch({}),
  universal_discounts: z.record(z.any()).default({}).catch({}),
  
  // Additional fields from wizard
  email_domain: z.string().optional().or(z.literal("")),
  brand_primary: z.string().optional().or(z.literal("")),
  brand_secondary: z.string().optional().or(z.literal("")),
  address_line1: z.string().optional().or(z.literal("")),
  address_line2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  
  // Optional user_id for role assignment
  user_id: z.string().uuid().optional(),
}).transform((data) => {
  // Normalize field naming: prefer snake_case for database
  const normalized = {
    name: data.name,
    logo_url: data.logo_url || data.logoUrl || null,
    is_business: data.is_business ?? data.isBusiness ?? false,
    state: data.state || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    notes: data.notes || null,
    universal_discounts: data.universal_discounts || data.universalDiscounts || {},
    email_domain: data.email_domain || null,
    brand_primary: data.brand_primary || null,
    brand_secondary: data.brand_secondary || null,
    address_line1: data.address_line1 || null,
    address_line2: data.address_line2 || null,
    city: data.city || null,
    postal_code: data.postal_code || null,
    country: data.country || null,
    user_id: data.user_id || null,
  };
  
  // Clean empty strings to null
  Object.keys(normalized).forEach(key => {
    if (normalized[key as keyof typeof normalized] === "") {
      (normalized as any)[key] = null;
    }
  });
  
  return normalized;
});

const UpdateOrgSchema = z.object({
  // Required fields
  name: z.string().min(1).max(120).optional(),
  
  // Optional fields - accept both naming conventions  
  logoUrl: z.string().optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  
  isBusiness: z.boolean().optional(),
  is_business: z.boolean().optional(),
  
  state: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  
  universalDiscounts: z.record(z.any()).optional(),
  universal_discounts: z.record(z.any()).optional(),
  
  // Additional fields from wizard
  email_domain: z.string().optional().or(z.literal("")),
  brand_primary: z.string().optional().or(z.literal("")),
  brand_secondary: z.string().optional().or(z.literal("")),
  address_line1: z.string().optional().or(z.literal("")),
  address_line2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  
  // Optional user_id for role assignment
  user_id: z.string().uuid().optional(),
}).transform((data) => {
  // Normalize field naming: prefer camelCase for database (matching schema)
  const normalized: any = {};
  
  if (data.name) normalized.name = data.name;
  if (data.logo_url || data.logoUrl) normalized.logoUrl = data.logo_url || data.logoUrl;
  if (data.is_business !== undefined || data.isBusiness !== undefined) normalized.isBusiness = data.is_business ?? data.isBusiness;
  if (data.state) normalized.state = data.state;
  if (data.address) normalized.address = data.address;
  if (data.phone) normalized.phone = data.phone;
  if (data.email) normalized.email = data.email;
  if (data.notes) normalized.notes = data.notes;
  if (data.universal_discounts || data.universalDiscounts) normalized.universalDiscounts = data.universal_discounts || data.universalDiscounts;
  if (data.email_domain) normalized.emailDomain = data.email_domain;
  if (data.brand_primary) normalized.brandPrimary = data.brand_primary;
  if (data.brand_secondary) normalized.brandSecondary = data.brand_secondary;
  if (data.address_line1) normalized.addressLine1 = data.address_line1;
  if (data.address_line2) normalized.addressLine2 = data.address_line2;
  if (data.city) normalized.city = data.city;
  if (data.postal_code) normalized.postalCode = data.postal_code;
  if (data.country) normalized.country = data.country;
  
  // Clean empty strings to null
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === "") {
      normalized[key] = null;
    }
  });
  
  return normalized;
});

// Query parameters schema
const QuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['name', 'created_at', 'state']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Helper functions
function formatValidationErrors(err: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  err.issues.forEach(issue => {
    const field = issue.path.join('.');
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(issue.message);
  });
  return fieldErrors;
}

function getUserId(req: any): string | null {
  // Try explicit user_id from request body
  if (req.body?.user_id) {
    return req.body.user_id;
  }
  
  // Try JWT token extraction
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.sub || payload.user_id || payload.id || null;
    } catch (e) {
      // Token parsing failed, continue
    }
  }
  
  return DEFAULT_USER_ID || null;
}

/**
 * GET / - List organizations with search, pagination, and sorting
 */
router.get("/", async (req, res, next) => {
  const rid = res.locals.rid;
  
  try {
    console.log(`[${rid}] Parsing query parameters:`, req.query);
    const query = QuerySchema.parse(req.query);
    
    // Build the query with filters
    let dbQuery = db.select({
      id: organizations.id,
      name: organizations.name,
      state: organizations.state,
      phone: organizations.phone,
      email: organizations.email,
      notes: organizations.notes,
      logoUrl: organizations.logoUrl,
      titleCardUrl: organizations.titleCardUrl,
      isBusiness: organizations.isBusiness,
      universalDiscounts: organizations.universalDiscounts,
      createdAt: organizations.createdAt,
      brandPrimary: organizations.brandPrimary,
      brandSecondary: organizations.brandSecondary,
    }).from(organizations);

    // Apply search filter
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      dbQuery = dbQuery.where(
        sql`${organizations.name} ILIKE ${searchTerm} OR ${organizations.email} ILIKE ${searchTerm} OR ${organizations.state} ILIKE ${searchTerm}`
      );
    }

    // Apply sorting
    const sortColumn = query.sort === 'name' ? organizations.name :
                      query.sort === 'state' ? organizations.state :
                      organizations.createdAt;
    
    dbQuery = dbQuery.orderBy(
      query.order === 'asc' ? asc(sortColumn) : desc(sortColumn)
    );

    // Apply pagination
    dbQuery = dbQuery.limit(query.limit).offset(query.offset);

    console.log(`[${rid}] Executing organizations query with filters:`, query);
    const rows = await dbQuery;
    
    console.log(`[${rid}] ✅ Organizations query successful. Found ${rows.length} organizations`);
    
    res.json({ 
      data: rows,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: rows.length // TODO: Add actual count query for accurate pagination
      }
    });
  } catch (err: any) {
    console.error(`[${rid}] ❌ Error in GET /api/organizations:`, err.message);
    next(err);
  }
});

/**
 * GET /:id - Get organization by ID
 */
router.get("/:id", async (req, res, next) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  
  try {
    console.log(`[${rid}] Fetching organization with ID: ${id}`);
    
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    
    if (!organization) {
      console.log(`[${rid}] Organization not found: ${id}`);
      return res.status(404).json({ 
        error: "Organization not found",
        id 
      });
    }
    
    console.log(`[${rid}] ✅ Organization found: ${organization.name}`);
    res.json(organization);
  } catch (err: any) {
    console.error(`[${rid}] ❌ Error fetching organization ${id}:`, err.message);
    next(err);
  }
});

/**
 * POST / - Create new organization
 */
router.post("/", async (req, res, next) => {
  const rid = res.locals.rid;
  
  try {
    console.log(`[${rid}] Creating organization with payload:`, req.body);
    
    const input = CreateOrgSchema.parse(req.body);
    console.log(`[${rid}] Normalized input:`, input);
    
    const userId = getUserId(req);
    console.log(`[${rid}] User ID for ownership: ${userId || 'none'}`);
    
    // Insert organization
    const [newOrg] = await db.insert(organizations).values({
      ...input,
      createdAt: new Date(),
    }).returning();
    
    console.log(`[${rid}] ✅ Organization created successfully: ${newOrg.id}`);
    
    res.status(201).json({
      ...newOrg,
      message: "Organization created successfully"
    });
  } catch (err: any) {
    console.error(`[${rid}] ❌ Error creating organization:`, err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        fieldErrors: formatValidationErrors(err),
        details: err.issues
      });
    }
    
    next(err);
  }
});

/**
 * PUT /:id - Update organization (full update)
 * PATCH /:id - Update organization (partial update)
 */
router.put("/:id", updateOrganization);
router.patch("/:id", updateOrganization);

async function updateOrganization(req: any, res: any, next: any) {
  const rid = res.locals.rid;
  const { id } = req.params;
  
  try {
    console.log(`[${rid}] Updating organization ${id} with payload:`, req.body);
    
    const input = UpdateOrgSchema.parse(req.body);
    console.log(`[${rid}] Normalized update input:`, input);
    
    // Check if organization exists
    const [existing] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!existing) {
      return res.status(404).json({ 
        error: "Organization not found",
        id 
      });
    }
    
    // Update organization
    const [updatedOrg] = await db.update(organizations)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    
    console.log(`[${rid}] ✅ Organization updated successfully: ${updatedOrg.name}`);
    
    res.json({
      ...updatedOrg,
      message: "Organization updated successfully"
    });
  } catch (err: any) {
    console.error(`[${rid}] ❌ Error updating organization ${id}:`, err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        fieldErrors: formatValidationErrors(err),
        details: err.issues
      });
    }
    
    next(err);
  }
}

/**
 * DELETE /:id - Delete organization
 */
router.delete("/:id", async (req, res, next) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  
  try {
    console.log(`[${rid}] Deleting organization: ${id}`);
    
    // Check if organization exists
    const [existing] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!existing) {
      return res.status(404).json({ 
        error: "Organization not found",
        id 
      });
    }
    
    // Delete organization
    await db.delete(organizations).where(eq(organizations.id, id));
    
    console.log(`[${rid}] ✅ Organization deleted successfully: ${existing.name}`);
    
    res.json({
      message: "Organization deleted successfully",
      id,
      name: existing.name
    });
  } catch (err: any) {
    console.error(`[${rid}] ❌ Error deleting organization ${id}:`, err.message);
    next(err);
  }
});

export default router;