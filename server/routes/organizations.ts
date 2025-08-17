
import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { organizations } from "../../shared/schema";

const router = Router();

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
