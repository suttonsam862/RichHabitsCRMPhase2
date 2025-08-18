import { Router } from "express";
import { db } from "../db";
import { sql, eq, ilike, and, asc, desc } from "drizzle-orm";
import { organizations } from "../../shared/schema";
import { z } from "zod";
import { CreateOrganizationSchema } from "../../shared/supabase-schema";
import { generateTitleCard, replaceTitleCard } from "../lib/tiles";
import { getLogoPalette } from "../lib/palette";

const router = Router();

// Zod error helper
function zodToMessages(err: z.ZodError) {
  return err.issues.map(i => `${i.path.join(".")}: ${i.message}`);
}

router.get("/", async (req, res, next) => {
  console.log("🔍 GET /api/organizations - Starting request");
  try {
    console.log("🔍 Attempting to query organizations table...");
    // Use explicit column selection to avoid missing column errors
    const rows = await db.select({
      id: organizations.id,
      name: organizations.name,
      state: organizations.state,
      phone: organizations.phone,
      email: organizations.email,
      notes: organizations.notes,
      logo_url: organizations.logo_url,
      title_card_url: organizations.title_card_url,
      is_business: organizations.is_business,
      universal_discounts: organizations.universal_discounts,
      created_at: organizations.created_at,
      brand_primary: organizations.brand_primary,
      brand_secondary: organizations.brand_secondary,
    }).from(organizations).orderBy(sql`created_at DESC NULLS LAST`);
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
    // CRITICAL: Normalize universalDiscounts to {} instead of null
    const row = {
      name: input.name,
      address: input.address ?? null,
      state: input.state ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
      logo_url: input.logoUrl ?? null,
      is_business: input.isBusiness ?? false,
      universal_discounts: input.universalDiscounts ?? {}, // Always coalesce to empty object, never null
      brand_primary: input.brandPrimary ?? null,
      brand_secondary: input.brandSecondary ?? null,
    };

    console.log("🔍 Creating organization with data:", row);

    // Start a transaction to handle both organization and user_roles
    const result = await db.transaction(async (tx) => {
      // Insert organization
      const [org] = await tx.insert(organizations).values(row).returning({
        id: organizations.id,
        name: organizations.name,
        logo_url: organizations.logo_url,
        title_card_url: organizations.title_card_url,
        state: organizations.state,
        address: organizations.address,
        phone: organizations.phone,
        email: organizations.email,
        notes: organizations.notes,
        is_business: organizations.is_business,
        universal_discounts: organizations.universal_discounts,
        created_at: organizations.created_at,
        brand_primary: organizations.brand_primary,
        brand_secondary: organizations.brand_secondary,
      });

      // Try to get user ID from various sources
      const userId = (req as any).user?.id || (req as any).userId || req.headers['x-user-id'];

      if (userId) {
        try {
          // Get owner role ID
          const [ownerRole] = await tx
            .select({ id: sql`id` })
            .from(sql`public.roles`)
            .where(sql`slug = 'owner'`)
            .limit(1);

          if (ownerRole) {
            // Insert user role
            await tx.execute(sql`
              INSERT INTO public.user_roles (user_id, org_id, role_id)
              VALUES (${userId}::uuid, ${org.id}::uuid, ${ownerRole.id}::uuid)
            `);
            console.log("✅ Owner role assigned to user:", userId);
          }
        } catch (roleErr) {
          console.warn("⚠️ Could not assign owner role:", roleErr);
          // Don't fail the transaction, organization creation is more important
        }
      } else {
        console.log("ℹ️ No user ID available, skipping owner role assignment");
      }

      // Generate title card if we have logo and brand colors, but no existing title card
      if (org.logo_url && row.brand_primary && row.brand_secondary && !org.title_card_url) {
        try {
          console.log("🎨 Generating title card for new organization...");
          const logoColors = await getLogoPalette(org.logo_url);
          const titleCardUrl = await generateTitleCard({
            orgId: org.id,
            teamName: org.name,
            logoUrl: org.logo_url,
            brandPrimaryHex: row.brand_primary,
            brandSecondaryHex: row.brand_secondary
          });

          // Update the organization with the title card URL
          await tx.update(organizations)
            .set({ title_card_url: titleCardUrl })
            .where(eq(organizations.id, org.id));

          org.title_card_url = titleCardUrl;
          console.log("✅ Title card generated and saved:", titleCardUrl);
        } catch (titleError) {
          console.error("⚠️ Could not generate title card:", titleError);
          // Don't fail the transaction, organization creation is more important
        }
      }

      return org;
    });

    console.log("✅ Organization created successfully:", result);
    return res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error("❌ Validation error:", zodToMessages(err));
      return res.status(422).json({ 
        error: "Validation failed", 
        details: zodToMessages(err) 
      });
    }
    console.error("❌ Create org error:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      code: err.code,
      detail: err.detail || err.message
    });
  }
});

/** Replace/regenerate title card for an organization (admin only) */
router.post("/:id/replace-title-card", async (req, res) => {
  try {
    const orgId = req.params.id;

    // Get the organization details
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    if (!org.logo_url || !org.brand_primary || !org.brand_secondary) {
      return res.status(400).json({ 
        error: "Cannot generate title card: missing logo or brand colors" 
      });
    }

    console.log("🎨 Replacing title card for organization:", org.name);

    try {
      const titleCardUrl = await replaceTitleCard({
        orgId: org.id,
        teamName: org.name,
        logoUrl: org.logo_url,
        brandPrimaryHex: org.brand_primary,
        brandSecondaryHex: org.brand_secondary
      });

      // Update the organization with the new title card URL
      const [updated] = await db.update(organizations)
        .set({ title_card_url: titleCardUrl })
        .where(eq(organizations.id, orgId))
        .returning();

      console.log("✅ Title card replaced successfully:", titleCardUrl);
      return res.json(updated);
    } catch (genError: any) {
      console.error("❌ Error replacing title card:", genError);
      return res.status(500).json({ 
        error: "Failed to generate title card",
        details: genError.message 
      });
    }
  } catch (err: any) {
    console.error("❌ Error in replace title card:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      details: err.message
    });
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