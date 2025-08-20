import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  ShoppingCart,
  Building,
  Home,
  Target
} from "lucide-react";

const salesNavItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/sales", icon: TrendingUp, label: "Sales Pipeline" },
  { path: "/orders", icon: ShoppingCart, label: "Orders" },
  { path: "/organizations", icon: Building, label: "Organizations" },
  { path: "/quotes", icon: FileText, label: "Quote Generator" },
];

export function SalesLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rich Habits Sales
              </h1>
              <Badge className="bg-blue-500 text-white">
                <Target className="w-3 h-3 mr-1" />
                Sales Representative
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-semibold text-gray-900 dark:text-gray-100">$12,450</div>
                <div className="text-gray-500">This Month</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
          <div className="p-4">
            <div className="space-y-1">
              {salesNavItems.map((item) => {
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
            
            {/* Sales Quick Stats */}
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Quick Stats
              </h3>
              <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                <div className="flex justify-between">
                  <span>Active Leads:</span>
                  <span className="font-semibold">8</span>
                </div>
                <div className="flex justify-between">
                  <span>Close Rate:</span>
                  <span className="font-semibold">73%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pipeline:</span>
                  <span className="font-semibold">$45K</span>
                </div>
              </div>
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