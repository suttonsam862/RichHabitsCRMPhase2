# Rich Habits Custom Clothing - Business Management System

## Overview
A React-TypeScript business management system for Rich Habits Custom Clothing, designed to streamline organizational workflows with robust data management and sports organization tracking. This system aims to provide a comprehensive solution for managing sales, orders, manufacturing, and product catalogs, with a strong emphasis on data integrity, role-based access, and a modular architecture. The vision is to enhance operational efficiency and provide advanced tools for business management in the custom clothing industry.

## User Preferences
*To be updated based on user feedback and preferences*

## System Architecture
The system is built with a React-TypeScript frontend, an Express.js with TypeScript backend, and a PostgreSQL database.

**Frontend:**
- **Technology**: React with TypeScript, Tailwind CSS for styling, and shadcn/ui components for pre-built UI elements.
- **UI/UX**: Features specialized layouts (AdminLayout, SalesLayout, ManufacturingLayout, DesignerLayout, CustomerLayout) for role-based access. Includes smooth transitions with AnimatePresence and graceful handling of reduced data shapes.
- **State Management**: TanStack Query is used for server state management, ensuring efficient data fetching and caching.
- **Routing**: Migrated to React Router v6 for type-safe navigation, with centralized route management, error boundaries, enhanced 404 pages, and lazy loading for performance. Print layout system included for clean print/export routes.
- **Codebase**: A single frontend tree in `client/src/` with legacy code archived and unified Vite/TypeScript path aliases.

**Backend:**
- **Technology**: Express.js with TypeScript.
- **Database Interaction**: PostgreSQL with Drizzle ORM. Server-side writes bypass Row Level Security using a Supabase admin client for critical operations (Zero-DB-Error Enforcement Framework).
- **API**: RESTful endpoints with Zod validation for data integrity. Features a comprehensive API architecture with validation middleware and a shared DTO system for type-safe communication.
- **Security**: Implements role-based authentication with 5 role types and route-specific access controls. Includes path traversal protection and environment validation for secure API endpoints.
- **Modularity**: Utilizes a feature-based directory structure for clear separation of domains (sales, orders, manufacturing, catalog).
- **Architectural Integrity**: Tools like `scripts/find-circulars.ts` for circular dependency detection and `server/tools/route-inventory.ts` for API documentation ensure maintainability.
- **Data Integrity**: Automated schema introspection and validation (`scripts/db/`) prevent database drift. A schema auto-pull system (`scripts/schema-sync.js`) ensures frontend/backend schema synchronization.
- **Key Features Implemented**:
    - **Sales Pipeline**: Complete lead management with Kanban board, lead details, and analytics.
    - **Order Management**: Full order lifecycle tracking with status management.
    - **Manufacturing**: Production board with purchase orders and milestone tracking.
    - **Product Catalog**: Comprehensive product management with variants and specifications.
    - **Organizations Management**: Robust CRUD operations for organizations, including a hardened logo serving endpoint with multiple fallback layers and caching.
    - **Logo Upload**: Standardized two-step process for secure and reliable logo uploads.
    - **User Management**: Basic user list/get endpoints.

## External Dependencies
- **Supabase**: Used for backend integration, including PostgreSQL database, storage (for logos), and authentication.
- **PostgreSQL**: The primary database for comprehensive data management.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database from the backend.
- **TanStack Query**: For client-side server state management.
- **Tailwind CSS**: For utility-first CSS styling.
- **shadcn/ui**: A collection of re-usable UI components.
- **React Router v6**: For client-side routing.
- **Zod**: For API request validation.