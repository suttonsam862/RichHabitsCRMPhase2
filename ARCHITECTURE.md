# Architecture Documentation

## System Overview

This is a full-stack custom clothing business management platform built with modern web technologies. The system enables businesses to manage organizations, users, orders, and branding assets through a comprehensive administrative interface.

## Technology Stack

### Frontend
- **React 18** - UI framework with modern hooks and concurrent features
- **TypeScript** - Type-safe development with full IntelliSense
- **Vite** - Fast development server and build tool
- **TanStack Query** - Server state management and caching
- **Wouter** - Lightweight routing for React applications
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern, accessible UI component library
- **Framer Motion** - Animation library for smooth user interactions

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe server development
- **Drizzle ORM** - Modern TypeScript ORM with excellent type safety
- **PostgreSQL** - Robust relational database via Neon/Supabase
- **Supabase** - Database hosting with auth and storage capabilities

### Development & Testing
- **Vitest** - Fast unit testing framework
- **Testing Library** - React component testing utilities  
- **ESLint v9** - Modern code linting with flat config
- **Pino** - High-performance logging library

## Project Structure

```
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui base components
│   │   │   ├── org-quick-view-dialog.tsx
│   │   │   └── ...
│   │   ├── pages/             # Page-level components
│   │   │   ├── users-admin.tsx
│   │   │   └── ...
│   │   ├── lib/               # Utility functions and configurations
│   │   │   ├── queryClient.ts # TanStack Query setup
│   │   │   └── utils.ts       # Helper utilities
│   │   └── hooks/             # Custom React hooks
│   └── index.html             # Main HTML entry point
├── server/                     # Backend Express application
│   ├── routes/                # API route handlers
│   │   ├── organizations/     # Organization management
│   │   ├── users/            # User management
│   │   ├── files/            # File and branding operations
│   │   └── index.ts          # Main API router
│   ├── lib/                  # Server utilities
│   │   ├── http.ts          # Standardized API responses
│   │   ├── log.ts           # Logging configuration
│   │   ├── storage.ts       # File storage operations
│   │   └── supabaseAdmin.ts # Supabase admin operations
│   ├── db/                  # Database configuration
│   └── index.ts             # Server entry point
├── shared/                   # Shared code between client/server
│   ├── schema.ts            # Drizzle database schema
│   ├── relations.ts         # Database relations
│   └── dtos/               # Data Transfer Objects
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # End-to-end tests
└── package.json            # Dependencies and scripts
```

## Database Schema

### Core Entities

#### Organizations
Central entity representing schools, businesses, or institutions.
- **Fields**: name, email, phone, address, status, colorPalette, universalDiscounts
- **Features**: Branding file management, sports program association, user roles

#### Users  
System users with role-based access control.
- **Fields**: email, fullName, phone, avatarUrl, isActive, preferences
- **Features**: Multi-role support, organization membership, activity tracking

#### Organization Sports (orgSports)
Junction table linking organizations to sports programs.
- **Fields**: organizationId, sportId, contactName, contactEmail
- **Features**: Sport-specific contact management

#### Roles & Permissions
Role-based access control system.
- **Tables**: roles, permissions, rolePermissions, userRoles
- **Features**: Fine-grained permission system, organization-scoped roles

### Data Flow Architecture

```
Frontend (React) → API Layer (Express) → Business Logic → Database (PostgreSQL)
                ↓
         TanStack Query Cache ← HTTP Responses ← Standardized API Contract
```

## API Design Patterns

### Standardized Response Format
All API endpoints follow a consistent response structure:

```typescript
{
  success: boolean;
  data?: T;
  count?: number;  // For paginated responses
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Handling
- **Client Errors (4xx)**: Validation failures, missing resources, unauthorized access
- **Server Errors (5xx)**: Database errors, external service failures, unexpected exceptions
- **Logging**: Comprehensive error tracking with request IDs via Pino

### Security Measures
- **Helmet.js**: Security headers and protection middleware
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request throttling to prevent abuse
- **Input Validation**: Zod schema validation for all API inputs
- **Role-Based Access**: Organization-scoped permissions

## State Management

### Frontend State
- **Server State**: TanStack Query for API data caching and synchronization
- **Component State**: React hooks (useState, useReducer) for local component state
- **Form State**: React Hook Form with Zod validation for type-safe forms

### Backend State
- **Database**: PostgreSQL as single source of truth
- **Caching**: TanStack Query provides client-side caching
- **Sessions**: Express sessions for user authentication state

## Component Architecture

### UI Component Hierarchy
```
App
├── QueryClientProvider (TanStack Query)
├── HelmetProvider (SEO/Meta)
├── TooltipProvider (shadcn/ui)
├── Toaster (Global notifications)
└── Page Components
    ├── UsersAdminPage
    │   ├── DataTable (User list)
    │   ├── CreateUserDialog
    │   ├── EditUserDialog
    │   └── ManageRolesDialog
    └── OrganizationsPage
        ├── OrganizationCard
        ├── OrgQuickViewDialog
        │   ├── Tabs (Overview, Branding, Sports, Users)
        │   ├── ScrollArea (Content containers)
        │   └── BrandingFileGrid
        └── OrganizationWizard
```

### Design System
- **shadcn/ui**: Foundation components (Button, Dialog, Tabs, etc.)
- **Custom Components**: Business logic components built on shadcn base
- **Responsive Design**: Mobile-first approach with Tailwind utilities
- **Dark Mode**: System-wide theme support (planned)

## Data Mapping Strategy

### DTO ↔ Database Field Mapping
The system uses consistent camelCase ↔ snake_case mapping:

```typescript
// Frontend/API uses camelCase
{ fullName: "John Doe", createdAt: "2024-01-01T00:00:00Z" }

// Database uses snake_case  
{ full_name: "John Doe", created_at: "2024-01-01 00:00:00+00" }
```

Mapping handled by utility functions in `server/lib/http.ts`:
- `mapDtoToDb()`: Convert camelCase to snake_case for database operations
- `mapDbToDto()`: Convert snake_case to camelCase for API responses

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Vite automatically splits bundles for optimal loading
- **Query Caching**: TanStack Query reduces redundant API calls
- **Lazy Loading**: Components loaded on-demand to reduce initial bundle size
- **Virtualization**: Large lists use virtual scrolling (planned for large datasets)

### Backend Optimization  
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Compression**: gzip compression for response payloads
- **Rate Limiting**: Protects against abuse and ensures fair resource usage

### Deployment Architecture
- **Static Assets**: Client build served via CDN/static hosting
- **API Server**: Express server deployed on cloud platform (Replit/Railway/Vercel)
- **Database**: Managed PostgreSQL (Neon/Supabase) with automatic backups
- **File Storage**: Supabase Storage for branding files and assets

## Development Workflow

### Code Quality
- **TypeScript**: Full type safety across frontend and backend
- **ESLint**: Consistent code style and error prevention
- **Prettier**: Automated code formatting
- **Testing**: Unit, integration, and e2e test coverage

### Build Process
1. **Development**: `npm run dev` - Hot reload for both client and server
2. **Type Checking**: `npm run check` - Full TypeScript validation
3. **Testing**: `npm run test` - Run full test suite
4. **Build**: `npm run build` - Production-ready build
5. **Deploy**: Automated deployment via platform-specific tools

## Future Scalability

### Planned Enhancements
- **Microservices**: Split into domain-specific services as system grows
- **Caching Layer**: Redis for session storage and frequently accessed data
- **Event Sourcing**: Audit trails and event-driven architecture
- **Real-time Features**: WebSocket support for live updates
- **Mobile App**: React Native application using same API backend

### Monitoring & Observability
- **Logging**: Centralized logging with structured data
- **Metrics**: Application performance monitoring
- **Error Tracking**: Automated error reporting and alerting
- **Health Checks**: Endpoint monitoring and uptime tracking