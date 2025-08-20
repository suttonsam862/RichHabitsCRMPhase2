import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Package, 
  Image, 
  Layers,
  Home,
  FileText
} from "lucide-react";

const designerNavItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/catalog", icon: Package, label: "Product Catalog" },
  { path: "/quotes", icon: FileText, label: "Quote Generator" },
];

export function DesignerLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rich Habits Design Studio
              </h1>
              <Badge className="bg-purple-500 text-white">
                <Palette className="w-3 h-3 mr-1" />
                Designer
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-semibold text-gray-900 dark:text-gray-100">24 Products</div>
                <div className="text-gray-500">In Catalog</div>
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
              {designerNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
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
            
            {/* Design Tools */}
            <div className="mt-6 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                Design Tools
              </h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <Image className="w-3 h-3 mr-2" />
                  Asset Manager
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <Layers className="w-3 h-3 mr-2" />
                  Template Library
                </Button>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Recent Projects
              </h3>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div>Custom T-Shirt Design</div>
                <div>Corporate Polo Template</div>
                <div>Hoodie Color Variants</div>
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