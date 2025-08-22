# API Documentation

## Base URL
```
https://your-domain.com/api
```

## Authentication
Currently using basic session-based authentication. Future implementations will include JWT tokens and role-based access control.

## Response Format

All API endpoints return responses in a standardized format:

```typescript
{
  success: boolean;
  data?: T;                    // Response payload
  count?: number;              // For paginated responses
  error?: {                    // Only present when success: false
    code: string;
    message: string;
    details?: any;
  };
}
```

### Success Response Examples
```json
// Single resource
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Example Organization",
    "email": "contact@example.org"
  }
}

// List with count
{
  "success": true,
  "data": [...],
  "count": 42
}
```

### Error Response Examples
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

## Organizations API

### List Organizations
```http
GET /api/organizations
```

**Query Parameters:**
- `q` (string, optional): Search query for organization name
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status ('School' | 'Business')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-uuid",
      "name": "Oak Mountain High School",
      "email": "admin@oakmountain.edu", 
      "phone": "+1234567890",
      "state": "AL",
      "city": "Birmingham",
      "status": "School",
      "colorPalette": ["#FF0000", "#0000FF"],
      "universalDiscounts": {
        "percentage": 10,
        "minOrder": 500
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "count": 1
}
```

### Get Organization
```http
GET /api/organizations/:id
```

**Response:** Single organization object (same structure as list item)

### Create Organization
```http
POST /api/organizations
```

**Request Body:**
```json
{
  "name": "New School District",
  "email": "contact@newschool.edu",
  "phone": "+1987654321",
  "state": "CA", 
  "city": "San Francisco",
  "status": "School",
  "colorPalette": ["#00FF00", "#FF00FF"],
  "universalDiscounts": {
    "percentage": 15,
    "minOrder": 1000
  }
}
```

**Response:** Created organization object with generated ID

### Update Organization
```http
PATCH /api/organizations/:id
```

**Request Body:** Partial organization object with fields to update

**Response:** Updated organization object

### Delete Organization
```http
DELETE /api/organizations/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Organization deleted successfully"
  }
}
```

### Get Organization Summary
```http
GET /api/organizations/:id/summary
```

Comprehensive organization data including branding files, sports, and users.

**Response:**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org-uuid",
      "name": "Oak Mountain High School",
      // ... full organization object
    },
    "branding": [
      {
        "name": "logo.png",
        "url": "https://storage.example.com/logo.png",
        "size": 15420,
        "uploadedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "sports": [
      {
        "sport": "Basketball",
        "contactName": "Coach Johnson",
        "contactEmail": "johnson@oakmountain.edu"
      }
    ],
    "users": [
      {
        "fullName": "Jane Admin",
        "email": "jadmin@oakmountain.edu",
        "roles": ["Admin", "Coach"]
      }
    ],
    "summary": {
      "totalUsers": 5,
      "totalSports": 3,
      "totalBrandingFiles": 4
    }
  }
}
```

## Users API

### List Users
```http
GET /api/users
```

**Query Parameters:**
- `q` (string, optional): Search by name or email
- `page` (number, optional): Page number
- `pageSize` (number, optional): Items per page
- `isActive` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "isActive": true,
      "avatarUrl": "https://example.com/avatar.jpg",
      "lastLogin": "2024-01-20T14:45:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "count": 1
}
```

### Get User
```http
GET /api/users/:id
```

**Response:** Single user object

### Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "New User",
  "phone": "+1987654321",
  "isActive": true
}
```

**Response:** Created user object

### Update User
```http
PATCH /api/users/:id
```

**Request Body:** Partial user object

**Response:** Updated user object

### Reset User Password
```http
POST /api/users/:id/reset-password
```

**Response:**
```json
{
  "success": true,
  "data": {
    "temporaryPassword": "temp-secure-password",
    "expiresAt": "2024-01-21T14:45:00Z"
  }
}
```

## User Roles API

### List User Roles
```http
GET /api/user-roles
```

**Query Parameters:**
- `userId` (string, optional): Filter by user ID
- `organizationId` (string, optional): Filter by organization ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "role-assignment-uuid",
      "userId": "user-uuid",
      "roleId": "role-uuid",
      "organizationId": "org-uuid",
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Assign Role to User
```http
POST /api/user-roles
```

**Request Body:**
```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid", 
  "organizationId": "org-uuid"
}
```

### Remove Role from User
```http
DELETE /api/user-roles/:id
```

## Roles API

### List Roles
```http
GET /api/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "role-uuid",
      "name": "Administrator",
      "slug": "admin"
    },
    {
      "id": "role-uuid-2", 
      "name": "Member",
      "slug": "member"
    }
  ]
}
```

## File Management API

### List Branding Files
```http
GET /api/organizations/:orgId/files/branding
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "logo.png",
      "url": "https://storage.example.com/branding/logo.png",
      "size": 15420,
      "contentType": "image/png",
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Generate Signed Upload URLs
```http
POST /api/organizations/:orgId/files/branding/sign
```

**Request Body:**
```json
{
  "files": [
    {
      "name": "new-logo.png",
      "size": 25600
    }
  ],
  "ttlSeconds": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "new-logo.png",
        "signedUrl": "https://storage.example.com/upload-url-with-signature",
        "expiresAt": "2024-01-15T11:30:00Z"
      }
    ]
  }
}
```

### Delete Branding Files
```http
DELETE /api/organizations/:orgId/files/branding
```

**Request Body:**
```json
{
  "names": ["old-logo.png", "outdated-banner.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": ["old-logo.png", "outdated-banner.jpg"],
    "message": "Files deleted successfully"
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `DUPLICATE_RESOURCE` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error | 502 |

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **General endpoints**: 100 requests per minute per IP
- **File upload endpoints**: 20 requests per minute per IP  
- **Authentication endpoints**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (1-based, default: 1)
- `pageSize`: Items per page (default: 20, max: 100)

Pagination metadata is included in the response:
```json
{
  "success": true,
  "data": [...],
  "count": 250,
  "page": 1,
  "pageSize": 20,
  "totalPages": 13
}
```

## Filtering and Sorting

### Filtering
Most list endpoints support filtering via query parameters:
- `q`: Text search across relevant fields
- Field-specific filters: `status`, `isActive`, etc.

### Sorting
Use the `sort` parameter with field names:
- `sort=createdAt`: Sort by creation date (ascending)
- `sort=-createdAt`: Sort by creation date (descending)
- `sort=name,createdAt`: Multi-field sorting

Example:
```http
GET /api/organizations?sort=-createdAt&status=School&q=mountain
```

## Webhooks (Planned)

Future webhook support for real-time integrations:

```http
POST /api/webhooks
```

Supported events:
- `organization.created`
- `organization.updated`
- `user.created`
- `user.role_assigned`
- `file.uploaded`

## SDK and Client Libraries (Planned)

- JavaScript/TypeScript SDK
- Python client library
- REST API documentation with OpenAPI/Swagger
- Postman collection for testing