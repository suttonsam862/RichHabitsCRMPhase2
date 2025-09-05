import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, ShoppingCart, Package, BarChart3, Settings, LogOut, TrendingUp } from 'lucide-react';

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
      color: 'bg-cyan-500',
      glowColor: 'shadow-cyan-500/25'
    },
    {
      title: 'Users',
      description: 'User management and role assignments',
      icon: Users,
      href: '/users',
      color: 'bg-blue-500',
      glowColor: 'shadow-blue-500/25'
    },
    {
      title: 'Sales',
      description: 'Sales management and performance tracking',
      icon: TrendingUp,
      href: '/sales',
      color: 'bg-orange-500',
      glowColor: 'shadow-orange-500/25'
    },
    {
      title: 'Quotes',
      description: 'Create and manage sales quotes',
      icon: FileText,
      href: '/quotes',
      color: 'bg-purple-500',
      glowColor: 'shadow-purple-500/25'
    },
    {
      title: 'Orders',
      description: 'Track and manage customer orders',
      icon: ShoppingCart,
      href: '/orders',
      color: 'bg-emerald-500',
      glowColor: 'shadow-emerald-500/25'
    },
    {
      title: 'Products',
      description: 'Product catalog and inventory',
      icon: Package,
      href: '/products',
      color: 'bg-pink-500',
      glowColor: 'shadow-pink-500/25'
    },
    {
      title: 'Analytics',
      description: 'Business insights and reporting',
      icon: BarChart3,
      href: '/analytics',
      color: 'bg-indigo-500',
      glowColor: 'shadow-indigo-500/25'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Welcome to Rich Habits
        </h1>
        <p className="text-xl text-gray-300">
          Business Management System
        </p>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <span className="text-sm text-gray-400" data-testid="text-user-email">
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            data-testid="button-signout"
            className="hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Select a Module
          </h2>
          <p className="text-gray-400">Choose what you'd like to work on</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className="transform transition-all duration-300 hover:scale-105"
                data-testid={`link-${card.href.slice(1)}`}
              >
                <Card className="h-full bg-gray-800/50 backdrop-blur-md border-gray-700/50 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group">
                  <CardHeader>
                    <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-3 shadow-lg ${card.glowColor} group-hover:shadow-xl transition-all duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg text-white group-hover:text-cyan-400 transition-colors">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-gray-400 group-hover:text-cyan-300 transition-colors">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Settings Card */}
        <div className="max-w-md mx-auto">
          <Link to="/settings" data-testid="link-settings">
            <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700/50 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-xl transition-all duration-300">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white group-hover:text-purple-400 transition-colors">
                      Settings
                    </CardTitle>
                    <CardDescription className="text-gray-400 group-hover:text-purple-300 transition-colors">
                      System configuration and preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}