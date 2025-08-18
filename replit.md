# Rich Habits Custom Clothing - Business Management System

## Project Overview
A React-TypeScript business management system for Rich Habits Custom Clothing, designed to streamline organizational workflows with robust data management and sports organization tracking.

## Key Technologies
- React with TypeScript for dynamic frontend
- Supabase backend integration 
- PostgreSQL database for comprehensive data management
- Advanced API validation and error handling
- Modular organization and sports contact management system

## Recent Changes (August 18, 2025)

### Database Schema Fixes
✓ **Fixed missing 'status' column error** - Added required status column to organizations table with default 'active' value
✓ **Updated organization creation route** - Modified POST /api/organizations to include status field  
✓ **Fixed Drizzle ORM type mismatch** - Corrected `.values(row)` to `.values([row])` for proper array format
✓ **Verified database connectivity** - All tables (organizations, users, orders, user_roles, roles, sports, org_sports) exist and are accessible
✓ **Confirmed role setup** - Required roles (owner, admin, member, customer) are properly configured

### Database Structure
- **Organizations table**: Contains all required columns including newly added 'status'
- **Roles table**: Properly configured with owner/admin/member/customer roles
- **Database connection**: Working with PostgreSQL 16.9 on Neon
- **API endpoints**: Organization CRUD operations now working correctly

### Issues Resolved
- Fixed "Failed to create organization" console errors
- Resolved database type validation issues in organizations.ts route
- Eliminated missing schema column errors
- Organization creation now successfully returns proper response with status field

### Remaining Minor Issues
- DialogHeader console warning (non-blocking, component works correctly)
- One LSP diagnostic in test script (non-critical)

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