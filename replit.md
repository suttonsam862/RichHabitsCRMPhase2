# Rich Habits Custom Clothing - Business Management System

## Project Overview
A React-based single-page application framework for "Rich Habits Custom Clothing" business management system, focusing on organizations management with glassmorphism UI design. The system handles user management, organizations, sports teams, and order processing with a modern, professional interface.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Glassmorphism design with custom CSS variables
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Animation**: Framer Motion

## Project Architecture

### Database Schema (shared/schema.ts)
- **Users**: Authentication and user management
- **Organizations**: Client organizations with contact info and universal discounts
- **Sports**: Sports teams within organizations with contact details
- **Orders**: Order management with items, status tracking, and customer information

### Storage Layer (server/storage.ts)
- Full CRUD operations for all entities
- In-memory storage implementation with proper TypeScript types
- Relationship management between organizations, sports, and orders

### API Routes (server/routes.ts)
- RESTful endpoints for all entities
- Request validation using Zod schemas
- Proper error handling and response formatting

### Frontend Structure
- **Pages**: Organizations (main), Order Details, Not Found
- **Components**: Modular components for forms, cards, tabs, and modals
- **UI**: Complete shadcn/ui component library integration
- **Styling**: Custom glassmorphism theme with light/dark mode support

## Key Features Implemented

### Organizations Management
- ✅ Organization listing with state grouping
- ✅ Search functionality across organizations, states, and sports
- ✅ Create/Edit/Delete organizations
- ✅ Organization detail modal with tabs
- ✅ Contact information management
- ✅ Universal discount configuration
- ✅ Logo upload system with Supabase Storage integration
- ✅ Support for PNG, JPG, and SVG logo formats
- ✅ Multi-step organization creation wizard with branding

### Sports Management
- ✅ Sports teams within organizations
- ✅ Salesperson assignment
- ✅ Contact information for each sport
- ✅ Create/Edit/Delete sports functionality

### Order Management
- ✅ Order creation with multiple items
- ✅ Order status tracking (Pending, In Production, Completed, Cancelled)
- ✅ Customer information management
- ✅ Order details page with full item breakdown
- ✅ Integration with organizations

### UI/UX Design
- ✅ Glassmorphism theme implementation
- ✅ Responsive design for mobile and desktop
- ✅ Rich Habits brand colors and styling
- ✅ Smooth animations and transitions
- ✅ Professional business interface

## User Preferences
- Design Focus: Modern glassmorphism UI with professional business aesthetics
- Technical Approach: TypeScript-first development with proper type safety
- Architecture: Component-based React with separation of concerns

## Recent Changes

### August 17, 2025
- ✅ Implemented Supabase Storage integration for reliable logo uploads
- ✅ Created comprehensive upload route with proper error handling  
- ✅ Added support for PNG, JPG, and SVG file formats with 5MB size limit
- ✅ Fixed Radix UI dialog accessibility warning by adding DialogDescription
- ✅ Enhanced organization wizard with improved logo upload functionality
- ✅ Implemented proper JSON response format for all upload operations
- ✅ Added file type validation and contentType detection (including SVG handling)
- ✅ Created public Supabase Storage bucket with proper MIME type configuration
- ✅ Updated client-side upload helper with better error handling
- ✅ Verified upload functionality with successful PNG and SVG test uploads

### January 14, 2025
- ✅ Implemented complete glassmorphism CSS theme with custom variables
- ✅ Created comprehensive database schema with proper relationships
- ✅ Built storage layer with full CRUD operations and TypeScript types
- ✅ Developed all frontend components including forms, modals, and cards
- ✅ Set up routing with organizations and order details pages
- ✅ Integrated TanStack Query for state management
- ✅ Added form validation with Zod and React Hook Form
- ✅ Implemented search and filtering functionality
- ✅ Added responsive design with mobile support
- ✅ Completed all TypeScript error resolution
- ✅ Successfully pushed database schema to PostgreSQL

## Development Status
- **Backend**: ✅ Complete (API routes, storage, validation)
- **Frontend**: ✅ Complete (components, pages, forms, routing)
- **Database**: ✅ Complete (schema pushed to PostgreSQL)
- **Styling**: ✅ Complete (glassmorphism theme implemented)
- **TypeScript**: ✅ Complete (all errors resolved)

## Next Steps
1. Test application functionality with user interaction
2. Add sample data for demonstration
3. Potential enhancements: user authentication, advanced order filtering, reporting features

## Running the Project
- Development server runs on `npm run dev`
- Database schema managed with `npm run db:push`
- All dependencies installed and configured
- Hot reloading enabled for development

The application is ready for user testing and feedback.