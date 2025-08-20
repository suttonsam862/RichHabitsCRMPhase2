import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/layouts/AppLayout';
import { PrintLayout } from '@/layouts/PrintLayout';
import { paths } from '@/lib/paths';

// Lazy load all pages for code splitting
const Home = lazy(() => import('./pages/index'));
const Organizations = lazy(() => import('./pages/organizations-enhanced'));
const OrderDetails = lazy(() => import('./pages/order-details'));
const Users = lazy(() => import('./pages/users'));
const QuoteGenerator = lazy(() => import('./pages/QuoteGenerator'));
const QuoteHistory = lazy(() => import('./pages/QuoteHistory'));
const NotFound = lazy(() => import('./pages/not-found'));

// Loading component for Suspense fallbacks
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-glow-1"></div>
    </div>
  );
}

// Wrapped page components with error boundaries
function withErrorBoundary(Component: React.ComponentType) {
  return function WrappedComponent() {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

// Layout wrappers
function AppLayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function PrintLayoutWrapper() {
  return (
    <PrintLayout>
      <Outlet />
    </PrintLayout>
  );
}

// Route configuration for centralized management
export const ROUTE_MAP = [
  {
    path: paths.home,
    componentName: 'Home',
    lazyPath: './pages/index',
    layout: 'app'
  },
  {
    path: paths.organizations,
    componentName: 'Organizations',
    lazyPath: './pages/organizations-enhanced',
    layout: 'app'
  },
  {
    path: paths.users,
    componentName: 'Users',
    lazyPath: './pages/users',
    layout: 'app'
  },
  {
    path: paths.quotes,
    componentName: 'QuoteGenerator',
    lazyPath: './pages/QuoteGenerator',
    layout: 'app'
  },
  {
    path: paths.quoteHistory,
    componentName: 'QuoteHistory',
    lazyPath: './pages/QuoteHistory',
    layout: 'app'
  },
  {
    path: '/orders/:id',
    componentName: 'OrderDetails', 
    lazyPath: './pages/order-details',
    layout: 'app'
  },
  // Print/export routes (minimal layout)
  {
    path: paths.quotePrint(':id'),
    componentName: 'QuoteGenerator',
    lazyPath: './pages/QuoteGenerator',
    layout: 'print'
  },
  {
    path: paths.quoteExport(':id'),
    componentName: 'QuoteGenerator',
    lazyPath: './pages/QuoteGenerator',
    layout: 'print'
  },
] as const;

/**
 * Centralized routing component
 * All route declarations should be managed here
 */
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* App Layout Routes (with navigation) */}
        <Route path="/" element={<AppLayoutWrapper />}>
          <Route index element={withErrorBoundary(Home)()} />
          <Route path="organizations" element={withErrorBoundary(Organizations)()} />
          <Route path="users" element={withErrorBoundary(Users)()} />
          <Route path="quote" element={withErrorBoundary(QuoteGenerator)()} />
          <Route path="quotes/history" element={withErrorBoundary(QuoteHistory)()} />
          <Route path="orders/:id" element={withErrorBoundary(OrderDetails)()} />
        </Route>

        {/* Print Layout Routes (no navigation chrome) */}
        <Route path="/print" element={<PrintLayoutWrapper />}>
          <Route path="quote/:id" element={withErrorBoundary(QuoteGenerator)()} />
          <Route path="quote/:id/export" element={withErrorBoundary(QuoteGenerator)()} />
        </Route>

        {/* Future routes - commented for now */}
        {/* 
        <Route path="/orders" element={withErrorBoundary(Orders)()} />
        <Route path="/designs" element={withErrorBoundary(Designs)()} />
        */}

        {/* 404 - must be last */}
        <Route path="*" element={withErrorBoundary(NotFound)()} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Helper function to get route info by path
 */
export function getRouteInfo(pathname: string) {
  return ROUTE_MAP.find(route => {
    const routeRegex = new RegExp(
      '^' + route.path.replace(/:[^/]+/g, '[^/]+') + '$'
    );
    return routeRegex.test(pathname);
  });
}

/**
 * Helper to check if current route should use print layout
 */
export function isPrintRoute(pathname: string) {
  return pathname.startsWith('/print/') || 
         pathname.includes('/print') || 
         pathname.includes('/export');
}