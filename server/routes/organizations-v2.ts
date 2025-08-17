import { Router } from "express";
import { db } from "../db";
import { sql, eq, ilike, and, desc, asc } from "drizzle-orm";
import { organizations } from "../../shared/schema";
import { OrgCreate, OrgUpdate, OrgQueryParams, cleanOrgData } from "../../shared/schemas/organization";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Request ID middleware
router.use((req, res, next) => {
  const rid = uuidv4().slice(0, 8);
  res.locals.rid = rid;
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${rid}] ${req.method} ${req.path} -> ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Helper to format validation errors
function formatFieldErrors(err: z.ZodError) {
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

// GET /api/organizations - List with filtering, sorting, pagination
router.get("/", async (req, res, next) => {
  const rid = res.locals.rid;
  console.log(`[${rid}] GET /api/organizations - Query params:`, req.query);
  
  try {
    // Parse and validate query parameters
    const params = OrgQueryParams.parse(req.query);
    console.log(`[${rid}] Parsed params:`, params);
    
    // Build where conditions
    const conditions = [];
    
    // Search by name (case-insensitive)
    if (params.q) {
      conditions.push(ilike(organizations.name, `%${params.q}%`));
    }
    
    // Filter by state
    if (params.state) {
      conditions.push(eq(organizations.state, params.state));
    }
    
    // Filter by type
    if (params.type !== 'all') {
      conditions.push(eq(organizations.is_business, params.type === 'business'));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Build order by clause
    const orderColumn = params.sort === 'name' ? organizations.name : organizations.created_at;
    const orderDirection = params.order === 'asc' ? asc : desc;
    
    // Calculate offset
    const offset = (params.page - 1) * params.pageSize;
    
    // Execute count query for total
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause);
    
    // Execute main query with minimal projection
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        state: organizations.state,
        logo_url: organizations.logo_url,
        is_business: organizations.is_business,
        created_at: organizations.created_at,
      })
      .from(organizations)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(params.pageSize)
      .offset(offset);
    
    console.log(`[${rid}] Found ${rows.length} organizations (total: ${totalCount})`);
    
    res.json({
      items: rows,
      total: totalCount,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(totalCount / params.pageSize)
    });
    
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error(`[${rid}] Validation error:`, err.issues);
      return res.status(400).json({
        error: "Invalid query parameters",
        fieldErrors: formatFieldErrors(err)
      });
    }
    
    console.error(`[${rid}] Error in GET /api/organizations:`, err);
    next(err);
  }
});

// POST /api/organizations - Create new organization (Enhanced validation)
router.post("/", async (req, res) => {
  const rid = res.locals.rid;
  console.log(`[${rid}] POST /api/organizations - Body:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Safeguard: Ensure universalDiscounts is never null
    if (req.body && req.body.universalDiscounts === null) {
      req.body.universalDiscounts = {};
    }
    
    // Strict content-type validation for JSON payloads
    if (!req.is('application/json')) {
      return res.status(400).json({
        error: "Invalid content type",
        message: "Request must be application/json",
        received: req.get('Content-Type') || 'none'
      });
    }

    // Enhanced validation with strict zod schema
    const parseResult = OrgCreate.safeParse(req.body);
    
    if (!parseResult.success) {
      const fieldErrors = formatFieldErrors(parseResult.error);
      console.error(`[${rid}] Validation failed:`, {
        issues: parseResult.error.issues,
        fieldErrors
      });
      
      return res.status(400).json({
        error: "Validation failed",
        message: "One or more fields contain invalid data",
        fieldErrors,
        details: parseResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.code === 'invalid_type' ? typeof req.body[issue.path[0]] : req.body[issue.path[0]]
        }))
      });
    }

    const validatedData = parseResult.data;
    
    // Additional business logic validation
    if (validatedData.logo_url) {
      try {
        const logoUrl = new URL(validatedData.logo_url);
        // Ensure logo URL is from allowed domains or our upload service
        const allowedDomains = ['supabase.co', 'amazonaws.com', process.env.SUPABASE_URL?.replace('https://', '')];
        const isAllowedDomain = allowedDomains.some(domain => 
          domain && logoUrl.hostname.includes(domain)
        );
        
        if (!isAllowedDomain) {
          console.warn(`[${rid}] Logo URL from external domain: ${logoUrl.hostname}`);
        }
      } catch (urlError) {
        return res.status(400).json({
          error: "Invalid logo URL",
          message: "Logo URL must be a valid URL format"
        });
      }
    }

    // Check for duplicate organization name (case-insensitive)
    const existingOrg = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(sql`lower(${organizations.name}) = lower(${validatedData.name})`)
      .limit(1);
    
    if (existingOrg.length > 0) {
      return res.status(409).json({
        error: "Duplicate organization name",
        message: `An organization with the name "${validatedData.name}" already exists`,
        existingId: existingOrg[0].id
      });
    }
    
    // Map validated data to database columns (exact snake_case column names)
    const dbData = {
      name: validatedData.name,
      logo_url: validatedData.logo_url || null,
      state: validatedData.state || null,
      phone: validatedData.phone || null,
      email: validatedData.email || null,
      is_business: validatedData.is_business ?? false,
      notes: validatedData.notes || null,
      universal_discounts: validatedData.universal_discounts || {},
    };
    
    console.log(`[${rid}] Creating organization with validated data:`, dbData);
    
    const [created] = await db
      .insert(organizations)
      .values(dbData)
      .returning();
    
    console.log(`[${rid}] Organization created successfully - ID: ${created.id}, Name: ${created.name}`);
    
    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      organization: created,
      meta: {
        createdAt: new Date().toISOString(),
        requestId: rid
      }
    });
    
  } catch (err: any) {
    console.error(`[${rid}] Error creating organization:`, {
      error: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      stack: err.stack
    });
    
    // Handle specific database errors
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: "Duplicate entry",
        message: "Organization with this name already exists",
        constraint: err.constraint
      });
    }
    
    if (err.code === '23502') { // Not null violation
      return res.status(400).json({
        error: "Missing required field",
        message: `Required field cannot be null: ${err.column}`,
        field: err.column
      });
    }
    
    if (err.code === '22001') { // String data too long
      return res.status(400).json({
        error: "Data too long",
        message: "One or more fields exceed maximum length",
        detail: err.detail
      });
    }
    
    // Generic error response
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create organization",
      requestId: rid,
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          code: err.code,
          hint: err.hint,
          detail: err.detail
        }
      })
    });
  }
});

// PATCH /api/organizations/:id - Update organization
router.patch("/:id", async (req, res) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  console.log(`[${rid}] PATCH /api/organizations/${id} - Body:`, req.body);
  
  try {
    // Validate input (partial update)
    const input = OrgUpdate.parse(req.body);
    
    // Clean data
    const cleanedData = cleanOrgData(input);
    
    // Map to database columns (only include provided fields, exact snake_case column names)
    const dbData: any = {};
    if ('name' in cleanedData) dbData.name = cleanedData.name;
    if ('logo_url' in cleanedData) dbData.logo_url = cleanedData.logo_url;
    if ('state' in cleanedData) dbData.state = cleanedData.state;
    if ('phone' in cleanedData) dbData.phone = cleanedData.phone;
    if ('email' in cleanedData) dbData.email = cleanedData.email;
    if ('is_business' in cleanedData) dbData.is_business = cleanedData.is_business;
    if ('notes' in cleanedData) dbData.notes = cleanedData.notes;
    if ('universal_discounts' in cleanedData) dbData.universal_discounts = cleanedData.universal_discounts;
    
    if (Object.keys(dbData).length === 0) {
      return res.status(400).json({
        error: "No fields to update"
      });
    }
    
    console.log(`[${rid}] Updating organization with data:`, dbData);
    
    const [updated] = await db
      .update(organizations)
      .set(dbData)
      .where(eq(organizations.id, id))
      .returning();
    
    if (!updated) {
      console.log(`[${rid}] Organization not found: ${id}`);
      return res.status(404).json({
        error: "Organization not found"
      });
    }
    
    console.log(`[${rid}] Organization updated successfully:`, id);
    
    res.json({
      ok: true,
      organization: updated
    });
    
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error(`[${rid}] Validation error:`, err.issues);
      return res.status(400).json({
        error: "Validation failed",
        fieldErrors: formatFieldErrors(err)
      });
    }
    
    console.error(`[${rid}] Error updating organization:`, err);
    res.status(500).json({
      error: "Internal server error",
      code: err.code,
      hint: err.hint
    });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete("/:id", async (req, res) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  console.log(`[${rid}] DELETE /api/organizations/${id}`);
  
  try {
    const [deleted] = await db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id });
    
    if (!deleted) {
      console.log(`[${rid}] Organization not found: ${id}`);
      return res.status(404).json({
        error: "Organization not found"
      });
    }
    
    console.log(`[${rid}] Organization deleted successfully:`, id);
    res.status(204).send();
    
  } catch (err: any) {
    console.error(`[${rid}] Error deleting organization:`, err);
    res.status(500).json({
      error: "Internal server error",
      code: err.code,
      hint: err.hint
    });
  }
});

// GET /api/organizations/:id - Get single organization
router.get("/:id", async (req, res) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  console.log(`[${rid}] GET /api/organizations/${id}`);
  
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    
    if (!org) {
      console.log(`[${rid}] Organization not found: ${id}`);
      return res.status(404).json({
        error: "Organization not found"
      });
    }
    
    console.log(`[${rid}] Found organization:`, id);
    res.json(org);
    
  } catch (err: any) {
    console.error(`[${rid}] Error fetching organization:`, err);
    res.status(500).json({
      error: "Internal server error",
      code: err.code
    });
  }
});

export default router;