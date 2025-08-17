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
    const orderColumn = params.sort === 'name' ? organizations.name : organizations.createdAt;
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
        logo_url: organizations.logoUrl,
        is_business: organizations.is_business,
        created_at: organizations.createdAt,
        updated_at: sql`${organizations.updatedAt || organizations.createdAt}`, // Fallback for backward compat
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

// POST /api/organizations - Create new organization
router.post("/", async (req, res) => {
  const rid = res.locals.rid;
  console.log(`[${rid}] POST /api/organizations - Body:`, req.body);
  
  try {
    // Validate input
    const input = OrgCreate.parse(req.body);
    
    // Clean data (convert empty strings to null)
    const cleanedData = cleanOrgData(input);
    
    // Map to database columns
    const dbData = {
      name: cleanedData.name,
      logoUrl: cleanedData.logo_url || null,
      state: cleanedData.state || null,
      address: cleanedData.address || null,
      phone: cleanedData.phone || null,
      email: cleanedData.email || null,
      is_business: cleanedData.is_business ?? false,
      notes: cleanedData.notes || null,
      universalDiscounts: cleanedData.universal_discounts || {},
    };
    
    console.log(`[${rid}] Creating organization with data:`, dbData);
    
    const [created] = await db
      .insert(organizations)
      .values(dbData)
      .returning();
    
    console.log(`[${rid}] Organization created successfully:`, created.id);
    
    res.status(201).json({
      ok: true,
      organization: created
    });
    
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error(`[${rid}] Validation error:`, err.issues);
      return res.status(400).json({
        error: "Validation failed",
        fieldErrors: formatFieldErrors(err)
      });
    }
    
    console.error(`[${rid}] Error creating organization:`, err);
    res.status(500).json({
      error: "Internal server error",
      code: err.code,
      hint: err.hint
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
    
    // Map to database columns (only include provided fields)
    const dbData: any = {};
    if ('name' in cleanedData) dbData.name = cleanedData.name;
    if ('logo_url' in cleanedData) dbData.logoUrl = cleanedData.logo_url;
    if ('state' in cleanedData) dbData.state = cleanedData.state;
    if ('address' in cleanedData) dbData.address = cleanedData.address;
    if ('phone' in cleanedData) dbData.phone = cleanedData.phone;
    if ('email' in cleanedData) dbData.email = cleanedData.email;
    if ('is_business' in cleanedData) dbData.is_business = cleanedData.is_business;
    if ('notes' in cleanedData) dbData.notes = cleanedData.notes;
    if ('universal_discounts' in cleanedData) dbData.universalDiscounts = cleanedData.universal_discounts;
    
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