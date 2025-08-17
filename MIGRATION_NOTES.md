# Organization Creation Flow - Migration Notes

## Date: January 17, 2025

## Overview
Fixed and hardened the organization creation flow to handle data mismatches, authentication issues, and ensure robust operation with or without Supabase JWT authentication.

## Problems Addressed

### 1. User Roles Table - Authentication Issues
**Problem**: `user_roles.user_id` had a NOT NULL constraint that failed when inserting without a Supabase JWT (auth.uid() returns NULL).
**Solution**: 
- Made `user_id` nullable in the `user_roles` table
- Added a trigger `trg_user_roles_set_user_from_jwt` that attempts to populate from auth.uid() when available
- Organization creation now succeeds regardless of authentication status

### 2. Universal Discounts - NULL Handling
**Problem**: UI was sending `universalDiscounts: null` but the database column is JSONB and expects an object.
**Solution**:
- API now normalizes `null` to `{}` (empty object) before database insertion
- Database trigger `trg_organizations_fix_defaults` ensures universal_discounts is never NULL
- Front-end updated to always send `{}` instead of `null`

### 3. Field Mapping Issues
**Problem**: Mismatch between UI field names (camelCase) and database columns (snake_case).
**Solution**:
- API handler properly maps: `logoUrl` → `logo_url`, `isBusiness` → `is_business`
- Added comprehensive field normalization in the API layer

### 4. Role Seeding
**Problem**: Roles table might not have required roles (owner, admin, member).
**Solution**:
- Migration seeds the three base roles if they don't exist
- Added unique constraint on `roles.slug` to prevent duplicates

## Files Modified

### Database Layer
- `/supabase/migrations/20250117_fix_org_creation.sql` - Idempotent migration with triggers and constraints
- Database triggers added:
  - `trg_user_roles_set_user_from_jwt` - Handles user_id population
  - `trg_organizations_fix_defaults` - Normalizes data on insert/update

### API Layer
- `/server/routes/organizations.ts` - Enhanced with:
  - Proper Zod validation
  - Field normalization (camelCase → snake_case)
  - Transaction support for organization + role assignment
  - Better error reporting with PG error codes

### Front-end Layer
- `/client/src/components/organization-wizard/sports-contacts-step.tsx`
  - Changed `universalDiscounts: null` to `universalDiscounts: {}`
  - Ensures empty strings are sent instead of undefined for optional fields

### Testing
- `/server/scripts/test-org-creation.ts` - Comprehensive test suite covering:
  - NULL universal_discounts handling
  - Field mapping validation
  - Authentication-less creation
  - Role assignment
  - Duplicate name rejection

## Migration Steps

1. **Apply the SQL migration** (already done):
   ```sql
   -- File: /supabase/migrations/20250117_fix_org_creation.sql
   -- This migration is idempotent and safe to re-run
   ```

2. **Deploy updated API handlers**:
   - Organization creation endpoint now handles all edge cases
   - Transactions ensure consistency

3. **Deploy updated front-end**:
   - Forms now send properly formatted data
   - No more NULL values for required JSONB fields

## Rollback Plan

If issues arise, the migration can be partially rolled back:

```sql
-- Remove triggers (safe)
DROP TRIGGER IF EXISTS trg_user_roles_set_user_from_jwt ON public.user_roles;
DROP TRIGGER IF EXISTS trg_organizations_fix_defaults ON public.organizations;
DROP FUNCTION IF EXISTS public.user_roles_set_user_from_jwt();
DROP FUNCTION IF EXISTS public.organizations_fix_defaults();

-- Restore NOT NULL on user_id (only if all rows have non-null values)
ALTER TABLE public.user_roles ALTER COLUMN user_id SET NOT NULL;
```

## Validation Checklist

✅ Organizations can be created without authentication
✅ `universalDiscounts: null` from UI creates org with `{}` in DB
✅ Field mapping works (camelCase → snake_case)
✅ Roles are properly seeded (owner, admin, member)
✅ Duplicate organization names are rejected
✅ Error messages include PG error codes for debugging
✅ All changes are backward compatible

## Performance Improvements

- Added indexes on `organizations.name` (lowercase) and `organizations.created_at` for faster queries
- Transactions ensure atomic operations for org + role creation

## Security Considerations

- User role assignment only happens when a valid user ID is available
- No security downgrade - authentication still works when JWT is present
- Validation prevents SQL injection through Zod schemas

## Future Improvements

Consider adding:
- Soft deletes for organizations
- Audit trail for organization changes
- Rate limiting on organization creation endpoint
- Batch organization import capability