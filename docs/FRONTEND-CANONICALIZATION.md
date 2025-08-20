# Frontend Canonicalization Migration

**Date:** August 20, 2025  
**Objective:** Consolidate split-brain React architecture into single canonical `client/src/` tree  
**Status:** In Progress  

## Background

The audit discovered a split-brain frontend architecture with duplicate React applications:
- **Primary:** `client/src/` (8 pages, 66 components) - Modern, complete app
- **Legacy:** `src/` (5 files) - Duplicate quote functionality, causing export collisions

## Migration Analysis

### Files in Legacy `./src` Tree

```
./src/
├── App.tsx                    # DUPLICATE - superseded by client/src/App.tsx
├── hooks/
│   └── use-debounce.ts        # DUPLICATE - superseded by client/src/hooks/use-debounce.ts
├── lib/
│   └── quoteStore.ts          # DUPLICATE - superseded by client/src/lib/quoteStore.ts
└── pages/
    ├── QuoteGenerator.tsx     # DUPLICATE - superseded by client/src/pages/QuoteGenerator.tsx
    └── QuoteHistory.tsx       # DUPLICATE - superseded by client/src/pages/QuoteHistory.tsx
```

### Files in Canonical `client/src/` Tree

- **Complete Application:** 8 pages, 66 components
- **UI Components:** Full shadcn/ui component library
- **Quote Functionality:** Modern implementation with enhanced features
- **Organization Management:** Complete CRUD functionality
- **User Management:** Admin interfaces

### Migration Decision Matrix

| File | Legacy Location | Canonical Location | Action | Reason |
|------|----------------|-------------------|---------|---------|
| App.tsx | `src/` | `client/src/` | Use canonical | Client version has full routing and layout |
| use-debounce.ts | `src/hooks/` | `client/src/hooks/` | Use canonical | Identical implementations |
| quoteStore.ts | `src/lib/` | `client/src/lib/` | Use canonical | Client version more complete |
| QuoteGenerator.tsx | `src/pages/` | `client/src/pages/` | Use canonical | Client version has enhanced UI |
| QuoteHistory.tsx | `src/pages/` | `client/src/pages/` | Use canonical | Client version integrated with app |

### Import Analysis

**Cross-references checked:**
- ✅ No imports from `./src` found in `client/src/`
- ✅ No imports from `../src` found in `client/`
- ✅ Safe to move legacy files without breaking imports

## Migration Steps

### Phase 1: Create Safety Net ✅ COMPLETED
- [x] Audit existing structure
- [x] Identify all files in legacy tree
- [x] Confirm no cross-references exist
- [x] Create timestamp-based legacy archive: `client/_legacy/src-20250820_203007/`

### Phase 2: Establish Canonical Guardrails ✅ COMPLETED
- [x] Add canonical root marker in `client/src/guard/no-cross-root.ts`
- [x] Configure ESLint to prevent cross-root imports (`.eslintrc.json` created)
- [x] Path aliases already correctly configured in vite.config.ts

### Phase 3: Archive Legacy Files ✅ COMPLETED
- [x] Create `client/_legacy/src-20250820_203007/` directory
- [x] Move all `./src` files to legacy archive
- [x] Preserve directory structure in archive
- [x] Safely remove legacy `./src` directory

### Phase 4: Path Configuration ✅ COMPLETED
- [x] Vite config already properly configured: `"@": client/src`
- [x] TypeScript config already properly configured: `"@/*": ["./client/src/*"]`
- [x] Fixed schema.ts SQL function calls

### Phase 5: Build Verification ⚠️ IN PROGRESS
- [x] Fixed schema.ts compilation errors
- [ ] Ensure `npm run dev` serves only from client
- [ ] Verify all imports resolve correctly
- [ ] Confirm no 404s or missing modules
- [ ] Test build process

## File Comparison Details

### App.tsx Comparison
- **Legacy:** Basic component, minimal routing
- **Canonical:** Full application with AppLayout, route transitions, query client setup
- **Decision:** Keep canonical version (more complete)

### QuoteGenerator.tsx Comparison  
- **Legacy:** Basic quote generation functionality
- **Canonical:** Enhanced UI with form validation, error handling, integration with app theme
- **Decision:** Keep canonical version (better UX)

### quoteStore.ts Comparison
- **Legacy:** Core quote storage functionality
- **Canonical:** Same functionality with additional utilities
- **Decision:** Keep canonical version (more complete)

## Post-Migration Checklist

### ✅ Safety Verification
- [ ] All legacy files archived in `client/_legacy/src-[timestamp]/`
- [ ] No files deleted permanently
- [ ] Directory structure preserved in archive
- [ ] Archive contains complete git history reference

### ✅ Path Configuration
- [ ] `client/tsconfig.json` updated with `baseUrl: "./src"`
- [ ] `client/tsconfig.json` paths configured: `"@/*": ["src/*"]`
- [ ] `vite.config.ts` alias updated: `"@": path.resolve(__dirname, "client", "src")`
- [ ] Top-level tsconfig no longer references legacy paths

### ✅ Guardrails Established
- [ ] `client/src/guard/no-cross-root.ts` created with canonical root marker
- [ ] ESLint rule added to prevent imports from top-level `./src`
- [ ] Build process validates no cross-root imports exist

### ✅ Build System
- [ ] `npm run dev` serves exclusively from client directory
- [ ] Vite dev server starts on expected port (5173)
- [ ] All routes resolve correctly in development
- [ ] Build process completes without errors
- [ ] Production build serves correctly

### ✅ Import Resolution
- [ ] All `@/` imports resolve to `client/src/`
- [ ] No broken imports or 404 errors
- [ ] Hot module replacement works correctly
- [ ] No console errors related to module resolution

### ✅ Functionality Testing
- [ ] Quote Generator page loads and functions
- [ ] Quote History page loads and functions  
- [ ] All existing app functionality preserved
- [ ] No regressions in user workflows
- [ ] Component library (shadcn/ui) works correctly

### ✅ Code Quality
- [ ] No TypeScript compilation errors
- [ ] No ESLint violations related to imports
- [ ] All tests pass (if applicable)
- [ ] No console warnings in development

## Rollback Plan

If issues are discovered:

1. **Immediate Rollback:**
   ```bash
   # Restore legacy files from archive
   cp -r client/_legacy/src-[timestamp]/* ./src/
   
   # Revert config changes
   git checkout -- tsconfig.json vite.config.ts
   ```

2. **Investigate Issues:**
   - Check specific import failures
   - Verify path resolution
   - Test individual components

3. **Incremental Re-migration:**
   - Fix specific issues identified
   - Re-run migration steps one by one
   - Test each step thoroughly

## Success Criteria

- ✅ Single canonical React application in `client/src/`
- ✅ No export collisions between frontend trees
- ✅ Consistent path alias resolution
- ✅ Clean development and build processes
- ✅ All functionality preserved
- ✅ No performance regressions
- ✅ Clear guardrails prevent future splits

## Notes

- **Legacy Preservation:** All original files preserved in timestamped archive
- **Zero Data Loss:** No files deleted, only moved to safe location
- **Incremental Approach:** Each step can be verified before proceeding
- **Reversible Process:** Complete rollback plan available if needed

---

**Migration Owner:** AI Assistant  
**Review Required:** After completion, verify all checklist items
**Timeline:** Immediate (all steps can be completed in single session)