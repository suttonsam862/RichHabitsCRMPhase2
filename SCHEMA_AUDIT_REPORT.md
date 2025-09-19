# Database Schema vs Code Audit Report
*Generated: September 19, 2025*
*Task: ORD-10 Schema Audit and Mismatch Fixes*

## Executive Summary

This audit reveals **critical mismatches** between the actual PostgreSQL database structure and the application code (Drizzle schema definitions, service layers, and DTOs). The application has **68 database tables** but the Drizzle schema in `shared/schema.ts` only defines **27 tables**, missing 41 critical tables.

### Severity Assessment
- **CRITICAL**: 41 missing tables in schema definitions
- **HIGH**: Extensive column name mismatches (camelCase vs snake_case)
- **MEDIUM**: Missing foreign key constraints and indexes
- **LOW**: Minor data type inconsistencies

## 1. Missing Tables Analysis

### Tables Present in Database but Missing from Drizzle Schema:

#### Core Business Tables (CRITICAL):
1. `completion_records` - Order completion tracking
2. `fulfillment_events` - Fulfillment workflow events
3. `fulfillment_milestones` - Fulfillment milestone tracking
4. `order_events` - Order lifecycle events
5. `order_item_sizes` - Size breakdown for order items
6. `org_sports` - Organization-sport relationship management
7. `organization_favorites` - User organization favorites
8. `organization_memberships` - User-organization membership
9. `organization_metrics` - Organization performance data
10. `production_events` - Manufacturing event tracking
11. `production_milestones` - Manufacturing milestone tracking
12. `quality_checks` - Quality control records
13. `shipping_info` - Shipping and delivery tracking
14. `shipments` - Shipment management
15. `shipment_items` - Individual shipment items
16. `users` - **CRITICAL MISSING**: Core user management table

#### Sales Management Tables (HIGH):
17. `salespeople` - Sales representative management
18. `salesperson_assignments` - Territory/account assignments
19. `salesperson_metrics` - Sales performance tracking
20. `salesperson_profiles` - Extended salesperson information

#### System Configuration Tables (MEDIUM):
21. `sports` - Available sports/categories
22. `system_regions` - Geographic regions
23. `system_settings` - Application configuration
24. `performance_tiers` - Performance-based tiers
25. `permissions` - Permission definitions
26. `permission_templates` - Permission template system
27. `roles` - Role definitions
28. `role_permissions` - Role-permission mapping
29. `user_roles` - User-role assignments

#### Status Reference Tables (LOW):
30. `status_design_jobs` - Design job status codes
31. `status_fulfillment` - Fulfillment status codes
32. `status_order_items` - Order item status codes
33. `status_orders` - Order status codes
34. `status_purchase_orders` - Purchase order status codes
35. `status_shipping` - Shipping status codes
36. `status_work_orders` - Work order status codes

## 2. Column Name Mismatches

### Pattern: DTOs use camelCase, Database uses snake_case

#### Examples in Service Layer:
```typescript
// SERVICE CODE (INCORRECT):
.select('id, org_id, order_item_id, status_code')  // snake_case (correct for DB)
.eq('org_id', orgId)  // snake_case (correct for DB)

// DTO DEFINITIONS (INCONSISTENT):
export const WorkOrderDTO = z.object({
  id: z.string(),
  orgId: z.string(),           // camelCase (wrong for DB)
  orderItemId: z.string(),     // camelCase (wrong for DB)  
  statusCode: z.string(),      // camelCase (wrong for DB)
});
```

#### Critical Mismatches by Table:

**manufacturing_work_orders**:
- DB: `org_id` → DTO: `orgId`
- DB: `order_item_id` → DTO: `orderItemId` 
- DB: `manufacturer_id` → DTO: `manufacturerId`
- DB: `status_code` → DTO: `statusCode`
- DB: `assignee_designer_id` → DTO: `assigneeDesignerId`
- DB: `created_at` → DTO: `createdAt`
- DB: `updated_at` → DTO: `updatedAt`

**design_jobs**:
- DB: `org_id` → DTO: `orgId`
- DB: `order_item_id` → DTO: `orderItemId`
- DB: `status_code` → DTO: `statusCode`

**orders**:
- DB: `organization_id` → DTO: `orgId` (also inconsistent naming)
- DB: `order_number` → DTO: `orderNumber`
- DB: `customer_name` → DTO: `customerName`
- DB: `status_code` → DTO: `statusCode`
- DB: `salesperson_id` → DTO: `salespersonId`
- DB: `sport_id` → DTO: `sportId`
- DB: `customer_id` → DTO: `customerId`
- DB: `team_name` → DTO: `teamName`
- DB: `customer_contact_name` → DTO: `customerContactName`
- DB: `customer_contact_email` → DTO: `customerContactEmail`
- DB: `customer_contact_phone` → DTO: `customerContactPhone`
- DB: `revenue_estimate` → DTO: `revenueEstimate`
- DB: `due_date` → DTO: `dueDate`

## 3. Missing Database Constraints

### Foreign Key Constraints Missing in Schema:

1. **manufacturing_work_orders**:
   - Missing FK to `organizations(id)` on `org_id`
   - Missing FK to `order_items(id)` on `order_item_id` 
   - Missing FK to `manufacturers(id)` on `manufacturer_id`

2. **materials**:
   - Missing FK to `organizations(id)` on `org_id`
   - Missing FK to `manufacturers(id)` on `preferred_supplier_id`

3. **purchase_orders**:
   - Missing FK to `organizations(id)` on `org_id`
   - Missing FK to `manufacturers(id)` on `supplier_id`
   - Missing FK to `users(id)` on `requested_by`

4. **All tables missing user FKs**:
   - No foreign keys to `users` table (which is completely missing from schema)

### Indexes Missing in Schema:

1. **Performance Indexes**:
   - Missing org-based filtering indexes on all tables
   - Missing status code indexes for query performance
   - Missing timestamp indexes for date range queries

2. **Unique Constraints**:
   - Missing unique constraints on natural keys (e.g., PO numbers, order codes)

## 4. Service Layer Analysis

### Issues Found in Service Files:

#### workOrderService.ts:
```typescript
// CORRECT: Uses snake_case for DB queries
const { data: workOrder, error: workOrderError } = await sb
  .from('manufacturing_work_orders')
  .select('*')
  .eq('id', workOrderId)
  .eq('org_id', orgId)  // ✓ Correct snake_case

// PROBLEMATIC: Returns camelCase in response
return {
  id: workOrder.id,
  orgId: workOrder.org_id,        // ✗ Manual mapping required
  orderItemId: workOrder.order_item_id,  // ✗ Manual mapping required
};
```

#### designJobService.ts:
```typescript
// CORRECT: Uses snake_case for DB operations
const { data: newDesignJob, error: createError } = await sb
  .from('design_jobs')
  .insert({
    org_id: orgId,                // ✓ Correct
    order_item_id: orderItemId,   // ✓ Correct
    status_code: options.statusCode || 'queued', // ✓ Correct
  })

// PROBLEMATIC: Manual transformation to camelCase
return {
  id: newDesignJob.id,
  orgId: newDesignJob.org_id,     // ✗ Inconsistent naming
  statusCode: newDesignJob.status_code, // ✗ Manual mapping
};
```

## 5. DTO Consistency Issues

### Serialization/Deserialization Problems:

1. **FulfillmentService** uses manual transformers:
   ```typescript
   // fulfillmentTransformers.ts - Manual field mapping
   export const serializeShippingInfo = (dto: ShippingInfoType) => ({
     org_id: dto.orgId,           // Manual camelCase → snake_case
     order_id: dto.orderId,       // Manual mapping
     status_code: dto.statusCode, // Manual mapping
   });
   ```

2. **Missing Type Safety**: Manual mappings bypass TypeScript type checking

3. **Inconsistent Field Names**: Some DTOs use different field names than database

## 6. Data Type Mismatches

### Minor but Important Issues:

1. **UUID vs VARCHAR**: Some tables use `character varying` instead of `uuid` for ID fields
2. **Timestamp Types**: Inconsistent use of `timestamp with time zone` vs `timestamp without time zone`
3. **Numeric Precision**: Some numeric columns have different precision/scale definitions

## Recommended Fix Strategy

### Phase 1: Critical Foundation (IMMEDIATE)
1. Add missing core tables to Drizzle schema (`users`, `orders` with all columns, `org_sports`)
2. Fix column name consistency by updating Drizzle schema to use snake_case
3. Add critical foreign key constraints

### Phase 2: Service Layer Alignment (HIGH PRIORITY)
1. Update all service methods to use proper Drizzle ORM patterns
2. Remove manual field mapping by using consistent naming
3. Add proper type safety throughout

### Phase 3: Complete Schema Coverage (MEDIUM PRIORITY)
1. Add all remaining missing tables to schema
2. Add all missing indexes for performance
3. Add remaining foreign key constraints

### Phase 4: Validation and Testing (LOW PRIORITY)
1. Validate all queries work with updated schema
2. Test all service methods
3. Update any remaining DTO mismatches

## Impact Assessment

### Risks of Current State:
- **Runtime Failures**: Queries may fail due to missing table definitions
- **Type Safety Loss**: Manual mapping bypasses TypeScript protection
- **Performance Issues**: Missing indexes cause slow queries
- **Data Integrity**: Missing foreign key constraints allow orphaned records
- **Maintainability**: Manual mappings increase code complexity

### Benefits of Fixes:
- **Full Type Safety**: Drizzle ORM provides complete type checking
- **Better Performance**: Proper indexes improve query speed
- **Data Integrity**: Foreign key constraints prevent orphaned data
- **Code Simplification**: Remove manual field mapping code
- **Future Scalability**: Complete schema enables new features

---

*This audit was conducted by examining actual database structure via SQL queries and comparing against Drizzle schema definitions, service implementations, and DTO types.*