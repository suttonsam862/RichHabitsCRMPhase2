import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'docs/schema/snapshot.json');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const columns = await pool.query(`
    select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.character_maximum_length
    from information_schema.columns c
    where c.table_schema in ('public','auth')
    order by c.table_schema, c.table_name, c.ordinal_position
  `);
  const constraints = await pool.query(`
    select tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
    from information_schema.table_constraints tc
    where tc.table_schema in ('public','auth')
    order by tc.table_schema, tc.table_name, tc.constraint_name
  `);
  const rls = await pool.query(`
    select schemaname as table_schema, tablename as table_name, rowsecurity as rls_enabled
    from pg_tables
    where schemaname in ('public','auth')
  `);
  mkdirSync(join(process.cwd(), 'docs/schema'), { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    columns: columns.rows,
    constraints: constraints.rows,
    rls: rls.rows
  }, null, 2));
  await pool.end();
  console.log('Schema snapshot written:', OUT);
}
main().catch((e)=>{ console.error(e); process.exit(1); });