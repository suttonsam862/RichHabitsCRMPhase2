import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, ShoppingCart, Package, BarChart3, Settings, LogOut } from 'lucide-react';

export function HomePage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navigationCards = [
    {
      title: 'Organizations',
      description: 'Manage customer organizations and contacts',
      icon: Building2,
      href: '/organizations',
      color: 'bg-blue-500'
    },
    {
      title: 'Users',
      description: 'User management and role assignments',
      icon: Users,
      href: '/users',
      color: 'bg-green-500'
    },
    {
      title: 'Quotes',
      description: 'Create and manage sales quotes',
      icon: FileText,
      href: '/quotes',
      color: 'bg-purple-500'
    },
    {
      title: 'Orders',
      description: 'Track and manage customer orders',
      icon: ShoppingCart,
      href: '/orders',
      color: 'bg-orange-500'
    },
    {
      title: 'Products',
      description: 'Product catalog and inventory',
      icon: Package,
      href: '/products',
      color: 'bg-pink-500'
    },
    {
      title: 'Analytics',
      description: 'Business insights and reporting',
      icon: BarChart3,
      href: '/analytics',
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Rich Habits Custom Clothing</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600" data-testid="text-user-email">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                data-testid="button-signout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
          <p className="mt-2 text-gray-600">Select a module to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className="transform transition-transform hover:scale-105"
                data-testid={`link-${card.href.slice(1)}`}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Settings Card */}
        <div className="mt-8">
          <Link to="/settings" data-testid="link-settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Settings</CardTitle>
                    <CardDescription>System configuration and preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}