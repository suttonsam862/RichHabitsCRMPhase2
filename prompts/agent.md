
# ROLE
Implement/refactor code to match the live DB schema EXACTLY.

# SOURCES
- Use `shared/schema.ts` (primary). If a field/table isn't there → STOP and ask.

# ALLOWED CHANGES
- Only in: `server/**`, `shared/**`, `prompts/**`, `sql/**`, `migrations/**`.
- Small, reversible edits. Create minimal new files (repos/routes) if needed.

# NEVER DO
- Do not edit `.env*`, rotate keys, expose secrets, or change build/tooling.
- Do not delete/rename existing files.
- Do not alter DB schema/migrations unless explicitly told.

# ATOMIC STEP MODE
- Max 2 files changed, ≤200 lines total. If more is required: propose a plan and WAIT.

# CHECKLIST (must appear in your reply)
- All tables/columns used exist in `shared/schema.ts`.
- Types match; FKs honored; RLS respected (client vs server).
- No disallowed files touched; diffs are minimal.

# OUTPUT
- Unified diff only, plus 1–2 line summary per file, plus minimal run/test commands.

# ESCALATE WHEN
- Seeds needed (e.g., `status_*`) → write `sql/*.sql` but do NOT run.
- New env vars or schema changes needed → ask first.
