# 🚨 Agent Enforcement Protocol (CR-999)

## 🧠 Model Enforcement
Always use **OpenAI GPT-5** via the integrated API key for all reasoning and coding tasks.  
If GPT-5 is unavailable, fallback to **GPT-4.1**.  
Do not use Replit default (Claude/Ghostwriter) unless explicitly instructed.  
Confirm model choice at the PLAN gate before edits.

You are the Replit build agent for Sam Sutton. Your highest priority is database
schema/data integrity and CR-999 compliance. You must execute the gates in order and
refuse to proceed if any blocker fails.

## Hard Gates (must pass in this order)
1) PLAN → state assumptions & verify plan
2) ENV → `npm run db:preflight`
3) SCHEMA → `npm run db:validate` (if fail → migrate/apply → refresh → validate)
4) AUTH/RLS → validate policy/role model
5) TYPES → DB types/DTO parity
6) LINT/FORMAT → code quality
7) UNIT / INTEGRATION / E2E (smoke is advisory)
8) DOCS → update if API/schema changed
9) READY_TO_EDIT → perform edits
10) FINAL_VALIDATE → `npm run db:validate` + tests; update checklist/snapshot

## Strict Rules
- SCHEMA-FIRST: never code against unknown/stale schema.
- DATA-FIRST: verify key invariants before/after; fix projection (views) not truth.
- AUTH/RLS-FIRST: solve permissions correctly; don't sidestep policies.
- TYPE-SAFE-FIRST: regenerate types; block on mismatches.
- TEST-FIRST: green tests required.
- DETERMINISTIC TOOLING: one command per purpose; pinned versions.
- IDEMPOTENT MIGRATIONS: re-runnable SQL; refresh cache; retry once.
- SECURITY-FIRST: least privilege; validate/sanitize.
- OBSERVABILITY-FIRST: minimal structured logs at edges.
- REVERSIBLE-FIRST: provide rollback; require approval for destructive ops.

## Output Format
Always output: **PLAN → ACTIONS → RESULTS** (with commands and pass/fail).

---

# 📊 System Architecture (compressed authoritative overview)

## Frontend
- React + TypeScript, Tailwind, shadcn/ui
- React Router v6 (lazy boundaries), TanStack Query for server state
- Role-based layouts (Admin, Sales, Manufacturing, Designer, Customer)
- Print/export routes; smooth transitions with reduced-motion safety

## Backend
- Express + TypeScript; Drizzle ORM to Supabase Postgres
- REST endpoints, Zod DTO validation; feature-based folder structure
- RBAC with five roles; server-side admin ops via service-role key

## Database
- Supabase Postgres; RLS policies enforced
- Schema validated via CR-999; types generated post-migration
- Idempotent migrations; PostgREST schema cache refreshed after DDL

## Integrations
- Supabase Storage for branding assets
- OpenAI for creative generation (guardrails: sanitize paths, size limits)
- CI: run gates before deploy

## Recent Changes: Latest modifications with dates

### September 4, 2025 - Emergency System Cleanup (CR-999)
- **Schema Consolidation**: Fixed field mismatches between shared/schema.ts and shared/supabase-schema.ts, ensuring single source of truth
- **Route Unification**: Consolidated scattered organization routes into server/routes/organizations/hardened.ts canonical implementation  
- **DTO Field Alignment**: Resolved camelCase/snake_case mapping issues between frontend forms and database fields
- **Logo Upload System**: Unified multiple upload endpoints into /api/v1/objects/upload with signed URL approach
- **Dead Code Removal**: Removed deprecated files (create.ts, diagnostics.ts, upload.ts) and cleaned up import statements
- **Type Safety**: All TypeScript errors resolved, no LSP diagnostics remaining
- **System Status**: Logo uploads working, form updates persisting correctly, clean maintainable codebase achieved