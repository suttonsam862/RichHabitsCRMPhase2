import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  FileText, 
  History,
  Home,
  User
} from "lucide-react";

const customerNavItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/quotes", icon: FileText, label: "Get Quote" },
  { path: "/quotes/history", icon: History, label: "My Quotes" },
  { path: "/orders", icon: ShoppingCart, label: "My Orders" },
];

export function CustomerLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rich Habits Custom Clothing
              </h1>
              <Badge className="bg-green-500 text-white">
                <User className="w-3 h-3 mr-1" />
                Customer Portal
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                Contact Support
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
              {customerNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
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
            
            {/* Customer Quick Info */}
            <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                Your Account
              </h3>
              <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                <div className="flex justify-between">
                  <span>Active Quotes:</span>
                  <span className="font-semibold">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders:</span>
                  <span className="font-semibold">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-semibold">$1,250</span>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Need Help?
              </h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  📞 Call Support
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  💬 Live Chat
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  ❓ FAQ
                </Button>
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