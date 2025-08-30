# 🔗 CR File Usage

## When to Use CRs
- Major edits (schema/API/architecture). Place as `/cr/*.yaml`.
- CR defines tasks, files, and gate order; the agent must obey.

## Between CR Runs
- Use `DEBUG.md` playbook and `npm run db:*` scripts
- Keep fixes small; if scope grows, draft a new CR

## Flow
1) PLAN → ENV → SCHEMA → AUTH/RLS → TYPES → LINT → UNIT/INTEG/E2E → DOCS
2) Implement
3) FINAL_VALIDATE and update checklist/snapshot