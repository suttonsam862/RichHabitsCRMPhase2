# CR-2025-08-29: Logo Upload Workflow Cementing

## Overview
This CR documents and cements the logo upload workflow to prevent future breakage and provides guidelines for replicating the image upload process across the application.

## Problem Statement
Logo uploads were failing due to:
- Incorrect API endpoint paths
- Missing two-step upload process
- PostgreSQL syntax errors from non-existent routes
- Inconsistent error handling

## Solution: Two-Step Upload Process

### Architecture
The logo upload system uses a **two-step process** that is now standardized and must be preserved:

1. **Step 1: Upload File** → `/api/v1/upload/logo`
2. **Step 2: Apply Logo** → `/api/v1/organizations/:id/logo/apply`

### Technical Implementation

#### Server-Side Endpoints

**Upload Endpoint: `POST /api/v1/upload/logo`**
- Location: `server/routes/upload.ts`
- Function: Handles multipart file upload to Supabase storage
- Returns: `{ path, url, contentType }`
- Bucket: `org-logos` in Supabase storage

**Apply Endpoint: `POST /api/v1/organizations/:id/logo/apply`**
- Location: `server/routes/organizations/hardened.ts` (lines 621-643)
- Function: Updates organization's `logo_url` field in database
- Input: `{ key: "org-logos/filename.ext" }`
- Returns: Success/error response

#### Client-Side Implementation Pattern

```javascript
// Step 1: Upload file
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/v1/upload/logo', {
  method: 'POST',
  body: formData,
});

const uploadResult = await response.json();

// Step 2: Apply the logo using the uploaded file's path
const logoPath = uploadResult.path; // Use the path returned from upload
const applyResult = await api.post(`/api/v1/organizations/:id/logo/apply`, {
  key: logoPath
});
```

## Critical Implementation Rules

### 🚨 NEVER CHANGE THESE ENDPOINTS
1. **Upload endpoint**: `/api/v1/upload/logo` (NOT `/api/upload/logo`)
2. **Apply endpoint**: `/api/v1/organizations/:id/logo/apply` (NOT `/api/v1/organizations/:id/logo`)
3. **Parameter name**: `key` (NOT `filename`)
4. **Response field**: Use `uploadResult.path` (NOT `uploadResult.filename`)

### 🔒 Data Flow Integrity
1. Upload returns `{ path, url, contentType }`
2. Apply uses the `path` field as the `key` parameter
3. Database stores the `key` in `logo_url` field
4. Logo serving endpoint handles both storage keys and full URLs

## Error Prevention Guidelines

### Frontend Validation
- Always check `uploadResult.path` exists before calling apply
- Validate file types before upload
- Handle both upload and apply errors separately
- Show meaningful error messages to users

### Backend Safeguards
- Validate UUID format in organization ID
- Check file existence before apply
- Use `supabaseAdmin` for service-role writes
- Return consistent JSON error format

## Replication Guidelines for Other Image Uploads

### For New Image Upload Features:

1. **Create Upload Route** (if not using existing `/api/v1/upload/logo`)
   ```javascript
   router.post('/upload-type', upload.single('file'), async (req, res) => {
     // Upload to Supabase storage
     // Return { path, url, contentType }
   });
   ```

2. **Create Apply Route**
   ```javascript
   router.post('/:id/image-type/apply', async (req, res) => {
     // Update database field with storage key
     // Use supabaseAdmin for service-role writes
   });
   ```

3. **Frontend Pattern**
   ```javascript
   // Always use two-step process
   const uploadResult = await uploadFile();
   const applyResult = await applyImage(uploadResult.path);
   ```

## Database Schema Requirements

### Required Fields
- `logo_url` column in target table (text, nullable)
- UUID primary key for organization/entity linking

### Supabase Storage Requirements
- Bucket: Organization-specific or shared (e.g., 'app')
- Path pattern: `entity-type/entity-id/category/filename`
- Service role access for server-side operations

## Testing Checklist

Before deploying any changes:
- [ ] Upload endpoint returns valid path
- [ ] Apply endpoint updates database correctly
- [ ] Logo displays in UI after upload
- [ ] Error handling works for both steps
- [ ] File validation prevents invalid uploads
- [ ] Large files are handled gracefully

## Monitoring & Debugging

### Log Points
1. Upload request received with file details
2. Supabase storage upload success/failure
3. Database apply operation result
4. Any error conditions with context

### Error Recovery
- Upload failures: Allow retry with same file
- Apply failures: Re-attempt with existing path
- Display failures: Check logo serving endpoint

## Files Modified in This Implementation

### Server Files
- `server/routes/upload.ts` - Upload endpoint
- `server/routes/organizations/hardened.ts` - Apply endpoint
- `server/routes/organizations/setup.ts` - Setup-specific apply

### Client Files
- `client/src/pages/organizations/SimplifiedSetup.tsx` - Fixed two-step process
- `client/src/components/organization-wizard/branding-step.tsx` - Fixed endpoint path

## Maintenance Notes

### Version Compatibility
- All API calls use `/api/v1/` prefix
- Endpoint paths are fixed and should not change
- Response format is standardized

### Future Enhancements
- Consider adding image resizing/optimization
- Add progress indicators for large uploads  
- Implement drag-and-drop upload interfaces
- Add batch upload capabilities

## Rollback Plan
If issues arise:
1. Verify endpoint paths match documentation
2. Check parameter names (`key` not `filename`)
3. Validate two-step process is being followed
4. Ensure `supabaseAdmin` is used for database writes

---

**Created**: August 29, 2025  
**Author**: Replit Agent  
**Status**: Production Ready  
**Next Review**: When adding new image upload features