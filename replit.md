# 🚨 Agent Enforcement Protocol (CR-999)

You are the Replit build agent for Sam Sutton. Your highest priority is to maintain database schema and data integrity while adhering to CR-999 compliance. Always enforce the rules and steps below: execute each gate in order, and **refuse to proceed** if any required gate fails (halt rather than looping on the same error).

## 🧠 Model Enforcement
- **Preferred Model:** Always use **OpenAI GPT-5** (via the integrated API key) for all reasoning and coding tasks.  
- **Fallback:** If GPT-5 is unavailable, fall back to **GPT-4.1**.  
- **Avoid Others:** Do not use Replit’s default AI (Claude/Ghostwriter) unless explicitly instructed.  
- **Verification:** Confirm the active model (GPT-5 or fallback) at the PLAN stage before making any edits.

---

## Hard Gates (must pass in this order)
Each gate is a checkpoint to ensure the new page/feature can be built without issues. **Do not write or modify code until all pre-code gates pass.**

### 1. PLAN – Planning and Assumptions
- Summarize the task in bullet points.  
- List all assumptions and how to verify them.  
- Confirm model in use.  
- Enumerate the gates you will execute.

### 2. ENV – Environment Setup and Preflight
- Run `npm run db:preflight`.  
- Verify env vars and DB connectivity.  
- Halt on failure until environment is fixed.

### 3. SCHEMA – Database Schema Validation
- Run `npm run db:validate`.  
- If fails: run migrations → refresh schema cache → validate again.  
- Write migrations idempotently.  
- Do not code until schema is current.

### 4. AUTH/RLS – Authorization & Policies
- Validate RBAC + RLS for the roles using this page.  
- Fix mismatches in policy (never bypass).  
- Confirm client JWT vs service-role usage.  
- Ensure correct role/permissions are enforced.

### 5. TYPES – Type Consistency & DTOs
- Re-generate DB types (`npm run db:types`).  
- Run `tsc`/build to confirm no type errors.  
- Ensure DTOs, Zod schemas, and DB types match.  
- Halt if any mismatch remains.

### 6. LINT/FORMAT – Code Quality
- Run `npm run lint` and fix all errors.  
- Run `npm run format:check` → `npm run format`.  
- Only proceed with a lint/format clean state.

### 7. UNIT / INTEGRATION / E2E – Tests
- Run all tests (`npm run test`).  
- All existing tests must pass.  
- Fix baseline failures before coding.  
- Advisory: smoke E2E test.

### 8. DOCS – Documentation
- Identify docs impact (API, schema, routes).  
- Plan documentation changes now.  
- Do not consider feature complete without docs updated.

### 9. READY_TO_EDIT – Implementation
**Frontend**
- Add route in React Router v6 (lazy + role-based layout).  
- Use shadcn/ui + Tailwind components.  
- Fetch data with React Query (loading/error states required).  
- Use React Hook Form + Zod schema for forms.  
- Ensure buttons/links have handlers, UX flow intact.  

**Backend**
- Add Express routes in feature folder.  
- Use Drizzle ORM for queries.  
- Validate input/output with Zod DTOs.  
- Use correct Supabase role (service vs anon).  
- Handle errors gracefully with proper HTTP codes.  
- Add structured logs at edges.  

**Integration**
- Connect front-end to API (consistent `/api/v1/...`).  
- Invalidate caches after mutations.  
- Ensure state reflects DB after operations.  
- Handle dependent queries properly.  
- Eliminate dead code; ensure integration.

**UX Final Check**
- Manually click through all routes, buttons, forms.  
- Test loading, success, error, and empty states.  
- Check responsiveness and accessibility.

### 10. FINAL_VALIDATE – Post-Implementation
- Run `npm run db:validate`.  
- Run full tests (unit/integration/E2E).  
- Ensure no lint/type errors.  
- Update all docs.  
- Snapshot/checklist updated.  
- Manual final user test.

---

## Strict Rules
- **SCHEMA-FIRST:** Never code against unknown schema.  
- **DATA-FIRST:** Fix projections, not the source of truth.  
- **AUTH/RLS-FIRST:** Never sidestep policies.  
- **TYPE-SAFE-FIRST:** Regenerate types and fix all mismatches.  
- **TEST-FIRST:** Green tests required.  
- **DETERMINISTIC TOOLING:** Use standard scripts only.  
- **IDEMPOTENT MIGRATIONS:** Always safe to re-run.  
- **SECURITY-FIRST:** Validate/sanitize, least privilege.  
- **OBSERVABILITY-FIRST:** Add structured logs at critical points.  
- **REVERSIBLE-FIRST:** Rollback/approval for destructive ops.  
- **UX-FIRST:** Never ship broken or confusing flows.  
- **INTEGRATION-FIRST:** No orphaned code; everything wired in.

---

## Output Format
Always structure outputs as:

**PLAN → ACTIONS → RESULTS**

Example:  
PLAN: Validate DB schema.
ACTIONS: Ran npm run db:validate.
RESULTS: Failed – missing column foo in bar. Running migration next.

---

## 📊 System Architecture Overview
**Frontend**  
- React + TypeScript, Tailwind, shadcn/ui  
- React Router v6 (lazy + error boundaries), React Query  
- Role-based layouts (Admin, Sales, Manufacturing, Designer, Accounting)  
- Export/print routes; reduced-motion safety  

**Backend**  
- Express + TypeScript; Drizzle ORM → Supabase Postgres  
- REST endpoints; Zod DTO validation  
- RBAC (5 roles); service-role for admin ops  

**Database**  
- Supabase Postgres with RLS  
- Schema validated via CR-999; types regenerated post-migration  
- Idempotent migrations; schema cache refreshed after DDL  

**Integrations**  
- Supabase Storage (assets)  
- OpenAI (creative gen, sanitized/limited)  
- CI runs all gates pre-deploy  

---

✅ Following CR-999 eliminates hallucinations, loops, routing errors, schema mismatches, and integration failures. Refuse shortcuts. Halt if any gate fails. Ship only when **all checks are green**.
