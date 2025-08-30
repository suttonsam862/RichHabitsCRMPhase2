# Organizations Feature - Production RUNBOOK

## Quick Start Testing

1. **Start dev server**: The application automatically starts with `npm run dev`

2. **Open /organizations**: Navigate to the organizations page to see the empty state

3. **Upload logos successfully**: 
   - Click "Add Organization" button
   - In the Branding tab, upload SVG & PNG logos (max 4MB)
   - Preview should display immediately

4. **Create organization**: 
   - Fill in required name field
   - Toggle is_business to test both School/Business types
   - Submit to create organization

5. **Test filters**: 
   - Search by name using the search input
   - Filter by state using the dropdown
   - Filter by type (School/Business/All)
   - Sort by name or created date (asc/desc)
   - Test pagination with different page sizes

6. **Edit organization**: 
   - Click on any organization card
   - Edit name, state, or other fields
   - Verify changes persist after save

7. **Delete organization**: 
   - Click on organization card
   - Use delete action in the modal
   - Confirm removal from list

8. **Verify logging**: 
   - Check console for request IDs and timing
   - No Radix dialog warnings should appear
   - No schema validation errors in logs

## Database Management

### Seed Demo Data
```bash
tsx scripts/seed-organizations.ts
```

### Check Database Schema
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'organizations';
```

### Verify Indexes & Constraints
```sql
-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'organizations';

-- Check constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'organizations'::regclass;
```

## API Endpoints

### List Organizations
```bash
# Basic listing
curl http://localhost:5000/api/organizations

# With filters and pagination
curl "http://localhost:5000/api/organizations?q=school&state=CA&type=school&sort=name&order=asc&page=1&pageSize=20"
```

### Create Organization
```bash
curl -X POST http://localhost:5000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "state": "CA",
    "is_business": false
  }'
```

### Update Organization
```bash
curl -X PATCH http://localhost:5000/api/organizations/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "state": "TX"
  }'
```

### Delete Organization
```bash
curl -X DELETE http://localhost:5000/api/organizations/{id}
```

### Upload Logo
```bash
curl -X POST http://localhost:5000/api/upload/logo \
  -F "file=@logo.png"
```

## Monitoring & Troubleshooting

### Check Request Logs
All requests include request IDs (rid) for tracing:
```
[abc12345] GET /api/organizations -> 200 45ms
[def67890] POST /api/organizations -> 201 120ms
```

### Common Issues

1. **Upload fails with size error**
   - Max file size is 4MB
   - Allowed formats: PNG, JPEG, WebP, SVG

2. **State validation fails**
   - States must be 2-letter uppercase codes (e.g., "CA", "TX")

3. **Pagination issues**
   - Max pageSize is 50
   - Page must be >= 1

4. **Schema validation errors**
   - Check fieldErrors in response for specific field issues
   - Email must be valid format if provided
   - Name is required and max 120 characters

## Performance Optimization

- Index on `lower(name)` for case-insensitive search
- Minimal projection in listing (only essential fields)
- Debounced search input (300ms)
- Server-side pagination to limit data transfer

## Security Considerations

- File upload restricted to specific MIME types
- SQL injection protected via parameterized queries (Drizzle ORM)
- Request size limits enforced
- Proper error handling without exposing internals