import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ProtectedRoute from '@/auth/ProtectedRoute';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { AuthConfirmedPage } from '@/pages/auth/AuthConfirmedPage';

// Protected pages
import { HomePage } from '@/pages/HomePage';
import { OrganizationListPage } from '@/pages/organization/OrganizationListPage';
import OrganizationsList from '@/pages/organizations/List';
import CreateWizard from '@/pages/organizations/CreateWizard';
import { NotFound } from '@/components/NotFound';

// Lazy load other pages for better performance
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy loaded pages
const SimplifiedSetup = lazy(() => import('@/pages/organizations/SimplifiedSetup').then(m => ({ default: m.default })));
const OrganizationViewPage = lazy(() => import('@/pages/organizations/ViewPage').then(m => ({ default: m.default })));
const OrganizationEditPage = lazy(() => import('@/pages/organizations/EditPage').then(m => ({ default: m.default })));
const OrganizationSportsPage = lazy(() => import('@/pages/organizations/SportsPage').then(m => ({ default: m.default })));
// AddSportsPage component doesn't exist, removing for now
const OrganizationKPIPage = lazy(() => import('@/pages/organizations/KPIPage').then(m => ({ default: m.default })));
const UsersManagement = lazy(() => import('@/pages/users/UsersManagement').then(m => ({ default: m.default })));
const QuotesPage = lazy(() => import('@/pages/quotes/QuotesPage').then(m => ({ default: m.QuotesPage })));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const QuoteGenerator = lazy(() => import('@/pages/QuoteGenerator').then(m => ({ default: m.default })));

// Loading component for lazy loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<RegisterPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/confirmed" element={<AuthConfirmedPage />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute />}>
                <Route index element={<HomePage />} />
              </Route>
              
              <Route path="/organizations" element={<ProtectedRoute />}>
                <Route index element={<OrganizationsList />} />
                <Route path="create" element={<CreateWizard />} />
                <Route path=":id" element={<OrganizationViewPage />} />
                <Route path=":id/edit" element={<OrganizationEditPage />} />
                <Route path=":id/setup" element={<SimplifiedSetup />} />
                <Route path=":id/sports" element={<OrganizationSportsPage />} />
                {/* AddSportsPage route removed - component doesn't exist */}
                <Route path=":id/kpis" element={<OrganizationKPIPage />} />
              </Route>
              
              <Route path="/users" element={<ProtectedRoute />}>
                <Route index element={<UsersManagement />} />
              </Route>
              
              <Route path="/quotes" element={<ProtectedRoute />}>
                <Route index element={<QuotesPage />} />
              </Route>
              
              <Route path="/quote" element={<ProtectedRoute />}>
                <Route index element={<QuoteGenerator />} />
              </Route>
              
              <Route path="/orders" element={<ProtectedRoute />}>
                <Route index element={<OrdersPage />} />
              </Route>
              
              <Route path="/products" element={<ProtectedRoute />}>
                <Route index element={<ProductsPage />} />
              </Route>
              
              <Route path="/analytics" element={<ProtectedRoute />}>
                <Route index element={<AnalyticsPage />} />
              </Route>
              
              <Route path="/settings" element={<ProtectedRoute />}>
                <Route index element={<SettingsPage />} />
              </Route>

              {/* 404 - Not Found */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}