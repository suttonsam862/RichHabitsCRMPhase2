import { Outlet, Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  Factory, 
  ShoppingCart, 
  Truck, 
  Clock,
  Home
} from "lucide-react";

const manufacturingNavItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/manufacturing", icon: Factory, label: "Production Board" },
  { path: "/orders", icon: ShoppingCart, label: "Orders" },
];

export function ManufacturingLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rich Habits Manufacturing
              </h1>
              <Badge className="bg-orange-500 text-white">
                <Factory className="w-3 h-3 mr-1" />
                Manufacturing
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-semibold text-gray-900 dark:text-gray-100">3 Active</div>
                <div className="text-gray-500">Production Orders</div>
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
              {manufacturingNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
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
            
            {/* Manufacturing Quick Stats */}
            <div className="mt-6 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Production Status
              </h3>
              <div className="space-y-1 text-xs text-orange-700 dark:text-orange-300">
                <div className="flex justify-between">
                  <span>In Progress:</span>
                  <span className="font-semibold">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Quality Check:</span>
                  <span className="font-semibold">1</span>
                </div>
                <div className="flex justify-between">
                  <span>On Schedule:</span>
                  <span className="font-semibold">95%</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Recent Updates
              </h3>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>PO-001 milestone updated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3 h-3" />
                  <span>Materials delivered</span>
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