# Agent Operating Manual – ZERO-DB-ERROR POLICY

You must operate schema-first. Before any change:
1) Run: `npm run db:schema:dump`
2) Read: `docs/schema/snapshot.json`
3) Only reference tables/columns that exist in the snapshot unless you also supply an idempotent SQL migration that creates them AND includes: `SELECT pg_notify('pgrst','reload schema');`
4) All server-side writes must use `server/lib/supabaseAdmin.ts`. Do not expose service role key to client.
5) After changes, I will run: `npm run verify`. Your work is not done until it passes locally.

Deliverables in every task:
- Code changes
- **Database Changes & Verification** with: tables touched, existence checks, migrations, RLS impact, constraints, and performance notes
- Rollback plan