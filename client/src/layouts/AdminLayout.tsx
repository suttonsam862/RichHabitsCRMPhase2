import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Users, 
  BarChart3, 
  Shield,
  Building,
  Package,
  ShoppingCart,
  Factory,
  FileText,
  Home
} from "lucide-react";

const adminNavItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/organizations", icon: Building, label: "Organizations" },
  { path: "/users", icon: Users, label: "Users" },
  { path: "/sales", icon: BarChart3, label: "Sales Pipeline" },
  { path: "/orders", icon: ShoppingCart, label: "Orders" },
  { path: "/manufacturing", icon: Factory, label: "Manufacturing" },
  { path: "/catalog", icon: Package, label: "Product Catalog" },
  { path: "/quotes", icon: FileText, label: "Quotes" },
];

export function AdminLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rich Habits Admin
              </h1>
              <Badge className="bg-red-500 text-white">
                <Shield className="w-3 h-3 mr-1" />
                Administrator
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
          <div className="p-4">
            <div className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}