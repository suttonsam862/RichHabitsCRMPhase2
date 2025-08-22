# Change Requests (CR) — How every feature lands

**Why:** No more freestyle edits. Every change flows through a structured spec so AI/humans modify the right layers (domain → DB → API → UI) with tests/checks.

**Process**
1) Author a CR YAML (copy `cr_template.yaml`).
2) Save it under `/architecture/crs/YYYY-MM-DD-<slug>.yaml`.
3) Apply changes exactly as the CR says (migration, DTO, API, UI).
4) Run `npm run preflight`. Fix anything it flags.
5) Commit code + the CR file together.

**Rules**
- One truth for data contracts (shared DTOs). Don’t add fields in code without updating DTOs.
- DB changes require a migration file. No silent schema drift.
- New API → add to the proper router under `server/routes/<domain>/`.
- Frontend must use shared API helpers/types. No ad-hoc `fetch()` to raw URLs.
- Never modify `/client/_legacy` (archived).
