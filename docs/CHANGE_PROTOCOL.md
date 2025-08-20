# Change Protocol

This document defines the step-by-step process for making changes to the codebase safely and consistently.

## Before You Touch Code

### 1. Run Preflight Checks
```bash
npm run preflight
```
This command:
- Maps repository structure → `docs/REPO_MAP.md`
- Inventories API routes → `docs/ROUTE_SURFACE.md`  
- Runs TypeScript compilation check
- Validates critical files exist

### 2. Review Architecture State
- Open `docs/REPO_MAP.md` - Confirm file locations match expectations
- Open `docs/ROUTE_SURFACE.md` - Understand current API surface
- Open `docs/ARCHITECTURE_GUIDE.md` - Review relevant patterns

### 3. Verify File Locations
- Confirm the files you plan to edit exist where the guide says they should
- Check that you're not about to edit read-only areas (`client/_legacy/`)
- Ensure you understand the ownership rules (Express owns `/api/*`)

## When You Implement

### Adding API Endpoints
1. **Create route handler**: `server/routes/<domain>/index.ts`
2. **Export router**: Ensure router is exported and mounted in `server/routes/api.ts`
3. **Create service**: Add business logic in `server/services/<domain>.ts`
4. **Define DTOs**: Add/update schemas in `shared/dtos/<Domain>DTO.ts`
5. **Update client SDK**: Add methods to `client/src/lib/api-sdk.ts`
6. **Mount route**: Ensure route is mounted under `/api/<domain>` prefix

### Adding UI Pages/Components
1. **Register route**: Add route definition to `client/src/routes.tsx`
2. **Create component**: Add component file to `client/src/pages/` or `client/src/components/`
3. **Use API SDK**: Call backend via SDK methods, never direct `fetch()`
4. **Type safety**: Use shared DTOs for type annotations

### Data Contract Changes
1. **Update shared DTO**: Modify Zod schema in `shared/dtos/`
2. **Update service layer**: Add `dbToDto`/`dtoToDb` mapping if needed
3. **Update client SDK**: Ensure SDK methods use updated types
4. **Update route handlers**: Ensure validation uses updated schemas
5. **Test both sides**: Verify client and server handle changes correctly

### Database Changes
1. **Create migration**: Add SQL migration file to `migrations/`
2. **Update schema**: Modify `shared/schema.ts` Drizzle definitions
3. **Update DTOs**: Ensure shared DTOs match new schema
4. **Update services**: Add database operations for new fields
5. **Run migration**: Execute `npm run db:push`

## After You Implement

### 1. Update Documentation
```bash
npm run routes:list  # Updates docs/ROUTE_SURFACE.md
```

### 2. Run Full Validation
```bash
npm run check  # TypeScript + preflight + lint
```

### 3. Update Architecture Docs (if needed)
- If you moved files: `npm run map` → commit updated `docs/REPO_MAP.md`
- If you changed major patterns: update `docs/ARCHITECTURE_GUIDE.md`
- If you added new domains: document in relevant architecture sections

### 4. Validate End-to-End
- Test API endpoints with proper request/response formats
- Verify UI correctly handles API responses
- Check error cases and validation

## PR Template

Include this checklist in your PR description:

```markdown
## Change Protocol Checklist

### Before Implementation
- [ ] Ran `npm run preflight` successfully
- [ ] Reviewed `docs/REPO_MAP.md` and `docs/ROUTE_SURFACE.md`
- [ ] Confirmed file locations match architecture guide

### Implementation  
- [ ] API routes created under `/api/<domain>` prefix
- [ ] UI routes registered in `client/src/routes.tsx`
- [ ] Shared DTOs updated for data contract changes
- [ ] Client SDK updated for new API methods
- [ ] Database migrations created (if applicable)

### After Implementation
- [ ] Updated `docs/ROUTE_SURFACE.md` via `npm run routes:list`
- [ ] Ran `npm run check` successfully
- [ ] Updated architecture docs (if patterns changed)
- [ ] Tested end-to-end functionality

### Architecture Compliance
- [ ] No direct `fetch()` calls in React components
- [ ] Express owns all `/api/*` routes
- [ ] No edits to `client/_legacy/` files
- [ ] Used shared DTOs for API communication
- [ ] Followed snake_case ↔ camelCase mapping rules
```

## Emergency Procedures

### Rollback Changes
If changes break the system:
1. Revert commits that introduced the break
2. Run `npm run preflight` to verify clean state  
3. Update documentation to reflect current state
4. Investigate root cause before re-attempting

### Schema Migration Issues
If database migrations fail:
1. Check migration syntax in `migrations/` directory
2. Verify `shared/schema.ts` matches intended database state
3. Use `npm run db:push --force` only if data loss is acceptable
4. Consider manual database fixes for production data

### Route Conflicts
If routes stop working:
1. Check `docs/ROUTE_SURFACE.md` for conflicts
2. Verify router mounting order in `server/routes/api.ts`
3. Ensure no duplicate route definitions
4. Test route resolution with explicit curl commands

## Quick Reference

| Task | Command | Result |
|------|---------|--------|
| Check before changes | `npm run preflight` | Structure + routes + types |
| Map repository | `npm run map` | `docs/REPO_MAP.md` |
| List API routes | `npm run routes:list` | `docs/ROUTE_SURFACE.md` |
| Check types | `npm run typecheck` | TypeScript validation |
| Full validation | `npm run check` | All checks combined |

Last updated: ${new Date().toISOString()}