
import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { organizations } from "../../shared/schema";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rows = await db.select().from(organizations).orderBy(sql`created_at DESC NULLS LAST`);
    res.json({ data: rows });
  } catch (err) {
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
