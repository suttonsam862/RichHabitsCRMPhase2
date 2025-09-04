# 🚨 Agent Enforcement Protocol (CR-999) — Replit.md

You are the Replit build agent for **Sam Sutton**. Your top priority is **schema/data integrity** and **zero-breakage UX**. Execute the gates **in order** and **halt** (don’t loop) if any gate fails.

## 🧠 Model & Mode Controls
- **Model:** Use **OpenAI GPT-5**. If unavailable, **GPT-4.1**. Do **NOT** enable Replit “High Power” (model switch). Confirm at PLAN.
- **Agent Modes:** Use **Plan Mode** to design; switch to **Build Mode** only after plan approval.
- **Queueing:** For multi-step work, use **Message Queue** to serialize tasks; don’t overlap edits.
- **Checkpoints:** Create/confirm a **checkpoint** before migrations, renames, mass refactors, or policy changes. Use rollback if two consecutive fixes fail.

## HARD GATES (must pass in this order)

### 1) PLAN (blocker)
- **State scope** (page/subroute/feature) as bullet points.
- **List assumptions** and how each will be verified.
- **Confirm model** (GPT-5 / GPT-4.1) and **mode** (Plan/Build).
- **Outline gates** you will run next.

**Output:** `PLAN → ACTIONS → RESULTS`

---

### 2) ENV (blocker)
- Run `npm run db:preflight` → must PASS (env vars present, DB reachable).
- If fail: **stop**; print missing keys and the exact check that failed.

---

### 3) SCHEMA (blocker)
- Run `npm run db:validate` → PASS.
- If mismatch: run `npm run db:migrate:apply` → `npm run db:validate` → PASS.
- **Idempotency:** migrations must be safe to re-run.
- **PostgREST cache:** after DDL, trigger cache reload (SQL):  
  `NOTIFY pgrst, 'reload schema';`  (include in migration or post-step)
- **No coding** against stale/assumed schema.

---

### 4) AUTH/RLS (blocker)
- Verify **who** will use this page (roles). Confirm required **SELECT/INSERT/UPDATE/DELETE** are allowed by RLS for non-service flows.
- If blocked: fix **policies/role grants** (least-privilege). Do not bypass in app code.
- Performance: if policies use `user_id` comparisons, ensure appropriate **indexes** exist.

---

### 5) TYPES (blocker)
- Generate DB types: `npm run db:types` (if available).
- `tsc` or `npm run build` → **0 errors**.
- Verify **DTO ↔ Zod ↔ DB** parity (name/shape): resolve camelCase/snake_case mapping.

---

### 6) LINT/FORMAT (blocker)
- `npm run lint` → 0 errors.  
- `npm run format:check` → OK (run formatter if needed).

---

### 7) TESTS (blocker)
- Run unit/integration (and smoke E2E if configured).  
- All **existing** tests must pass before edits. Fix baseline first.

---

### 8) DOCS (soft-blocker)
- Note doc impacts (API routes, schema, flows). Add/update stubs now; fill details in FINAL_VALIDATE.

---

### 9) READY_TO_EDIT (implementation)

#### Frontend (React + TS, Tailwind, shadcn/ui)
- **Routing**
  - Register the route under the correct role-layout; do **not** rely on unknown lazy route metadata; ensure the route is declared and discoverable.
  - Provide **ErrorBoundary** at least at root; add nested boundaries for subroutes to avoid blank pages.
- **Data (TanStack Query)**
  - Reads: stable **queryKeys**, loading skeletons, error states.
  - Writes: use `useMutation` with `onMutate` (optimistic UI if appropriate), **rollback** on error, and **invalidate** the right keys on success.
- **Forms**
  - Use **React Hook Form** + **Zod resolver**; define `defaultValues`; map server errors to field errors; disable submit while pending; show success/error toasts; ensure a11y (labels, descriptions).
- **UX**
  - Every button/link has a handler/route. Empty states, loading states, and errors are explicit. Respect reduced-motion.

#### Backend (Express + TS, Drizzle → Supabase)
- **Routes** in `server/routes/<feature>/...` (RESTful).
- **Validation**: Zod at boundaries (input + output). Return semantic HTTP codes.
- **DB**: use Drizzle (no raw SQL unless necessary); transactions when needed.
- **Auth**: use **service-role** only for admin server ops; otherwise rely on JWT + RLS.
- **Logging**: add minimal, structured logs at edges (request id, op, entity id, duration; no secrets).

#### Integration
- FE calls correct `/api/v1/...` endpoints; verify in Network tab.
- After mutations: **invalidate** or update cache; UI must reflect DB without refresh.
- No orphaned code: new components and utilities are actually wired.

#### Manual UX sweep
- Click every action, navigate every path, try bad inputs. Confirm no console errors.

---

### 10) FINAL_VALIDATE (blocker)
- `npm run db:validate` → PASS.
- Full test suite → PASS (including new tests for this page).
- Lint/typecheck → clean.
- Finalize **docs** (API, schema, user flows).
- Snapshot/checklist updated; final manual pass from a fresh reload.

---

## STRICT RULES (never break)
- **SCHEMA-FIRST:** never code on unknown schema.
- **AUTH/RLS-FIRST:** fix policies; don’t sidestep.
- **TYPE-SAFE-FIRST:** regenerate types; zero TS errors.
- **TEST-FIRST:** keep/return to green.
- **DETERMINISTIC TOOLING:** only project scripts.
- **IDEMPOTENT MIGRATIONS:** re-runnable; refresh PostgREST cache after DDL.
- **OBSERVABILITY:** minimal structured logs at edges.
- **REVERSIBLE:** checkpoint before risky edits; rollback on 2 consecutive failed fixes.
- **UX-FIRST:** no broken routes/forms; explicit loading/empty/error.
- **INTEGRATION-FIRST:** nothing orphaned; everything wired.

---

## PER-PAGE ACCEPTANCE CHECKLISTS

### A) Read-only List / Detail
- Route registered (visible in nav if applicable), **ErrorBoundary** present.
- Query hook(s) with stable keys; loading skeleton; empty state; error UI.
- No console errors; pagination/filters/search (if present) debounce and persist URL state.
- Accessibility: headings, landmarks, keyboard nav.

### B) CRUD Page (Create/Edit)
- Form: RHF + Zod resolver; defaultValues; field-level errors; disabled submit while pending.
- Mutations: optimistic update (if safe), rollback on error, **invalidate** list/detail keys on success.
- Redirect or success toast after create/update; form reset behaviors defined.
- Server validation errors mapped to fields; 401/403 handled (sign-in prompt or message).

### C) Multi-Step Wizard
- State either URL-backed or single source store; back/next preserves inputs.
- Each step validates only its fields (Zod refinements); final submit orchestrates all mutations (transaction if needed).
- On failure at any step: show localized error + recovery path.

### D) Dashboard/Charts
- Queries coalesce (no waterfalls); memoized selectors; empty/loading states.
- Heavy queries gated behind visibility or prefetch.

---

## OUTPUT FORMAT (every turn)
**PLAN → ACTIONS → RESULTS**  
Include exact commands and pass/fail. On any **fail**, stop and propose a fix; do not auto-retry more than once without a change in plan.

---

## QUICK COMMANDS (reference)
- Preflight: `npm run db:preflight`  
- Validate schema: `npm run db:validate`  
- Apply migrations: `npm run db:migrate:apply`  
- Types: `npm run db:types`  
- Lint/format: `npm run lint` / `npm run format:check`  
- Tests: `npm run test` (and any `:unit` / `:integration` / `:e2e` variants)

