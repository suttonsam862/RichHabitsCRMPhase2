# API Route Surface

Generated on: 2025-08-20T23:30:17.207Z

This document catalogs all mounted API routes to track the public API surface.

## Route Summary

### /api

Source: `server/routes/api.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/health | 🚧 Stub | ❌ |
| USE | /api/organizations | ✅ Implemented | ❌ |
| USE | /api/sales | ✅ Implemented | ❌ |
| USE | /api/orders | ✅ Implemented | ❌ |
| USE | /api/manufacturing | ✅ Implemented | ❌ |
| USE | /api/catalog | ✅ Implemented | ❌ |

### /api/catalog

Source: `server/routes/catalog/index.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/catalog | 🚧 Stub | ❌ |
| GET | /api/catalog/:id | 🚧 Stub | ❌ |
| POST | /api/catalog | 🚧 Stub | ✅ |
| PUT | /api/catalog/:id | 🚧 Stub | ✅ |
| PATCH | /api/catalog/:id/status | ✅ Implemented | ✅ |
| POST | /api/catalog/:id/images | 🚧 Stub | ❌ |
| DELETE | /api/catalog/:id | 🚧 Stub | ❌ |
| GET | /api/catalog/:id/variants | 🚧 Stub | ❌ |
| POST | /api/catalog/:id/variants | ✅ Implemented | ✅ |
| GET | /api/catalog/analytics/summary | 🚧 Stub | ❌ |

### /api/manufacturing

Source: `server/routes/manufacturing/index.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/manufacturing/po | 🚧 Stub | ❌ |
| GET | /api/manufacturing/po/:id | 🚧 Stub | ❌ |
| POST | /api/manufacturing/po | 🚧 Stub | ✅ |
| PUT | /api/manufacturing/po/:id | 🚧 Stub | ✅ |
| PATCH | /api/manufacturing/po/:id/milestones/:milestoneId | ✅ Implemented | ✅ |
| PATCH | /api/manufacturing/po/:id/status | ✅ Implemented | ✅ |
| GET | /api/manufacturing/analytics/dashboard | 🚧 Stub | ❌ |
| GET | /api/manufacturing/vendors/performance | 🚧 Stub | ❌ |

### /api/orders

Source: `server/routes/orders/index.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/orders | 🚧 Stub | ❌ |
| GET | /api/orders/:id | 🚧 Stub | ❌ |
| POST | /api/orders | 🚧 Stub | ✅ |
| PUT | /api/orders/:id | 🚧 Stub | ✅ |
| PATCH | /api/orders/:id/status | ✅ Implemented | ✅ |
| POST | /api/orders/:id/cancel | 🚧 Stub | ❌ |
| GET | /api/orders/analytics/summary | 🚧 Stub | ❌ |

### /api/organizations

Source: `server/routes/organizations/index.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/organizations | ✅ Implemented | ❌ |
| GET | /api/organizations/:id | ✅ Implemented | ❌ |
| POST | /api/organizations | ✅ Implemented | ✅ |
| PUT | /api/organizations/:id | ✅ Implemented | ✅ |
| DELETE | /api/organizations/:id | ✅ Implemented | ❌ |

### /api/sales

Source: `server/routes/sales/index.ts`

| Method | Path | Status | Validation |
|--------|------|--------|-----------|
| GET | /api/sales | 🚧 Stub | ❌ |
| GET | /api/sales/:id | 🚧 Stub | ❌ |
| POST | /api/sales | 🚧 Stub | ✅ |
| PUT | /api/sales/:id | 🚧 Stub | ✅ |
| DELETE | /api/sales/:id | 🚧 Stub | ❌ |
| GET | /api/sales/analytics/dashboard | 🚧 Stub | ❌ |

## Statistics

- Total routes: 42
- Implemented: 15
- Stubbed: 27
- With validation: 15

## API Design Rules

1. All API routes must be under `/api/*` prefix
2. Use domain-based organization: `/api/organizations`, `/api/orders`, etc.
3. Implement proper validation using Zod schemas
4. Return consistent response envelopes: `{ success, data, error, message }`

Last updated: 2025-08-20T23:30:17.208Z
