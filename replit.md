# Rich Habits Custom Clothing - Business Management System

## Project Overview
A React-TypeScript business management system for Rich Habits Custom Clothing, designed to streamline organizational workflows with advanced file management and interactive user experience.

### Key Technologies
- **Frontend**: React with TypeScript, Wouter routing, shadcn/ui components
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL (Supabase hosted)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS with glassmorphic UI design
- **State Management**: TanStack Query (React Query v5)
- **File Upload**: Multer with Supabase storage

## Recent Architectural Changes (August 17, 2025)

### Organization Creation Hardening
- **Issue**: Organization creation was failing due to missing user_id, field mapping issues, and Select component errors
- **Solution**: 
  - Created `organizations-hardened.ts` route with robust field normalization
  - Handles both camelCase and snake_case field names
  - Conditional user role assignment (skips if no auth context)
  - Fixed Select components to never have empty string values
  - Added database schema audit script for detecting mismatches
  - Created comprehensive smoke test suite

### Database Schema Updates
- Added `roles` table with `slug`, `name`, `description` fields
- Added `user_roles` table for organization ownership tracking
- Created indexes for performance optimization
- All tables use VARCHAR for ID fields (not UUID)

## Project Architecture

### Directory Structure
```
/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── pages/          # Page components (Wouter routing)
│   │   ├── components/     # Reusable UI components
│   │   │   └── organization-wizard/  # Multi-step org creation
│   │   ├── lib/            # Utilities and API clients
│   │   └── hooks/          # Custom React hooks
├── server/                  # Backend Express application
│   ├── routes/             # API route handlers
│   │   └── organizations-hardened.ts  # Robust org creation
│   ├── scripts/            # Utility scripts
│   │   ├── schemaAudit.ts # Database schema validation
│   │   └── smokeOrgs.ts   # API smoke tests
│   └── db.ts               # Database connection
├── shared/                  # Shared types and schemas
│   ├── schema.ts           # Drizzle ORM schemas
│   └── schemas/            # Zod validation schemas
└── docs/                    # Documentation
    └── orgs-hardening-notes.md  # Recent fixes documentation
```

### API Routes
- `POST /api/organizations` - Create organization (accepts both camelCase and snake_case)
- `GET /api/organizations` - List with filtering, sorting, pagination
- `GET /api/organizations/:id` - Get single organization
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/upload/logo` - Upload organization logo

### Database Schema
- `organizations` - Main org table with business info
- `roles` - Role definitions (e.g., 'owner')
- `user_roles` - User-organization-role associations
- `org_sports` - Organization sports associations
- `sports` - Sports definitions

## Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `ASSIGN_OWNER_ON_CREATE` - Whether to assign owner role (default: true)
- `DEFAULT_USER_ID` - Fallback user ID for development

### Key Features
1. **Organization Management**
   - Create organizations with logo upload
   - Filter by type (school/business), state
   - Sort by name or creation date
   - Pagination support

2. **Field Normalization**
   - Accepts both camelCase and snake_case
   - Converts empty strings to null
   - Uppercases state codes
   - Validates but doesn't reject on minor issues

3. **Error Handling**
   - Graceful degradation when auth is missing
   - Clear validation messages
   - Request ID tracking for debugging

## Development Commands

### Running the Application
```bash
npm run dev  # Starts both frontend and backend
```

### Database Operations
```bash
npm run db:push   # Push schema changes to database
npm run db:migrate # Run migrations
```

### Testing
```bash
cd server && npx tsx scripts/schemaAudit.ts  # Verify database schema
cd server && npx tsx scripts/smokeOrgs.ts    # Run API smoke tests
```

## User Preferences
- Keep error messages user-friendly and non-technical
- Prioritize resilient, fail-safe operations
- Support multiple naming conventions for API flexibility
- Always validate but be lenient where possible

## Known Issues & Solutions
1. **Select Component Errors**: Fixed by ensuring no empty string values
2. **User Role Assignment**: Now optional, won't block org creation
3. **Field Mapping**: Unified handler for both naming conventions
4. **Database Schema Drift**: Use schemaAudit.ts to detect and fix

## Next Steps
- [ ] Add organization editing UI
- [ ] Implement bulk operations
- [ ] Add export functionality
- [ ] Enhance search capabilities
- [ ] Add activity logging