import { Router } from "express";
import { db } from "../db";
import { sql, eq, ilike, and, desc, asc } from "drizzle-orm";
import { organizations } from "../../shared/schema";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Environment configuration
const ASSIGN_OWNER_ON_CREATE = process.env.ASSIGN_OWNER_ON_CREATE !== 'false';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID;

// Request ID middleware
router.use((req, res, next) => {
  const rid = uuidv4().slice(0, 8);
  res.locals.rid = rid;
  console.log(`[${rid}] ${req.method} ${req.path}`);
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
}).transform((data) => {
  // Normalize and map fields
  const normalized: any = {
    name: data.name.trim(),
    logo_url: data.logoUrl || data.logo_url || null,
    is_business: data.isBusiness ?? data.is_business ?? false,
    universal_discounts: data.universalDiscounts || data.universal_discounts || {},
  };
  
  // Handle state - normalize to uppercase if provided
  if (data.state && data.state !== "") {
    normalized.state = data.state.toUpperCase();
    // Basic validation for 2-letter state code
    if (normalized.state.length !== 2) {
      normalized.state = null;
    }
  } else {
    normalized.state = null;
  }
  
  // Handle optional fields - convert empty strings to null
  normalized.address = data.address && data.address !== "" ? data.address : null;
  normalized.phone = data.phone && data.phone !== "" ? data.phone : null;
  normalized.email = data.email && data.email !== "" ? data.email : null;
  normalized.notes = data.notes && data.notes !== "" ? data.notes : null;
  
  // Validate email format if provided
  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    normalized.email = null;
  }
  
  // Validate logo URL if provided
  if (normalized.logo_url) {
    try {
      new URL(normalized.logo_url);
    } catch {
      normalized.logo_url = null;
    }
  }
  
  // Handle additional fields if present
  if (data.email_domain && data.email_domain !== "") {
    normalized.email_domain = data.email_domain;
  }
  if (data.brand_primary && data.brand_primary !== "") {
    normalized.brand_primary = data.brand_primary;
  }
  if (data.brand_secondary && data.brand_secondary !== "") {
    normalized.brand_secondary = data.brand_secondary;
  }
  if (data.address_line1 && data.address_line1 !== "") {
    normalized.address_line1 = data.address_line1;
  }
  if (data.address_line2 && data.address_line2 !== "") {
    normalized.address_line2 = data.address_line2;
  }
  if (data.city && data.city !== "") {
    normalized.city = data.city;
  }
  if (data.postal_code && data.postal_code !== "") {
    normalized.postal_code = data.postal_code;
  }
  if (data.country && data.country !== "") {
    normalized.country = data.country;
  }
  
  return normalized;
});

// Helper to get user ID from various sources
function getUserId(req: any): string | null {
  // Try different sources for user ID
  const userId = req.headers['x-user-id'] || 
                 req.user?.id || 
                 req.session?.userId ||
                 DEFAULT_USER_ID;
                 
  return userId || null;
}

// POST /api/organizations - Create with robust normalization and conditional role assignment
router.post("/", async (req, res) => {
  const rid = res.locals.rid;
  console.log(`[${rid}] Creating organization - Payload:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Parse and normalize input
    const parseResult = CreateOrgSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      console.error(`[${rid}] Validation failed:`, parseResult.error.issues);
      return res.status(400).json({
        error: "Validation failed",
        issues: parseResult.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }))
      });
    }
    
    const normalized = parseResult.data;
    console.log(`[${rid}] Normalized data:`, normalized);
    
    // Check for duplicate name
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(sql`lower(${organizations.name}) = lower(${normalized.name})`)
      .limit(1);
    
    if (existing.length > 0) {
      console.warn(`[${rid}] Duplicate organization name: ${normalized.name}`);
      return res.status(409).json({
        error: "Organization with this name already exists",
        existingId: existing[0].id
      });
    }
    
    // Create organization
    const [created] = await db
      .insert(organizations)
      .values(normalized)
      .returning();
    
    console.log(`[${rid}] Organization created - ID: ${created.id}`);
    
    // Conditionally assign owner role
    if (ASSIGN_OWNER_ON_CREATE) {
      const userId = getUserId(req);
      
      if (userId) {
        try {
          // Get owner role ID
          const [ownerRole] = await db.execute(sql`
            SELECT id FROM roles WHERE slug = 'owner' LIMIT 1
          `) as any;
          
          if (ownerRole?.rows?.[0]?.id || ownerRole?.[0]?.id) {
            const roleId = ownerRole?.rows?.[0]?.id || ownerRole?.[0]?.id;
            
            // Insert user role (ignore conflicts)
            await db.execute(sql`
              INSERT INTO user_roles (user_id, org_id, role_id)
              VALUES (${userId}, ${created.id}, ${roleId})
              ON CONFLICT (user_id, org_id) DO NOTHING
            `);
            
            console.log(`[${rid}] Assigned owner role to user ${userId}`);
          } else {
            console.warn(`[${rid}] Owner role not found in database`);
          }
        } catch (roleError: any) {
          console.warn(`[${rid}] Failed to assign owner role:`, roleError.message);
          // Don't fail the request - organization was created successfully
        }
      } else {
        console.warn(`[${rid}] No user ID available - skipping owner role assignment`);
      }
    }
    
    // Return success response
    res.status(201).json({
      success: true,
      id: created.id,
      organization: created,
      message: "Organization created successfully"
    });
    
  } catch (err: any) {
    console.error(`[${rid}] Error creating organization:`, {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint
    });
    
    // Handle specific database errors
    if (err.code === '23502') { // Not null violation
      return res.status(400).json({
        error: "Missing required field",
        field: err.column,
        message: `Required field '${err.column}' cannot be null`
      });
    }
    
    if (err.code === '42703') { // Column doesn't exist
      return res.status(500).json({
        error: "Database schema error",
        message: `Column '${err.column || 'unknown'}' does not exist. Please run schema migration.`,
        hint: "Run: npm run db:migrate"
      });
    }
    
    res.status(500).json({
      error: "Failed to create organization",
      message: err.message,
      requestId: rid
    });
  }
});

// GET /api/organizations - List with filtering
router.get("/", async (req, res) => {
  const rid = res.locals.rid;
  
  try {
    // Parse query params with defaults
    const {
      q = "",
      state = "",
      type = "all",
      sort = "created_at",
      order = "desc",
      page = "1",
      pageSize = "20"
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const size = Math.min(50, Math.max(1, parseInt(pageSize as string) || 20));
    const offset = (pageNum - 1) * size;
    
    // Build where conditions
    const conditions = [];
    
    if (q && q !== "") {
      conditions.push(ilike(organizations.name, `%${q}%`));
    }
    
    if (state && state !== "" && state !== "any") {
      conditions.push(eq(organizations.state, state as string));
    }
    
    if (type === "school") {
      conditions.push(eq(organizations.is_business, false));
    } else if (type === "business") {
      conditions.push(eq(organizations.is_business, true));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Count total
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause);
    
    // Get organizations
    const orderColumn = sort === "name" ? organizations.name : organizations.created_at;
    const orderDirection = order === "asc" ? asc : desc;
    
    const items = await db
      .select()
      .from(organizations)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(size)
      .offset(offset);
    
    console.log(`[${rid}] Found ${items.length} organizations (total: ${total})`);
    
    res.json({
      items,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size)
    });
    
  } catch (err: any) {
    console.error(`[${rid}] Error listing organizations:`, err);
    res.status(500).json({
      error: "Failed to list organizations",
      requestId: rid
    });
  }
});

// GET /api/organizations/:id - Get single organization
router.get("/:id", async (req, res) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    
    if (!org) {
      return res.status(404).json({
        error: "Organization not found"
      });
    }
    
    res.json(org);
    
  } catch (err: any) {
    console.error(`[${rid}] Error fetching organization:`, err);
    res.status(500).json({
      error: "Failed to fetch organization",
      requestId: rid
    });
  }
});

// DELETE /api/organizations/:id
router.delete("/:id", async (req, res) => {
  const rid = res.locals.rid;
  const { id } = req.params;
  
  try {
    await db
      .delete(organizations)
      .where(eq(organizations.id, id));
    
    console.log(`[${rid}] Deleted organization: ${id}`);
    res.status(204).send();
    
  } catch (err: any) {
    console.error(`[${rid}] Error deleting organization:`, err);
    res.status(500).json({
      error: "Failed to delete organization",
      requestId: rid
    });
  }
});

export default router;