# Change Request – ZERO-DB-ERROR PLEDGE

## Task
- One atomic change; no mixed concerns.

## DB Schema Snapshot to honor
- File: docs/schema/snapshot.json

## Required Outcomes
- No DB runtime errors (missing table/column, RLS, constraint, type, timeout).
- If new schema is required: include idempotent SQL migration with `SELECT pg_notify('pgrst','reload schema');`
- Server writes use `supabaseAdmin`.
- Provide proof via self-test or tests.

## Deliverables
1. Code changes.
2. Database Changes & Verification:
   - Tables/Columns touched:
   - Existence confirmed in snapshot:
   - New migrations included:
   - RLS impact (reads anon; writes service role):
   - Constraints (unique/FK/not null):
   - Performance (indexes if needed):
3. How to run:
   ```
   npm run db:schema:dump && npm run db:schema:check && npm run db:selftest
   npm run dev
   ```
4. Rollback plan.