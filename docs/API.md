# API Documentation

## Base URL

```
Development: http://localhost:5000
Production: https://your-app.replit.app
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "count": 10  // Optional, for list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {...}  // Optional error details
}
```

## Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `204 No Content` - Request succeeded with no content
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token"
  }
}
```

#### POST /api/auth/logout
Logout current user. Requires authentication.

**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/me
Get current user profile. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "roles": [...]
  }
}
```

### Organizations

#### GET /api/organizations
List organizations. Requires authentication.

**Query Parameters:**
- `q` (string) - Search query
- `page` (number) - Page number (default: 1)
- `pageSize` (number) - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 100
}
```

#### GET /api/organizations/summary
Get organization summary with counts. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-id",
      "name": "Organization Name",
      "userCount": 10,
      "orderCount": 5,
      "recentActivity": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/organizations/:id
Get organization by ID. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org-id",
    "name": "Organization Name",
    "type": "customer",
    "status": "active",
    ...
  }
}
```

#### POST /api/organizations
Create new organization. Requires authentication.

**Request:**
```json
{
  "name": "New Organization",
  "type": "customer",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

#### PATCH /api/organizations/:id
Update organization. Requires authentication.

**Request:**
```json
{
  "name": "Updated Name",
  "status": "inactive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

#### DELETE /api/organizations/:id
Delete organization. Requires authentication.

**Response:**
```json
{
  "success": true
}
```

### Users

#### GET /api/users
List users. Requires authentication.

**Query Parameters:**
- `q` (string) - Search query
- `page` (number) - Page number
- `pageSize` (number) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 50
}
```

#### GET /api/users/:id
Get user by ID with roles. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "roles": [...]
  }
}
```

#### PATCH /api/users/:id/email
Update user email. Requires authentication.

**Request:**
```json
{
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

#### POST /api/users/:id/reset-password
Reset user password. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Password reset successfully",
    "maskedPassword": "abc*********"
  }
}
```

#### PATCH /api/users/:id/roles
Update user roles. Requires authentication.

**Request:**
```json
{
  "roles": [
    {
      "slug": "admin",
      "orgId": "org-id",
      "action": "add"
    },
    {
      "slug": "viewer",
      "orgId": "org-id",
      "action": "remove"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

### Orders

#### GET /api/orders
List orders. Requires authentication.

**Query Parameters:**
- `q` (string) - Search query
- `orgId` (string) - Filter by organization
- `statusCode` (string) - Filter by status
- `customerId` (string) - Filter by customer
- `page` (number) - Page number
- `pageSize` (number) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 200
}
```

#### GET /api/orders/status-codes
Get available order status codes. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "draft",
      "sortOrder": 1,
      "isTerminal": false
    },
    ...
  ]
}
```

#### GET /api/orders/:id
Get order by ID with items. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "orderNumber": "ORD-20240101-0001",
    "statusCode": "submitted",
    "items": [...],
    ...
  }
}
```

#### POST /api/orders
Create new order. Requires authentication.

**Request:**
```json
{
  "organizationId": "org-id",
  "customerId": "customer-id",
  "statusCode": "draft",
  "notes": "Order notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

#### PATCH /api/orders/:id/status
Update order status. Requires authentication.

**Request:**
```json
{
  "statusCode": "production"
}
```

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

#### DELETE /api/orders/:id
Delete order. Requires authentication.

**Response:**
```json
{
  "success": true
}
```

### File Management

#### GET /api/organizations/:id/branding-files
List organization branding files. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "logo.png",
      "size": 12345,
      "contentType": "image/png",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/organizations/:id/branding-files/sign
Generate signed upload URLs. Requires authentication.

**Request:**
```json
{
  "files": [
    {
      "name": "logo.png",
      "size": 12345
    }
  ],
  "ttlSeconds": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "logo.png",
      "uploadUrl": "https://...",
      "accessPath": "org/org-id/branding/logo.png"
    }
  ]
}
```

#### DELETE /api/organizations/:id/branding-files
Delete branding files. Requires authentication.

**Request:**
```json
{
  "names": ["logo.png", "banner.jpg"]
}
```

**Response:**
```json
{
  "success": true
}
```

### Health Check

#### GET /api/health
Check API health status. No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Global limit**: 200 requests per 15 minutes per IP
- **Auth endpoints**: 10 requests per minute per IP

When rate limited, the API returns:
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Database Errors
```json
{
  "success": false,
  "error": "Database operation failed",
  "details": {
    "code": "23505",
    "message": "Unique constraint violation"
  }
}
```

## Pagination

List endpoints support pagination with:
- `page` - Page number (starts at 1)
- `pageSize` - Items per page (default: 20, max: 100)

Response includes total count for pagination UI:
```json
{
  "success": true,
  "data": [...],
  "count": 1000
}
```

## Search and Filtering

Most list endpoints support:
- `q` - General search query
- Specific filters by field (e.g., `statusCode`, `orgId`)

## Security

- All endpoints use HTTPS in production
- Authentication via JWT tokens
- Tokens expire after 24 hours
- Rate limiting prevents abuse
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- XSS protection via content security policy
- CORS configured for allowed origins only