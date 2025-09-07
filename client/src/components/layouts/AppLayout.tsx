import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  headerActions?: ReactNode;
}

/**
 * Universal App Layout - THE SINGLE SOURCE OF TRUTH FOR UI CONSISTENCY
 * 
 * UNIVERSAL UI LAWS:
 * 1. ALL pages MUST use this layout component
 * 2. Dark gradient background is MANDATORY and UNCHANGEABLE
 * 3. NO conditional light/dark themes - ALWAYS dark
 * 4. Typography colors are pre-defined and consistent
 * 5. Spacing and container structure are ENFORCED
 * 
 * Usage:
 * <AppLayout title="Page Title" subtitle="Page description">
 *   <YourPageContent />
 * </AppLayout>
 */
export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  showBackButton = false, 
  backHref = '/', 
  headerActions 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Universal Header Structure */}
        {(title || showBackButton || headerActions) && (
          <div className="mb-8">
            {showBackButton && (
              <div className="mb-4">
                <a 
                  href={backHref}
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  ← Back
                </a>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-300 mt-2">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center gap-4">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}