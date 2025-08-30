# Overview

This is a full-stack CRM application built for managing organizations, users, and sports-related business processes. The application features a React/TypeScript frontend with a Node.js/Express backend, using PostgreSQL as the database with Drizzle ORM for schema management. The system implements role-based access control and includes features for organization management, user administration, quote generation, and order processing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: React Router v6 with lazy loading and route boundaries
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Layout System**: Role-based layouts (Admin, Sales, Manufacturing, Designer, Customer) with print/export capabilities

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle with PostgreSQL as the primary database
- **Authentication**: Supabase Auth with JWT tokens and RLS policies
- **API Design**: RESTful APIs with domain-based routing structure
- **Error Handling**: Centralized error handling with structured logging
- **Environment Management**: Strict environment variable validation with dotenv

## Database Design
- **Primary Database**: PostgreSQL hosted on Supabase
- **Schema Management**: Drizzle migrations with version control
- **Security**: Row Level Security (RLS) policies for data access control
- **Key Entities**: Users, Organizations, Sports, Orders, Quotes
- **Relationships**: Many-to-many relationships between organizations and sports with junction tables

## Authentication & Authorization
- **Provider**: Supabase Authentication
- **Strategy**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC) with RLS policies
- **Roles**: Owner, Admin, Sales, Manufacturing, Designer, Customer roles
- **Security**: Middleware-based route protection and API endpoint security

## Development Workflow
- **Code Quality**: ESLint configuration with TypeScript rules
- **Testing**: Vitest for unit/integration testing with jsdom environment
- **Build Process**: Separate build pipelines for client and server
- **Development**: Hot module replacement with Vite dev server
- **Database**: Schema-first development with migration validation gates

# External Dependencies

## Core Services
- **Supabase**: PostgreSQL database hosting, authentication, and real-time features
- **Neon Database**: Alternative PostgreSQL provider for database connections

## Third-Party APIs
- **OpenAI API**: GPT model integration for AI-powered features
- **SendGrid**: Email delivery service for transactional emails

## Development Tools
- **Replit**: Cloud development environment with integrated debugging
- **Vite**: Frontend build tool with HMR and plugin ecosystem
- **Drizzle Kit**: Database migration and schema management tools

## UI/UX Libraries
- **Radix UI**: Headless component primitives for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Framer Motion**: Animation library for smooth transitions and interactions
- **React Helmet Async**: Document head management for SEO and meta tags

## Monitoring & Observability
- **Structured Logging**: Centralized logging with request ID tracking
- **Error Boundaries**: React error boundaries for graceful error handling
- **Development Overlay**: Custom debugging overlay for development environment