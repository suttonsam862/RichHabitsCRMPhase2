# API Routes Documentation

**Last Updated:** August 20, 2025  
**Version:** Canonical API v1.0  

## Overview

This document describes the canonical API endpoints for the Rich Habits Custom Clothing management system. All API routes follow RESTful conventions and return JSON responses.

## Base URL

All API endpoints are prefixed with `/api/` when served from the application.

## Authentication

Most endpoints require authentication. Include the bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Common Response Format

### Success Response
```json
{
  "data": [...],
  "message": "Success message",
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 123
  }
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "fieldErrors": {
    "fieldName": ["validation error messages"]
  }
}
```

## Organizations Endpoints

### List Organizations
**GET** `/api/organizations`

Retrieve a paginated list of organizations with optional search and sorting.

**Query Parameters:**
- `search` (string, optional) - Search term to filter by name, email, or state
- `limit` (number, optional, default: 50) - Maximum number of results (1-100)
- `offset` (number, optional, default: 0) - Number of results to skip
- `sort` (enum, optional, default: 'created_at') - Sort field: 'name', 'created_at', 'state'
- `order` (enum, optional, default: 'desc') - Sort order: 'asc', 'desc'

**Example Request:**
```
GET /api/organizations?search=nike&limit=20&sort=name&order=asc
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Nike Sports Club",
      "state": "CA",
      "phone": "+1-555-0123",
      "email": "info@nike.com",
      "notes": "Premium sports organization",
      "logoUrl": "https://example.com/logo.png",
      "titleCardUrl": "https://example.com/title.png",
      "isBusiness": true,
      "universalDiscounts": {"member": 0.1},
      "createdAt": "2025-08-20T20:00:00.000Z",
      "brandPrimary": "#FF6900",
      "brandSecondary": "#FCFCFC"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### Get Organization by ID
**GET** `/api/organizations/{id}`

Retrieve a specific organization by ID.

**Path Parameters:**
- `id` (uuid) - Organization ID

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Nike Sports Club",
  "state": "CA",
  "phone": "+1-555-0123",
  "email": "info@nike.com",
  "notes": "Premium sports organization",
  "logoUrl": "https://example.com/logo.png",
  "titleCardUrl": "https://example.com/title.png",
  "isBusiness": true,
  "universalDiscounts": {"member": 0.1},
  "createdAt": "2025-08-20T20:00:00.000Z",
  "updatedAt": "2025-08-20T20:00:00.000Z",
  "brandPrimary": "#FF6900",
  "brandSecondary": "#FCFCFC"
}
```

**Error Responses:**
- `404` - Organization not found

### Create Organization
**POST** `/api/organizations`

Create a new organization.

**Request Body:**
```json
{
  "name": "New Sports Club",
  "logoUrl": "https://example.com/logo.png",
  "isBusiness": true,
  "state": "CA",
  "address": "123 Main St",
  "phone": "+1-555-0123",
  "email": "info@example.com",
  "notes": "New organization",
  "universalDiscounts": {"student": 0.15},
  "emailDomain": "example.com",
  "brandPrimary": "#FF6900",
  "brandSecondary": "#FCFCFC",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 100",
  "city": "Los Angeles",
  "postalCode": "90210",
  "country": "USA"
}
```

**Field Mapping:** The API accepts both camelCase and snake_case field names for backward compatibility:
- `logoUrl` or `logo_url`
- `isBusiness` or `is_business`
- `universalDiscounts` or `universal_discounts`

**Required Fields:**
- `name` (string, 1-120 characters)

**Optional Fields:**
- All other fields are optional and will be set to null if not provided
- Empty strings are converted to null

**Example Response:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174111",
  "name": "New Sports Club",
  "state": "CA",
  "logoUrl": "https://example.com/logo.png",
  "isBusiness": true,
  "createdAt": "2025-08-20T20:30:00.000Z",
  "message": "Organization created successfully"
}
```

**Error Responses:**
- `400` - Validation failed (see fieldErrors in response)

### Update Organization
**PUT** `/api/organizations/{id}` or **PATCH** `/api/organizations/{id}`

Update an existing organization. Both PUT and PATCH perform partial updates.

**Path Parameters:**
- `id` (uuid) - Organization ID

**Request Body:** Same as create, but all fields are optional

**Example Request:**
```json
{
  "name": "Updated Organization Name",
  "brandPrimary": "#00FF00"
}
```

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Organization Name",
  "brandPrimary": "#00FF00",
  "updatedAt": "2025-08-20T21:00:00.000Z",
  "message": "Organization updated successfully"
}
```

**Error Responses:**
- `404` - Organization not found
- `400` - Validation failed

### Delete Organization
**DELETE** `/api/organizations/{id}`

Delete an organization.

**Path Parameters:**
- `id` (uuid) - Organization ID

**Example Response:**
```json
{
  "message": "Organization deleted successfully",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Deleted Organization"
}
```

**Error Responses:**
- `404` - Organization not found

## Deprecated Endpoints

The following endpoints are deprecated and will be removed in future versions. Use the canonical endpoints above instead.

### Legacy Routes (Deprecated)

| Old Endpoint | Status | Canonical Alternative | Notes |
|--------------|--------|----------------------|-------|
| `GET /api/organizations/__columns` | `410 Gone` | Use standard CRUD endpoints | Schema introspection removed |
| `POST /api/organizations/:id/replace-title-card` | `410 Gone` | `PATCH /api/organizations/:id` | Use title_card_url field |
| Various v2 endpoints | `410 Gone` | Canonical endpoints | Update client to use normalized field names |

### Migration Notes

1. **Field Naming:** The canonical API uses camelCase field names matching the database schema, but accepts both camelCase and snake_case for backward compatibility during the transition period.

2. **Response Format:** All responses now follow a consistent format with proper error handling and validation messages.

3. **Validation:** Enhanced input validation with detailed field-level error messages.

4. **Search:** Improved search functionality with proper query parameter handling.

## Other Resource Endpoints

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID  
- `POST /api/users` - Create user
- `PUT /api/users` - Update user (admin only)

### Organization Sports
- `GET /api/org-sports` - List organization sports
- `POST /api/org-sports` - Create organization sport

### Quotes
- `GET /api/quotes` - List quotes
- `GET /api/quotes/:id` - Get quote by ID
- `POST /api/quotes` - Create quote
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote

### Upload
- `POST /api/upload/logo` - Upload organization logo

### Debug (Development Only)
- `GET /api/debug` - Debug endpoints for development

## System Endpoints

### Health Check
**GET** `/api/health`

Check system health and database connectivity.

**Example Response:**
```json
{
  "ok": true,
  "time": "2025-08-20T20:00:00.000Z",
  "db": "up",
  "orgs": 42
}
```

### Schema Status
**GET** `/api/schema-status`

Check database schema synchronization status.

**Example Response:**
```json
{
  "status": "synced",
  "lastSync": "2025-08-20T20:00:00.000Z",
  "timestamp": "2025-08-20T20:00:00.000Z"
}
```

---

## Development Notes

- All endpoints include request tracing with unique request IDs for debugging
- Enhanced logging for all organization operations
- Proper error handling with detailed validation messages
- Support for both camelCase and snake_case field names during migration period
- Comprehensive input validation using Zod schemas