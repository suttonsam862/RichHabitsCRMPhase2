# Overview

This is a full-stack CRM application for "Rich Habits" built with React, TypeScript, Express, and PostgreSQL. The system manages organizations, users, sports, and orders with role-based access control. It features a React frontend with shadcn/ui components, an Express API backend, and uses Supabase for authentication and database management with Drizzle ORM for type-safe database operations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Routing**: React Router v6 with lazy loading and route-based code splitting
- **State Management**: TanStack Query for server state management and caching
- **Layout System**: Role-based layouts supporting Admin, Sales, Manufacturing, Designer, and Customer views
- **Print Support**: Dedicated print layouts and export functionality
- **Accessibility**: Reduced motion support and semantic HTML structure

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based auth with Supabase integration
- **API Design**: RESTful endpoints organized by domain (organizations, users, sports)
- **Middleware**: Request logging, CORS, compression, and authentication guards
- **Error Handling**: Structured error responses with proper HTTP status codes

## Database Design
- **Primary Database**: PostgreSQL hosted on Supabase
- **Schema Management**: Drizzle migrations with schema-first development approach
- **Key Tables**: 
  - `organizations` - Core business entities with branding and contact info
  - `users` - User accounts with role-based permissions
  - `sports` - Available sports categories
  - `org_sports` - Many-to-many relationship between organizations and sports
- **Data Integrity**: Foreign key constraints, UUID primary keys, and timestamp tracking
- **Row Level Security**: Supabase RLS policies for data access control

## Development Workflow
- **Schema Validation**: Mandatory database validation gates before code changes
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Code Quality**: ESLint configuration with TypeScript rules and formatting standards
- **Testing Strategy**: Vitest for unit testing with coverage thresholds
- **Build Process**: Vite for frontend bundling and esbuild for backend compilation

## Security Model
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control with RLS policies
- **Data Validation**: Zod schemas for request validation and type coercion
- **Environment Security**: Encrypted environment variables and secure headers

# External Dependencies

## Core Infrastructure
- **Supabase**: Authentication, PostgreSQL database hosting, and real-time subscriptions
- **Neon Database**: Alternative PostgreSQL provider for development/staging
- **Vite**: Frontend build tool and development server

## UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library with customizable design system
- **Framer Motion**: Animation library for smooth transitions

## Backend Services
- **SendGrid**: Email delivery service for notifications
- **OpenAI API**: AI integration for enhanced functionality
- **Drizzle Kit**: Database migration and introspection tools

## Development Tools
- **TypeScript**: Static type checking across the entire stack
- **ESLint**: Code linting with TypeScript and React rules
- **Vitest**: Testing framework with React Testing Library
- **PostCSS**: CSS processing with Autoprefixer

## Runtime Dependencies
- **Express.js**: Web application framework
- **TanStack Query**: Data fetching and caching
- **React Router**: Client-side routing
- **Zod**: Schema validation and type inference
- **React Hook Form**: Form state management and validation