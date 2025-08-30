# Overview

This is a full-stack CRM application for managing organizations, orders, and users with role-based access control. The system is built as a modern web application with a React frontend and Express.js backend, using PostgreSQL for data persistence and Supabase for authentication and database hosting. The application follows a schema-first approach with strict validation gates and database integrity checks.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: React Router v6 with lazy loading boundaries for performance
- **State Management**: TanStack Query for server state and caching
- **Build Tool**: Vite for fast development and optimized builds
- **Layout System**: Role-based layouts (Admin, Sales, Manufacturing, Designer, Customer) with print/export routes

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful APIs with structured error handling and validation
- **Authentication**: Supabase Auth with JWT tokens and middleware
- **Validation**: Zod schemas for request/response validation
- **Logging**: Structured logging with request IDs for traceability

## Database Design
- **Primary Database**: PostgreSQL hosted on Supabase
- **Schema Management**: Drizzle Kit for migrations with idempotent SQL
- **Security**: Row Level Security (RLS) policies for data access control
- **Core Entities**: Organizations, Users, Sports, Orders with proper foreign key relationships
- **Schema Validation**: Automated schema checking and validation gates

## Development Workflow
- **Gate System**: 10-step validation process (PLAN → ENV → SCHEMA → AUTH/RLS → TYPES → LINT/FORMAT → TESTS → DOCS → READY_TO_EDIT → FINAL_VALIDATE)
- **Schema-First**: All changes must validate against current database schema
- **Change Requests**: Structured YAML-based change request system for all features
- **Type Safety**: Shared TypeScript types between frontend and backend

## Security Architecture
- **Authentication**: Supabase Auth with service role and anon keys
- **Authorization**: Role-based access control with RLS policies
- **API Security**: JWT validation middleware on protected routes
- **Data Validation**: Input sanitization and validation at API boundaries

# External Dependencies

## Core Services
- **Supabase**: Database hosting, authentication, and real-time features
- **Neon Database**: PostgreSQL database provider (alternative to Supabase DB)

## Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **ESLint**: Code linting with TypeScript support
- **Vitest**: Testing framework with coverage reporting
- **PostCSS**: CSS processing with Tailwind CSS

## UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Framer Motion**: Animation and transitions
- **React Helmet Async**: Dynamic head management

## Utility Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation for TypeScript
- **date-fns**: Date manipulation utilities

## Build and Deployment
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast JavaScript bundler for backend
- **tsx**: TypeScript execution for development
- **dotenvx**: Environment variable management

## Email and External APIs
- **SendGrid**: Email delivery service
- **OpenAI API**: AI integration capabilities