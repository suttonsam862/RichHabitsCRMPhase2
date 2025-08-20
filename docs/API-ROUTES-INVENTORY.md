# API Routes Inventory Report

**Generated:** 2025-08-20T20:48:06.263Z

## Mount Points

| Mount Path | Router | File:Line |
|------------|--------|----------|
| `/api/organizations` | organizationsRouter (imported) | index.ts:165 |
| `/api/debug` | debugRouter (imported) | index.ts:166 |
| `/api/upload` | uploadRoutes (imported) | index.ts:167 |
| `/api/org-sports` | orgSportsRouter (imported) | index.ts:168 |
| `/api/users/admin` | usersAdminRouter (imported) | index.ts:169 |
| `/api/users` | usersRouter (imported) | index.ts:170 |
| `/* (all paths)` | router (imported) | index.ts:174 |
| `/* (all paths)` | errorHandler (imported) | index.ts:195 |

## All Routes (54 total)

| Method | Path | File | Line |
|--------|------|------|------|
| GET | `/` | routes/org-sports.ts | 11 |
| GET | `/` | routes/organizations-deprecated.ts | 20 |
| GET | `/` | routes/organizations-hardened.ts | 291 |
| GET | `/` | routes/organizations-v2.ts | 70 |
| GET | `/` | routes/organizations.ts | 17 |
| GET | `/` | routes/quotes.ts | 36 |
| GET | `/` | routes/users-admin.ts | 10 |
| POST | `/` | routes/org-sports.ts | 75 |
| POST | `/` | routes/organizations-deprecated.ts | 30 |
| POST | `/` | routes/organizations-hardened.ts | 137 |
| POST | `/` | routes/organizations-v2.ts | 156 |
| POST | `/` | routes/organizations.ts | 50 |
| POST | `/` | routes/quotes.ts | 81 |
| POST | `/` | routes/users.ts | 29 |
| PUT | `/` | routes/users-admin.ts | 55 |
| GET | `/__columns` | routes/organizations-deprecated.ts | 35 |
| GET | `/__columns` | routes/organizations.ts | 222 |
| DELETE | `/:id` | routes/organizations-deprecated.ts | 66 |
| DELETE | `/:id` | routes/organizations-hardened.ts | 477 |
| DELETE | `/:id` | routes/organizations-v2.ts | 443 |
| DELETE | `/:id` | routes/quotes.ts | 204 |
| GET | `/:id` | routes/organizations-deprecated.ts | 25 |
| GET | `/:id` | routes/organizations-hardened.ts | 383 |
| GET | `/:id` | routes/organizations-v2.ts | 475 |
| GET | `/:id` | routes/quotes.ts | 54 |
| PATCH | `/:id` | routes/organizations-deprecated.ts | 56 |
| PATCH | `/:id` | routes/organizations-hardened.ts | 428 |
| PATCH | `/:id` | routes/organizations-v2.ts | 373 |
| PUT | `/:id` | routes/quotes.ts | 140 |
| POST | `/:id/replace-title-card` | routes/organizations-deprecated.ts | 44 |
| POST | `/:id/replace-title-card` | routes/organizations.ts | 170 |
| GET | `/api/orders` | routes.ts | 174 |
| POST | `/api/orders` | routes.ts | 206 |
| DELETE | `/api/orders/:id` | routes.ts | 238 |
| GET | `/api/orders/:id` | routes.ts | 190 |
| PUT | `/api/orders/:id` | routes.ts | 222 |
| POST | `/api/org-sports` | routes.ts | 342 |
| GET | `/api/organizations` | routes.ts | 41 |
| DELETE | `/api/organizations/:id` | routes.ts | 82 |
| GET | `/api/organizations/:id` | routes.ts | 48 |
| PUT | `/api/organizations/:id` | routes.ts | 66 |
| GET | `/api/search/organizations` | routes.ts | 252 |
| GET | `/api/sports` | routes.ts | 96 |
| POST | `/api/sports` | routes.ts | 128 |
| DELETE | `/api/sports/:id` | routes.ts | 160 |
| GET | `/api/sports/:id` | routes.ts | 112 |
| PUT | `/api/sports/:id` | routes.ts | 144 |
| POST | `/api/upload-logo` | routes.ts | 316 |
| GET | `/api/users` | routes.ts | 270 |
| POST | `/api/users` | routes.ts | 299 |
| GET | `/api/users/:id` | routes.ts | 283 |
| GET | `/debug/:orgId` | routes/org-sports.ts | 205 |
| POST | `/logo` | routes/upload.ts | 80 |
| GET | `/test-init` | routes/org-sports.ts | 20 |

## 🚨 Duplicate Routes (7 conflicts)

### Conflict 1: GET /

- **routes/org-sports.ts:11** - GET `/`
- **routes/organizations-deprecated.ts:20** - GET `/`
- **routes/organizations-hardened.ts:291** - GET `/`
- **routes/organizations-v2.ts:70** - GET `/`
- **routes/organizations.ts:17** - GET `/`
- **routes/quotes.ts:36** - GET `/`
- **routes/users-admin.ts:10** - GET `/`

### Conflict 2: POST /

- **routes/org-sports.ts:75** - POST `/`
- **routes/organizations-deprecated.ts:30** - POST `/`
- **routes/organizations-hardened.ts:137** - POST `/`
- **routes/organizations-v2.ts:156** - POST `/`
- **routes/organizations.ts:50** - POST `/`
- **routes/quotes.ts:81** - POST `/`
- **routes/users.ts:29** - POST `/`

### Conflict 3: GET /:id

- **routes/organizations-deprecated.ts:25** - GET `/:id`
- **routes/organizations-hardened.ts:383** - GET `/:id`
- **routes/organizations-v2.ts:475** - GET `/:id`
- **routes/quotes.ts:54** - GET `/:id`

### Conflict 4: GET /__columns

- **routes/organizations-deprecated.ts:35** - GET `/__columns`
- **routes/organizations.ts:222** - GET `/__columns`

### Conflict 5: POST /:id/replace-title-card

- **routes/organizations-deprecated.ts:44** - POST `/:id/replace-title-card`
- **routes/organizations.ts:170** - POST `/:id/replace-title-card`

### Conflict 6: PATCH /:id

- **routes/organizations-deprecated.ts:56** - PATCH `/:id`
- **routes/organizations-hardened.ts:428** - PATCH `/:id`
- **routes/organizations-v2.ts:373** - PATCH `/:id`

### Conflict 7: DELETE /:id

- **routes/organizations-deprecated.ts:66** - DELETE `/:id`
- **routes/organizations-hardened.ts:477** - DELETE `/:id`
- **routes/organizations-v2.ts:443** - DELETE `/:id`
- **routes/quotes.ts:204** - DELETE `/:id`

## ⚠️ Overlapping Routes (2 potential conflicts)

### Overlap 1: /__columns

- **routes/organizations-deprecated.ts:35** - GET `/__columns`
- **routes/organizations.ts:222** - GET `/__columns`

### Overlap 2: /:id/replace-title-card

- **routes/organizations-deprecated.ts:44** - POST `/:id/replace-title-card`
- **routes/organizations.ts:170** - POST `/:id/replace-title-card`

## Organizations Routes Analysis

Found 5 organization-related routes:

| Method | Path | File |
|--------|------|------|
| GET | `/api/organizations` | routes.ts |
| GET | `/api/organizations/:id` | routes.ts |
| PUT | `/api/organizations/:id` | routes.ts |
| DELETE | `/api/organizations/:id` | routes.ts |
| GET | `/api/search/organizations` | routes.ts |

## Recommendations

1. **Resolve 7 duplicate routes** - Multiple definitions of the same endpoint
2. **Review 2 overlapping routes** - Similar patterns may cause conflicts
4. **Implement canonical routing** - Use single router per resource
5. **Add deprecation shims** - For backward compatibility during migration

