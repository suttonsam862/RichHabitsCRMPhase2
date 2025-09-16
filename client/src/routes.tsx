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
const AddSportsPage = lazy(() => import('@/pages/organizations/AddSportsPage').then(m => ({ default: m.default })));
const OrganizationKPIPage = lazy(() => import('@/pages/organizations/KPIPage').then(m => ({ default: m.default })));
// Comprehensive users management with full CRUD, roles, and permissions
const UsersManagement = lazy(() => import('@/pages/users/UsersManagement').then(m => ({ default: m.default })));
const UserDetailsPage = lazy(() => import('@/pages/users/UserDetailsPage').then(m => ({ default: m.default })));
const ComprehensiveUserEditForm = lazy(() => import('@/pages/users/ComprehensiveUserEditForm').then(m => ({ default: m.default })));
const SalesManagement = lazy(() => import('@/pages/sales/SalesManagement').then(m => ({ default: m.default })));
const CreateSalesperson = lazy(() => import('@/pages/sales/CreateSalesperson').then(m => ({ default: m.default })));
const SalespersonDetails = lazy(() => import('@/pages/sales/SalespersonDetails').then(m => ({ default: m.default })));
const EditSalesperson = lazy(() => import('@/pages/sales/EditSalesperson').then(m => ({ default: m.default })));
const QuotesPage = lazy(() => import('@/pages/quotes/QuotesPage').then(m => ({ default: m.default })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.default })));
const OrganizedSettingsPage = lazy(() => import('@/pages/settings/OrganizedSettingsPage').then(m => ({ default: m.default })));
const QuoteGenerator = lazy(() => import('@/pages/QuoteGenerator').then(m => ({ default: m.default })));
const QuoteHistory = lazy(() => import('@/pages/QuoteHistory').then(m => ({ default: m.default })));
const CatalogManagement = lazy(() => import('@/pages/catalog/CatalogManagement').then(m => ({ default: m.default })));
const DesignerManagement = lazy(() => import('@/pages/designers/DesignerManagement').then(m => ({ default: m.default })));
const ManufacturerManagement = lazy(() => import('@/pages/manufacturers/ManufacturerManagement').then(m => ({ default: m.default })));

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
                <Route path=":id/sports/new" element={<AddSportsPage />} />
                <Route path=":id/kpis" element={<OrganizationKPIPage />} />
              </Route>
              
              <Route path="/users" element={<ProtectedRoute />}>
                <Route index element={<UsersManagement />} />
                <Route path=":id" element={<UserDetailsPage />} />
                <Route path=":id/edit" element={<ComprehensiveUserEditForm />} />
              </Route>
              
              <Route path="/sales" element={<ProtectedRoute />}>
                <Route index element={<SalesManagement />} />
                <Route path="create" element={<CreateSalesperson />} />
                <Route path=":id" element={<SalespersonDetails />} />
                <Route path=":id/edit" element={<EditSalesperson />} />
              </Route>
              
              <Route path="/quotes" element={<ProtectedRoute />}>
                <Route index element={<QuotesPage />} />
                <Route path="history" element={<QuoteHistory />} />
              </Route>
              
              <Route path="/quote" element={<ProtectedRoute />}>
                <Route index element={<QuoteGenerator />} />
              </Route>
              
              
              <Route path="/catalog" element={<ProtectedRoute />}>
                <Route index element={<CatalogManagement />} />
              </Route>
              
              <Route path="/designers" element={<ProtectedRoute />}>
                <Route index element={<DesignerManagement />} />
              </Route>
              
              <Route path="/manufacturers" element={<ProtectedRoute />}>
                <Route index element={<ManufacturerManagement />} />
              </Route>
              
              <Route path="/settings" element={<ProtectedRoute />}>
                <Route index element={<OrganizedSettingsPage />} />
                <Route path="old" element={<SettingsPage />} />
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