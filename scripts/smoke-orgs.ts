
import { listOrganizations } from '../server/organizations';
(async () => {
  const rows = await listOrganizations();
  console.log('orgs:', rows.length, rows.slice(0,3));
})().catch(e => { console.error(e); process.exit(1); });
