
import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { organizations } from "../../shared/schema";
import { z } from "zod";
import { CreateOrganizationSchema } from "../../shared/supabase-schema";

const router = Router();

// Zod error helper
function zodToMessages(err: z.ZodError) {
  return err.issues.map(i => `${i.path.join(".")}: ${i.message}`);
}

router.get("/", async (_req, res, next) => {
  console.log("🔍 GET /api/organizations - Starting request");
  try {
    console.log("🔍 Attempting to query organizations table...");
    const rows = await db.select().from(organizations).orderBy(sql`created_at DESC NULLS LAST`);
    console.log("✅ Organizations query successful. Found", rows.length, "organizations");
    console.log("🔍 Sample organization data:", rows.slice(0, 1));
    res.json({ data: rows });
  } catch (err: any) {
    console.error("❌ Error in GET /api/organizations:");
    console.error("- Error message:", err.message);
    console.error("- Error code:", err.code);
    console.error("- Error stack:", err.stack);
    next(err);
  }
});

// POST /api/organizations with proper validation and camelCase -> snake_case mapping
router.post("/", async (req, res) => {
  try {
    const input = CreateOrganizationSchema.parse(req.body);

    // Map camelCase from client to snake_case for database
    const row = {
      name: input.name,
      address: input.address ?? null,
      state: input.state ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
      logo_url: input.logoUrl ?? null,
      is_business: input.isBusiness ?? false,
      universal_discounts: input.universalDiscounts ?? null, // JSONB
    };

    console.log("🔍 Creating organization with data:", row);
    const inserted = await db.insert(organizations).values(row).returning({
      id: organizations.id,
      name: organizations.name,
      logo_url: organizations.logoUrl,
      state: organizations.state,
      address: organizations.address,
      phone: organizations.phone,
      email: organizations.email,
      notes: organizations.notes,
      is_business: organizations.is_business,
      universal_discounts: organizations.universalDiscounts,
      created_at: organizations.createdAt,
    });
    
    console.log("✅ Organization created successfully:", inserted[0]);
    return res.status(201).json(inserted[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("❌ Validation error:", zodToMessages(err));
      return res.status(422).json({ 
        error: "Validation failed", 
        details: zodToMessages(err) 
      });
    }
    console.error("❌ Create org error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** quick debug: see actual columns the DB has */
router.get("/__columns", async (_req, res, next) => {
  try {
    const cols = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='organizations'
      ORDER BY ordinal_position
    `);
    res.json({ columns: cols.map((c: any) => c.column_name) });
  } catch (err) {
    next(err);
  }
});

export default router;
