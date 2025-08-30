# Organizations API - Enhanced Validation Summary

## Overview
Enhanced the create-org API endpoint with strict zod validation, comprehensive error handling, and proper content-type validation for logos.

## ✅ Validation Enhancements

### 1. **Strict Zod Schema Validation** 
```typescript
// Enhanced validation in shared/schemas/organization.ts
export const OrgBase = z.object({
  name: z.string()
    .min(1, "Organization name is required")
    .max(120, "Organization name cannot exceed 120 characters")
    .trim()
    .refine(name => name.length > 0, "Organization name cannot be empty after trimming"),
  
  logo_url: z.string()
    .url("Logo URL must be a valid URL")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  
  phone: z.string()
    .regex(/^[\d\s\-\(\)\+\.x]+$/, "Phone number contains invalid characters")
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number cannot exceed 20 characters")
    .optional(),
  
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters")
    .optional(),
  
  universal_discounts: z.record(
    z.string().min(1, "Discount key cannot be empty"), 
    z.number().min(0, "Discount value must be non-negative").max(100, "Discount cannot exceed 100%")
  ).default({})
});
```

### 2. **Content-Type Validation**
- ✅ Strict `application/json` requirement
- ✅ Rejects requests with incorrect content types
- ✅ Returns clear error messages for content type issues

### 3. **Logo Upload Validation**
```typescript
// Enhanced in server/routes/upload.ts
fileFilter: (req, file, cb) => {
  // Strict allowlist: PNG, JPEG, JPG, SVG only
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg'];
  
  const fileExt = file.originalname.split('.').pop()?.toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && fileExt && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type. Only PNG, JPG/JPEG, and SVG files are allowed. Received: ${file.mimetype} (${fileExt})`);
    error.name = 'INVALID_FILE_TYPE';
    cb(error);
  }
}
```

### 4. **Enhanced Error Handling**
```typescript
// Database-specific error handling
if (err.code === '23505') { // Unique constraint violation
  return res.status(409).json({
    error: "Duplicate entry",
    message: "Organization with this name already exists",
    constraint: err.constraint
  });
}

if (err.code === '23502') { // Not null violation
  return res.status(400).json({
    error: "Missing required field",
    message: `Required field cannot be null: ${err.column}`,
    field: err.column
  });
}
```

### 5. **Business Logic Validation**
- ✅ **Duplicate name detection** - Case-insensitive check
- ✅ **Logo URL domain validation** - Ensures URLs from trusted domains
- ✅ **Field-specific validation** - Each field has appropriate constraints

## 🧪 Test Coverage

### Test Script: `scripts/test-create-org.sh`

**Valid Test Cases:**
- ✅ Business organization with full details
- ✅ Individual customer with minimal data  
- ✅ Organization with only required fields

**Validation Error Tests:**
- ❌ Missing required name → 400 error
- ❌ Empty name after trimming → 400 error
- ❌ Invalid email format → 400 error
- ❌ Invalid state code → 400 error
- ❌ Phone too short → 400 error
- ❌ Invalid phone characters → 400 error
- ❌ Invalid logo URL → 400 error
- ❌ Invalid content type → 400 error

**Business Logic Tests:**
- ❌ Duplicate organization name → 409 error

## 📋 Example API Responses

### ✅ Successful Creation (201)
```json
{
  "success": true,
  "message": "Organization created successfully",
  "organization": {
    "id": "bc2b149f-2026-40e6-97cb-d1625fbb9e88",
    "name": "Acme Corporation",
    "logo_url": "https://example.com/logo.png",
    "state": "CA",
    "address": "123 Business Ave, San Francisco, CA 94105",
    "phone": "+1 (555) 123-4567",
    "email": "contact@acmecorp.com",
    "is_business": true,
    "notes": "Premium client with custom requirements",
    "universal_discounts": {"bulk_order": 15, "repeat_customer": 10},
    "created_at": "2025-08-17T01:25:50.556Z",
    "updated_at": "2025-08-17T01:25:50.556Z"
  },
  "meta": {
    "createdAt": "2025-08-17T01:25:50.556Z",
    "requestId": "bf5926d5"
  }
}
```

### ❌ Validation Error (400)
```json
{
  "error": "Validation failed",
  "message": "One or more fields contain invalid data",
  "fieldErrors": {
    "email": "Invalid email format",
    "phone": "Phone number must be at least 10 digits"
  },
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    },
    {
      "field": "phone", 
      "message": "Phone number must be at least 10 digits",
      "value": "123"
    }
  ]
}
```

### ❌ Duplicate Name Error (409)
```json
{
  "error": "Duplicate organization name",
  "message": "An organization with the name \"Acme Corporation\" already exists",
  "existingId": "bc2b149f-2026-40e6-97cb-d1625fbb9e88"
}
```

### ❌ Content Type Error (400)
```json
{
  "error": "Invalid content type",
  "message": "Request must be application/json",
  "received": "text/plain"
}
```

## 🚀 Usage Instructions

### Run Test Suite
```bash
chmod +x scripts/test-create-org.sh
./scripts/test-create-org.sh
```

### Test Individual Endpoint
```bash
curl -X POST http://localhost:5000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Organization",
    "logo_url": "https://example.com/logo.png",
    "state": "CA",
    "phone": "555-123-4567",
    "email": "test@example.com",
    "is_business": true
  }' | jq .
```

## 🔧 Database Schema Alignment

**Database Columns (snake_case):**
- `id`, `name`, `logo_url`, `state`, `address`, `phone`, `email`
- `universal_discounts`, `notes`, `created_at`, `is_business`, `updated_at`

**API Payload (snake_case):**
- Consistent mapping between client payload and database columns
- No camelCase conversion required on the frontend

## 🛡️ Security Features

1. **Input Sanitization** - All text fields trimmed and validated
2. **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
3. **File Type Validation** - Strict allowlist for logo uploads
4. **Size Limits** - 4MB limit for file uploads, 2000 char limit for notes
5. **Domain Validation** - Logo URLs checked against trusted domains

## ⚡ Performance Optimizations

1. **Database Indexes** - Optimized queries with proper indexing
2. **Early Validation** - Zod validation before database operations
3. **Duplicate Detection** - Efficient case-insensitive name checking
4. **Request Logging** - Detailed logging for debugging and monitoring

---

The enhanced validation system provides comprehensive error handling, strict input validation, and detailed feedback for both successful operations and error cases.