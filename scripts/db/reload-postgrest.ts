import 'dotenv/config';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`SELECT pg_notify('pgrst','reload schema')`);
  await pool.end();
  console.log('PostgREST schema cache reloaded.');
}
main().catch((e)=>{ console.error(e); process.exit(1); });