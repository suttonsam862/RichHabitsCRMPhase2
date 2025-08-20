# Routing Architecture Documentation

## Overview
The application uses a centralized routing system with React Router v6 to eliminate routing drift and ensure maintainable navigation architecture.

## Centralized Route Management

### Primary Route File: `client/src/routes.tsx`
All route declarations are managed in a single source of truth: `client/src/routes.tsx`

**Key Benefits:**
- Single file to manage all routes
- Lazy-loaded pages for optimal performance
- Consistent error boundaries on all routes
- Clear separation between app and print layouts
- Type-safe navigation with path helpers

### Route Configuration
```typescript
export const ROUTE_MAP = [
  {
    path: paths.home,
    componentName: 'Home',
    lazyPath: './pages/index',
    layout: 'app'
  },
  // ... other routes
] as const;
```

## Adding New Routes

### 1. Add Path to `client/src/lib/paths.ts`
```typescript
export const paths = {
  // ... existing paths
  newFeature: "/new-feature",
  newFeatureDetail: (id: string) => `/new-feature/${id}`,
} as const;
```

### 2. Create Your Page Component
```typescript
// client/src/pages/NewFeature.tsx
export default function NewFeature() {
  return <div>New Feature Page</div>;
}
```

### 3. Add Route to `client/src/routes.tsx`
```typescript
// Import the lazy component
const NewFeature = lazy(() => import('./pages/NewFeature'));

// Add to route configuration in ROUTE_MAP
{
  path: paths.newFeature,
  componentName: 'NewFeature',
  lazyPath: './pages/NewFeature',
  layout: 'app' // or 'print' for print routes
}

// Add route to the Routes component
<Route path="new-feature" element={withErrorBoundary(NewFeature)()} />
```

### 4. Update Navigation (Optional)
If adding to main navigation, update `client/src/layouts/AppLayout.tsx`:
```typescript
const navItems = [
  // ... existing items
  { path: paths.newFeature, label: "New Feature", icon: YourIcon },
];
```

## Layout System

### AppLayout (Standard Pages)
- **Used for:** Main application pages with navigation, header, sidebar
- **Location:** `client/src/layouts/AppLayout.tsx`
- **Routes:** All standard app routes (Home, Organizations, Users, etc.)
- **Features:** Navigation bar, responsive layout, app chrome

### PrintLayout (Print/Export Pages)
- **Used for:** Print-friendly pages, export views, minimal chrome
- **Location:** `client/src/layouts/PrintLayout.tsx`  
- **Routes:** Quote print, export routes under `/print/*`
- **Features:** No navigation, print optimizations, clean styling

### Layout Assignment
Routes are wrapped in layout components using React Router's nested routing:

```typescript
// App Layout Routes (with navigation)
<Route path="/" element={<AppLayoutWrapper />}>
  <Route index element={withErrorBoundary(Home)()} />
  <Route path="organizations" element={withErrorBoundary(Organizations)()} />
  // ... other app routes
</Route>

// Print Layout Routes (no navigation chrome)
<Route path="/print" element={<PrintLayoutWrapper />}>
  <Route path="quote/:id" element={withErrorBoundary(QuoteGenerator)()} />
  // ... other print routes
</Route>
```

## Error Handling

### Error Boundaries
Every route is automatically wrapped with `ErrorBoundary` component that:
- Catches React render errors
- Shows user-friendly error UI
- Provides "Try Again" and "Back to Home" options
- Logs errors to console in development

### 404 Not Found
- **Component:** `client/src/pages/not-found.tsx`
- **Features:** User-friendly message, navigation options
- **Placement:** Catch-all route at the bottom of route tree

## Type-Safe Navigation

### Path Helpers: `client/src/lib/paths.ts`
Instead of using string literals, use typed path helpers:

```typescript
// ❌ Don't do this
navigate("/organizations/123")

// ✅ Do this  
navigate(paths.org("123"))
```

### Navigation Utilities
```typescript
// Import paths
import { paths } from "@/lib/paths";

// Static paths
<Link to={paths.home}>Home</Link>
<Link to={paths.organizations}>Organizations</Link>

// Dynamic paths
<Link to={paths.org(orgId)}>View Organization</Link>
<Link to={paths.orders(orderId)}>View Order</Link>

// Programmatic navigation
const navigate = useNavigate();
navigate(paths.quoteHistory);
```

## Migration from Wouter

### Deprecated Router System
The previous Wouter-based routing has been replaced with React Router v6:

```typescript
// ❌ OLD (Wouter) - Now deprecated
import { Route, Switch } from "wouter";
import { Link, useLocation } from "wouter";

// ✅ NEW (React Router v6)  
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
```

### Legacy Code References
Old Wouter imports are commented with migration notes:
```typescript
// DEPRECATED: Wouter replaced with React Router - see routes.tsx
// import { Link, useLocation } from "wouter";
import { Link, useLocation } from "react-router-dom";
```

## Print/Export Routes

### Print Route Structure
Print routes are isolated from app chrome for clean printing:

```
/print/quote/:id          # Print view of quote
/print/quote/:id/export   # Export view of quote  
```

### Print Styling
The `PrintLayout` component includes print-specific CSS:
- Removes margins/padding for print
- Hides `.no-print` elements
- Shows `.print-only` elements
- Clean white background

### Adding Print Routes
```typescript
// 1. Add to ROUTE_MAP with layout: 'print'
{
  path: paths.quotePrint(':id'),
  componentName: 'QuoteGenerator',
  lazyPath: './pages/QuoteGenerator',
  layout: 'print'
}

// 2. Add to PrintLayout route group
<Route path="/print" element={<PrintLayoutWrapper />}>
  <Route path="quote/:id" element={withErrorBoundary(QuoteGenerator)()} />
</Route>
```

## Best Practices

### 1. Route Organization
- Keep all routes in `routes.tsx`
- Use lazy loading for all pages
- Group related routes logically
- Use descriptive route names

### 2. Navigation
- Always use `paths` helpers instead of string literals
- Prefer declarative `<Link>` over imperative `navigate()`
- Use programmatic navigation only for form submissions/actions

### 3. Error Handling
- Let the error boundary handle React errors
- Implement loading states for async operations
- Provide clear error messages and recovery options

### 4. Performance
- All pages are lazy-loaded by default
- Error boundaries prevent cascading failures
- Minimal bundle splits at route level

## Deep Link Support (SPA Fallback)

### Current Status
- Client-side routing works perfectly
- Direct URL access and browser refresh work in development
- **Production deployment requires server configuration** for SPA fallback

### Production Requirements
For production deployments, the server must serve `index.html` for all routes that don't exist as static files. This ensures deep links and browser refresh work correctly.

**Note:** Server-side configuration will be addressed in a separate server configuration prompt.

## Smoke Test Checklist

### Navigation Test Routes
Test these key navigation flows:

1. **Home** (`/`) → **Organizations** (`/organizations`)
2. **Organizations** → **Quote Generator** (`/quote`) 
3. **Quote Generator** → **Quote History** (`/quotes/history`)
4. **Any page** → **Invalid URL** → **404 Not Found**
5. **404** → **Back to Dashboard** → **Home**

### Error Boundary Tests
1. Trigger a React error in a component
2. Verify error boundary catches and displays fallback UI
3. Test "Try Again" and "Back to Home" recovery options

### Print Layout Tests
1. Navigate to print route (when implemented)
2. Verify no app navigation chrome
3. Test print preview functionality

## Future Enhancements

### Planned Features
- [ ] Route-level authentication guards
- [ ] Dynamic route loading based on user permissions
- [ ] Route analytics and performance monitoring  
- [ ] Advanced print/export route templates

### Migration Notes
- All Wouter dependencies can be removed once testing is complete
- Route transitions and animations can be re-implemented with React Router v6
- Consider adding route preloading for frequently accessed pages

---

**Last Updated:** August 20, 2025  
**Architecture Status:** ✅ Centralized routing implemented  
**Migration Status:** ✅ Wouter → React Router v6 complete