# 🛠️ Debugging & Development Notes

## Fast Checks
- Env: `npm run db:preflight`
- Schema: `npm run db:validate`
- If schema fails: `npm run db:migrate:apply` → `npm run db:refresh` → `npm run db:validate`

## Data Truth vs API Shape
- Query SQL for truth; if API differs, refresh schema or fix the view/projection
- Do not suppress or "force" flags; solve the mapping

## Permissions (RLS)
- Reproduce with anon vs service-role keys
- Fix policies (least privilege), don't widen PUBLIC/anon

## Types & Tests
- Regenerate types; fix compile errors first
- Write the smallest failing test; make it pass; re-run suite

## Rollback
- Keep fixes minimal and reversible; if destructive needed, request approval