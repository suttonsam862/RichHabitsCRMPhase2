# Schema Normalization Plan

## Current State

The database has a mix of ID types due to historical reasons:

### VARCHAR IDs (String-based)
- `organizations.id` - VARCHAR (primary key)
- `orders.id` - VARCHAR (primary key)
- `orders.organization_id` - VARCHAR (foreign key)
- `org_sports.organization_id` - VARCHAR (foreign key)

### UUID IDs
- `customers.id` - UUID
- `customers.org_id` - UUID
- `catalog_items.id` - UUID
- `catalog_items.org_id` - UUID
- `organization_memberships.organization_id` - UUID
- `user_roles.org_id` - UUID

## Constraints

Due to production data integrity concerns, we cannot change primary key column types without risking data loss. The current mixed-type approach is handled through:

1. **Function Overloading**: Security functions (`is_org_member`, `is_org_admin`) have both UUID and TEXT versions
2. **Type Casting**: RLS policies use appropriate type casting (e.g., `::text` or `::uuid`)
3. **Join Strategies**: Queries handle type mismatches through explicit casting

## Mitigation Strategy

### 1. Application Layer Handling
- All new code should handle both VARCHAR and UUID org IDs
- Use type-safe functions that accept both formats
- Validate UUIDs before casting to prevent errors

### 2. Database Functions
```sql
-- Example of dual-type support
CREATE FUNCTION is_org_member(uid UUID, org UUID) ...
CREATE FUNCTION is_org_member(uid TEXT, org TEXT) ...
```

### 3. Future Migration Path

When ready for a full migration:
1. Create new UUID columns alongside VARCHAR columns
2. Dual-write to both columns for a transition period
3. Migrate all foreign key references
4. Switch primary operations to UUID columns
5. Drop VARCHAR columns after verification

## Current RLS Policy Support

All RLS policies have been updated to handle the mixed types:
- Organizations table: Uses TEXT casting for VARCHAR IDs
- Orders table: Uses TEXT casting for VARCHAR organization_id
- Customers/Catalog Items: Use native UUID types
- Membership tables: Use UUID with conversion logic

## Testing Requirements

1. Test cross-type joins between organizations (VARCHAR) and memberships (UUID)
2. Verify RLS policies work correctly with both ID types
3. Ensure API endpoints handle both ID formats
4. Validate type casting in security functions