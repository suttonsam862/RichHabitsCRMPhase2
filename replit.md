# Rich Habits Custom Clothing - Business Management System

## Project Overview
A React-TypeScript business management system for Rich Habits Custom Clothing, designed to streamline organizational workflows with robust data management and sports organization tracking.

## Key Technologies
- React with TypeScript for dynamic frontend
- Supabase backend integration 
- PostgreSQL database for comprehensive data management
- Advanced API validation and error handling
- Modular organization and sports contact management system

## Recent Changes (August 20, 2025)

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

### API Improvements
✓ **Fresh data fetching** - Modal always fetches latest data with timestamp cache-busting
✓ **Proper React Query keys** - Using ['org', id] for better cache invalidation
✓ **PATCH endpoint** - Added partial update support for organization fields
✓ **Delete verification** - Tested and confirmed DELETE functionality works correctly

### Technical Details
- **Edit form** - Fixed TypeScript issues and proper form validation
- **Query invalidation** - Both list and detail queries refresh after mutations
- **Error handling** - Improved error states and loading indicators
- **UI consistency** - Modal styling matches application theme

### Database Schema (Previously Fixed)
✓ **Organizations table**: All required columns present and working
✓ **API endpoints**: GET, POST, PATCH, DELETE all functional
✓ **Database connection**: Stable PostgreSQL connection

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