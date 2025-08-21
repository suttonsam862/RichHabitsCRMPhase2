# Rich Habits Custom Clothing - Business Management System

## Project Overview
A React-TypeScript business management system for Rich Habits Custom Clothing, designed to streamline organizational workflows with robust data management and sports organization tracking.

## Key Technologies
- React with TypeScript for dynamic frontend
- Supabase backend integration 
- PostgreSQL database for comprehensive data management
- Advanced API validation and error handling
- Modular organization and sports contact management system

## Project Architecture Update (August 20, 2025)

### 🏗️ Comprehensive Architecture Implementation (Latest)
✓ **Feature-Based Directory Structure** - Complete domain separation for sales, orders, manufacturing, catalog
✓ **Role-Based Authentication System** - 5 role types with route-specific access controls
✓ **Specialized Layouts** - AdminLayout, SalesLayout, ManufacturingLayout, DesignerLayout, CustomerLayout
✓ **Shared DTO System** - Type-safe communication contracts between client and server
✓ **Server Route Stubs** - Complete API architecture with validation middleware
✓ **Circular Dependency Detection** - scripts/find-circulars.ts for architectural integrity
✓ **Route Inventory Tool** - server/tools/route-inventory.ts for API documentation
✓ **Environment Contracts** - Type-safe environment variable management
✓ **API SDK Architecture** - Centralized client-server communication layer

### Business Domain Implementation
✓ **Sales Pipeline** - Complete lead management with Kanban board, lead details, and analytics
✓ **Order Management** - Full order lifecycle tracking with status management
✓ **Manufacturing** - Production board with purchase orders and milestone tracking  
✓ **Product Catalog** - Comprehensive product management with variants and specifications
✓ **Organization Integration** - Connected with existing organization functionality

## Recent Changes (August 21, 2025)

### Organizations API End-to-End Implementation (Latest)
✓ **Single Route Mount** - Eliminated duplicate routes, server/routes/organizations/index.ts is canonical
✓ **Schema-Compatible List** - Dynamic column detection with fallback for missing optional columns  
✓ **Database Tolerance** - API works reliably across DB variants with information_schema introspection
✓ **Client SDK Integration** - Typed API SDK in client/src/lib/api-sdk.ts replaces direct fetch calls
✓ **Environment Configuration** - API_BASE properly configured for dev/prod environments
✓ **Route Surface Documentation** - 43 routes cataloged, including new __columns debug endpoint
✓ **Documentation System** - Complete architecture guide and change protocol established
✓ **Field Mapping** - Automatic snake_case ↔ camelCase conversion with dbToDto helper
✓ **Error Resilience** - Graceful fallback to minimal data set if column mismatches occur
✓ **Response Format** - Consistent { success, data, count } envelope pattern

### Routing Architecture Stabilization (Completed)
✓ **Centralized Route Management** - Single source of truth in client/src/routes.tsx
✓ **Wouter → React Router v6** - Complete migration with type-safe navigation
✓ **Error Boundaries** - All routes protected with graceful fallback UI
✓ **Enhanced 404 Page** - User-friendly not found with recovery options
✓ **Print Layout System** - Clean print/export routes without app chrome
✓ **Type-Safe Navigation** - Path helpers in lib/paths.ts prevent navigation errors
✓ **Lazy Loading** - All pages lazy-loaded for optimal performance
✓ **Layout Architecture** - AppLayout for standard pages, PrintLayout for print routes
✓ **Migration Documentation** - Complete routing guide in docs/ROUTING.md

### Frontend Canonicalization (Completed)
✓ **Split-Brain Architecture Eliminated** - Single frontend tree in client/src/
✓ **Legacy Code Preserved** - Safe archive in client/_legacy/src-20250820_203007/
✓ **Path Aliases Aligned** - Vite and TypeScript configs unified
✓ **Guardrails Established** - ESLint rules prevent cross-root imports

### Schema Auto-Pull System Implementation
✓ **Automated Schema Synchronization** - Added scripts/schema-sync.js for automatic database schema introspection
✓ **Server Integration** - Schema auto-pull runs on every development server startup  
✓ **Frontend/Backend Sync** - Ensures shared/schema.ts stays synchronized with database
✓ **Database Introspection** - Successfully pulls 8 tables, 70 columns from Supabase PostgreSQL
✓ **Timestamp Tracking** - All generated schema files include sync timestamps
✓ **Error Resilience** - Server starts even if schema sync fails, with proper warnings
✓ **Test Coverage** - Comprehensive test suite verifies auto-pull functionality
✓ **API Endpoint** - Added /api/schema-status for monitoring sync status
✓ **Development Safety** - Auto-pull only runs in development environment

### Organization Modal Fixes
✓ **Fixed modal scrolling** - Added proper max-h-[75vh] overflow-y-auto container for content
✓ **Implemented PATCH updates** - Organization edits now save correctly with partial updates
✓ **Fixed DELETE functionality** - Delete button properly removes organizations and closes modal
✓ **Enhanced General tab** - Now displays complete organization info including type, status, logo URL, and timestamps
✓ **Fixed logo display** - Logos now show properly in modal header using both logoUrl and logo_url fields
✓ **Improved Sports tab** - Sports and contact information display correctly with proper styling
✓ **Updated modal styling** - Consistent UI with backdrop-blur and proper border styling
✓ **Disabled Orders tab** - Removed non-functional orders tab until endpoint is implemented
✓ **Fixed font 404 error** - Commented out missing Coolvetica font reference

### API Testing and Tools
✓ **Yaak API Collection** - Created comprehensive API testing collection (yaak/organizations.yaak.json)
✓ **API Documentation** - Added README_yaak.md with setup and usage instructions
✓ **Environment Variables** - Configured BASE_URL and AUTH_HEADER support
✓ **Request Testing** - Built-in assertions and validation for all endpoints
✓ **CRUD Coverage** - Full test suite for GET, POST, PATCH, DELETE operations

### Role Seeding Fixes
✓ **Fixed "require is not defined"** - Replaced require.main with ESM-compatible import.meta.url check
✓ **TypeScript Errors** - Fixed type casting issues in database result handling
✓ **Migration Approach** - Added migrations/seed_roles.sql for proper role seeding
✓ **Runtime Clean** - Server startup no longer throws require errors

### Technical Details
- **Edit form** - Fixed TypeScript issues and proper form validation
- **Query invalidation** - Both list and detail queries refresh after mutations
- **Error handling** - Improved error states and loading indicators
- **UI consistency** - Modal styling matches application theme
- **ESM Compatibility** - All scripts now work properly with ES modules

### Database Schema (Previously Fixed)
✓ **Organizations table**: All required columns present and working
✓ **API endpoints**: GET, POST, PATCH, DELETE all functional
✓ **Database connection**: Stable PostgreSQL connection
✓ **Role seeding**: Proper migration-based approach implemented

## User Preferences
*To be updated based on user feedback and preferences*

## Project Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API**: RESTful endpoints with Zod validation
- **State Management**: TanStack Query for server state

## Development Setup
- Node.js 20.x runtime
- PostgreSQL 16 database
- Environment variables properly configured
- Workflow: `Run` command executes `npm run dev`