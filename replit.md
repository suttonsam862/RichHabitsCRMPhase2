# Rich Habits Custom Clothing - Business Management System

## Overview
A comprehensive React-TypeScript business management system for Rich Habits Custom Clothing, featuring robust organization management, order tracking, and enhanced data validation.

## Recent Changes (January 17, 2025)

### Organization Creation Flow - Hardened & Fixed
Fixed critical issues in the organization creation flow that were preventing organizations from being created:

**Database Layer:**
- Added idempotent SQL migration (`/supabase/migrations/20250117_fix_org_creation.sql`)
- Made `user_roles.user_id` nullable to support creation without JWT authentication
- Added database triggers:
  - `trg_organizations_fix_defaults`: Normalizes NULL universalDiscounts to {} 
  - `trg_user_roles_set_user_from_jwt`: Handles user_id population from auth.uid()
- Seeded base roles (owner, admin, member) with unique slugs
- Added indexes on organizations.name and organizations.created_at

**API Layer:**
- Enhanced `/server/routes/organizations-hardened.ts` with:
  - Proper field normalization (camelCase → snake_case)
  - Universal discounts always normalized to {} instead of NULL
  - Transaction support for organization + role assignment
  - Better error reporting with PG error codes
  - Support for organization creation with or without authentication

**Front-end Layer:**
- Updated `/client/src/components/organization-wizard/sports-contacts-step.tsx`
  - Changed universalDiscounts from null to {} in payload
  - Proper field mapping for API compatibility

**Testing:**
- Created comprehensive test suite (`/server/scripts/test-org-creation.ts`)
- Added migration notes (`MIGRATION_NOTES.md`)

## Technology Stack
- **Frontend:** React 18 with TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js/Express with TypeScript
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Drizzle ORM
- **File Storage:** Multer for uploads, Supabase Storage for logos
- **Authentication:** Passport.js with session management
- **State Management:** TanStack Query (React Query v5)

## Project Architecture

### Database Schema
- **organizations**: Core entity with logo_url, state, address, phone, email, universal_discounts (JSONB), notes, is_business flag
- **user_roles**: Links users to organizations with roles (now supports null user_id for unauthenticated creation)
- **roles**: Defines system roles (owner, admin, member) with unique slugs
- **orders**: Tracks customer orders linked to organizations
- **org_sports**: Links organizations to sports with contact information
- **sports**: Available sports catalog

### API Endpoints
- `/api/organizations` - CRUD operations for organizations (hardened version)
- `/api/orders` - Order management
- `/api/org-sports` - Sports association management
- `/api/upload/logo` - Logo upload handling
- `/api/health` - System health check
- `/api/debug` - Debug endpoints for development

### Frontend Components
- **Organization Wizard**: Multi-step form for creating organizations
  - Primary Information Step
  - Branding Step (logo upload, colors)
  - Sports & Contacts Step
- **Organization Management**: List, search, filter organizations
- **Order Management**: Create and track orders

### Key Features
- Robust organization creation with data normalization
- Logo upload with Supabase Storage integration
- Multi-step wizard interface
- Real-time validation with Zod schemas
- Error boundary implementation
- Responsive design with dark mode support

## Security & Validation
- Zod schemas for input validation
- SQL injection prevention via parameterized queries
- CSRF protection via sessions
- File upload validation (type, size limits)
- Database triggers for data integrity

## Development Guidelines
- Always use TypeScript for type safety
- Follow the established file structure
- Use Drizzle ORM for database operations
- Implement proper error handling
- Write comprehensive tests for critical flows
- Document API changes in migration notes

## User Preferences
- Keep error messages user-friendly
- Maintain consistent UI/UX patterns
- Prioritize data integrity over convenience
- Always use real data, never mock data

## Known Issues & TODOs
- [ ] Implement user authentication flow
- [ ] Add organization editing capabilities
- [ ] Implement order status tracking
- [ ] Add bulk import for organizations
- [ ] Implement email notifications

## Testing
Run tests with:
```bash
# Organization creation tests
tsx server/scripts/test-org-creation.ts

# API smoke tests
npm run smoke:orgs
```

## Deployment
The application is configured for Replit deployment with:
- Express server on port 5000
- Vite development server with HMR
- PostgreSQL database via DATABASE_URL
- Environment variables for configuration