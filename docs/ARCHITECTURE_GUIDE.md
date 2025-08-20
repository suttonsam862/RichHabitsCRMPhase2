# Architecture Guide

This document provides the single source of truth for the Rich Habits Custom Clothing business management system architecture. Read this before making any changes to prevent drift and maintain consistency.

## High-level Mental Model

- **Client**: React/TypeScript SPA served by Vite, handles all UI interactions
- **Server**: Express.js API server that owns ALL `/api/*` routes exclusively
- **Shared**: Common types, DTOs, and schemas used by both client and server
- **Route Ownership**: Express handles `/api/*`, Vite serves static assets + SPA fallback for everything else

## Directory Layout & Purpose

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `client/src` | **Canonical frontend** - React app entry point | `main.tsx`, `App.tsx`, `routes.tsx` |
| `client/_legacy` | **Read-only legacy code** being migrated | (various legacy components) |
| `server/` | **Express API server** - all backend logic | `index.ts`, `routes.ts`, `db.ts` |
| `server/routes/` | **Domain-organized API routes** | `organizations/`, `api.ts` |
| `server/services/` | **Business logic layer** | Database operations, external APIs |
| `server/middleware/` | **Express middleware** | Validation, error handling, auth |
| `shared/` | **Shared contracts** between client/server | `schema.ts`, `dtos/` |
| `shared/dtos/` | **API data contracts** with Zod validation | `OrganizationDTO.ts`, etc. |
| `migrations/` | **Database migrations** | SQL migration files |
| `scripts/` | **Development tools** | Repository maintenance scripts |
| `docs/` | **Project documentation** | Architecture guides, API docs |

## Routing Strategy

### Client Routing
- **Primary**: React Router v6 with single route table in `client/src/routes.tsx`
- **Legacy**: Wouter-era components are wrapped/adapted through React Router
- **Patterns**: 
  - Standard routes: `/organizations`, `/orders`, `/dashboard`
  - Print routes: `/print/*` (uses `PrintLayout` for chrome-free printing)

### Server Routing
- **Ownership**: Express owns ALL `/api/*` routes - Vite never handles API requests
- **Organization**: Domain-based routing under `/api/<domain>`
- **Structure**:
  ```
  /api/organizations  -> server/routes/organizations/index.ts
  /api/orders        -> server/routes/orders/index.ts
  /api/manufacturing -> server/routes/manufacturing/index.ts
  ```

## Data Contracts

### Shared DTOs
- All API contracts defined in `shared/dtos/` using Zod schemas
- Client SDK in `client/src/lib/api-sdk.ts` uses these DTOs for type safety
- Response envelope pattern: `{ success: boolean, data: T, count?: number, message?: string }`

### Database Mapping
- **Database**: snake_case column names (`created_at`, `address_line1`)
- **DTOs**: camelCase field names (`createdAt`, `addressLine1`)
- **Mapping**: Implement `dbToDto()` and `dtoToDb()` functions in services
- **Example**:
  ```typescript
  // Database row (snake_case)
  { id: '123', created_at: '2024-01-01', address_line1: 'Main St' }
  
  // DTO (camelCase)  
  { id: '123', createdAt: '2024-01-01', addressLine1: 'Main St' }
  ```

## Environment & Config

### Server Environment
- **File**: `server/lib/env.ts` 
- **Validation**: Zod-validated required environment variables
- **Required**: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Client Environment
- **File**: `client/src/lib/env.ts`
- **API Base**: Configures API endpoint base URL
- **Pattern**: Use `VITE_` prefix for client-accessible variables

## Change Rules (Do/Don't)

### ✅ DO
- Add new API endpoints under `server/routes/<domain>/index.ts`
- Wire routes through services in `server/services/<domain>.ts`
- Update client API SDK when adding new endpoints
- Use shared DTOs for all API communication
- Run `npm run preflight` before making changes
- Update `docs/ROUTE_SURFACE.md` after adding routes

### ❌ DON'T
- Call `fetch()` directly in React components (use API SDK)
- Mount `/api/*` routes anywhere except Express server
- Edit files in `client/_legacy/` (read-only migration zone)
- Import across root boundaries (`client/src` should not import from project root)
- Change database schema without migration

## Testing & Check Gates

### Before Changes
```bash
npm run preflight  # Repository map + route inventory + typecheck
```

### Full Validation
```bash
npm run check      # TypeScript + preflight + lint
```

### Manual Checks
- Repository structure: `npm run map`
- API surface: `npm run routes:list`
- Types: `npm run typecheck`

## Glossary & Conventions

### Naming Conventions
- **Components**: PascalCase (`OrganizationCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useOrganizations.ts`)
- **Services**: camelCase (`organizationService.ts`)
- **DTOs**: PascalCase with suffix (`OrganizationDTO.ts`)
- **Database tables**: snake_case (`organizations`, `org_sports`)

### File Organization
- **Pages**: `client/src/pages/<PageName>.tsx`
- **Components**: `client/src/components/<ComponentName>.tsx`
- **Hooks**: `client/src/hooks/<hookName>.ts`
- **API routes**: `server/routes/<domain>/index.ts`
- **Services**: `server/services/<domain>.ts`

## Onboarding TL;DR

**Read this before touching any code:**

1. **Route ownership**: Express owns `/api/*`, Vite handles everything else
2. **Client entry**: Use `client/src/` only, never `client/_legacy/`
3. **API calls**: Use client SDK, never direct `fetch()` calls
4. **Data contracts**: All APIs use shared DTOs from `shared/dtos/`
5. **Database mapping**: Convert snake_case ↔ camelCase in services
6. **Before changes**: Run `npm run preflight` to check current state
7. **Adding routes**: Create in `server/routes/<domain>/`, update API SDK
8. **Environment**: Server config in `server/lib/env.ts`, client in `client/src/lib/env.ts`  
9. **Documentation**: Update route surface and architecture docs after changes
10. **Validation**: Use Zod schemas for all request/response validation

Last updated: ${new Date().toISOString()}