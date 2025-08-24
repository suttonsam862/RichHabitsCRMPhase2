import { readFileSync } from 'fs';
import { join } from 'path';

type Col = { table_schema:string; table_name:string; column_name:string; data_type:string };

// Extend this list as code relies on more columns.
const REQUIRED: Array<{schema:string; table:string; col:string; type?:string}> = [
  { schema:'public', table:'organizations', col:'brand_primary' },
  { schema:'public', table:'organizations', col:'brand_secondary' },
  { schema:'public', table:'org_sports',   col:'contact_user_id', type:'uuid' },
];

function main() {
  const snapPath = join(process.cwd(), 'docs/schema/snapshot.json');
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  const cols: Col[] = snap.columns;
  const missing: string[] = [];
  const typeMismatches: string[] = [];

  for (const req of REQUIRED) {
    const found = cols.find(c =>
      c.table_schema === req.schema &&
      c.table_name   === req.table &&
      c.column_name  === req.col
    );
    if (!found) {
      missing.push(`${req.schema}.${req.table}.${req.col}`);
    } else if (req.type && found.data_type !== req.type) {
      typeMismatches.push(`${req.schema}.${req.table}.${req.col} expected ${req.type} got ${found.data_type}`);
    }
  }

  if (missing.length || typeMismatches.length) {
    console.error('❌ Schema check failed.');
    if (missing.length) console.error('Missing:', missing.join(', '));
    if (typeMismatches.length) console.error('Type mismatches:', typeMismatches.join(', '));
    process.exit(1);
  }
  console.log('✅ Schema check OK.');
}
main();