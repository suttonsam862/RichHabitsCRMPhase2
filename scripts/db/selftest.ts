import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key);

  // Probe schema cache quickly
  const probe = await sb.from('org_sports').select('contact_user_id').limit(1);
  if (probe.error && probe.error.message.includes('schema cache')) {
    throw new Error(`PostgREST cache stale: ${probe.error.message}`);
  }

  // Insert an organization
  const name = `__selftest_org_${Date.now()}`;
  const orgIns = await sb.from('organizations').insert({
    name, brand_primary:'#222222', brand_secondary:'#444444', status:'active'
  }).select('id').single();
  if (orgIns.error) throw new Error(`Insert organizations failed: ${orgIns.error.message}`);

  // Get a valid sport ID first
  const sportsQuery = await sb.from('sports').select('id').limit(1).single();
  if (sportsQuery.error) throw new Error(`No sports found: ${sportsQuery.error.message}`);

  // Insert org_sports row
  const sportIns = await sb.from('org_sports').insert({
    organization_id: orgIns.data!.id, 
    sport_id: sportsQuery.data.id,
    contact_name: 'Test Contact',
    contact_email: 'test@example.com',
    contact_user_id: null
  });
  if (sportIns.error) throw new Error(`Insert org_sports failed: ${sportIns.error.message}`);

  // Cleanup (best effort)
  await sb.from('org_sports').delete().eq('organization_id', orgIns.data!.id);
  await sb.from('organizations').delete().eq('id', orgIns.data!.id);

  console.log('✅ DB selftest passed (writes via service role, no RLS/constraint errors).');
}

main().catch((e)=>{ console.error('❌ DB selftest failed:', e.message); process.exit(1); });