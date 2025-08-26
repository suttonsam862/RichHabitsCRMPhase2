# 🛡️ HARDENED ORGANIZATIONS API

## ⚠️ CRITICAL: DO NOT MODIFY WITHOUT TESTING

This API has been hardened against schema changes and connection issues. Any modifications require full testing.

## 🔒 Protected Components

### 1. OrganizationsService.ts
- **HARDENED SERVICE**: Contains column definitions and data transformation
- **Required Columns**: Documented and verified
- **Safe Defaults**: Handles missing fields gracefully
- **DO NOT MODIFY** column lists without database verification

### 2. Database Schema Requirements
```sql
-- CORE COLUMNS (required)
id, name, is_business, brand_primary, brand_secondary
tags, status, is_archived, created_at, updated_at, logo_url

-- SETUP COLUMNS (confirmed 2025-08-26)
finance_email, setup_complete, setup_completed_at, tax_exempt_doc_key
```

### 3. PostgREST Cache Management
- Run `tsx scripts/db/reload-postgrest.ts` after schema changes
- Cache issues cause "column does not exist" errors

## 🔧 Troubleshooting

### Organizations Not Loading
1. Check database connection: `npm run db:selftest`
2. Reload PostgREST: `tsx scripts/db/reload-postgrest.ts`
3. Verify columns: Check `OrganizationsService.ts` column lists
4. Check logs for detailed error messages

### Setup Features Not Working
1. Verify setup columns exist in database
2. Check `setupComplete` field is properly mapped
3. Ensure users have Admin/Sales roles for setup buttons

## 🚨 Emergency Recovery
If organizations stop loading:
1. Revert to basic columns in `OrganizationsService.ts`
2. Remove setup columns from `ALL_COLUMNS` array
3. Use defaults in `transformOrganization` method
4. Gradually add columns back after verification

## ✅ Verified Working (2025-08-26)
- Organizations list API with all setup fields
- Yellow neon highlights for incomplete setups  
- Setup buttons for Admin/Sales users
- PostgREST cache reload functionality
- Authentication persistence on refresh