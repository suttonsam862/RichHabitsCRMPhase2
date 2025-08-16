
import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
const r = Router();

r.get('/db', async (_req, res, next) => {
  try {
    const [{ db:catalog }] = await db.execute(sql`select current_catalog as db`);
    const [{ user }] = await db.execute(sql`select current_user as user`);
    const cols = await db.execute(sql`
      select column_name from information_schema.columns
      where table_schema='public' and table_name='organizations'
      order by ordinal_position
    `);
    res.json({ db: catalog, user, columns: cols.map((c:any)=>c.column_name) });
  } catch (e) { next(e); }
});

r.get('/whoami', async (_req, res) => {
  const url = process.env.DATABASE_URL || '';
  const host = url.split('@')[1]?.split('/')[0] || 'unknown';
  res.json({ hostMasked: host?.replace(/^[^.]*/, '***') });
});

export default r;
