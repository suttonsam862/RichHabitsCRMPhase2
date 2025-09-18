import { Link, useLocation } from "react-router-dom";
import { paths } from "@/lib/paths";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Home, Users, FileText, TrendingUp, Menu, X, Package, Palette, Factory, ChevronDown, Settings2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import richHabitsLogo from "@assets/BlackPNG_New_Rich_Habits_Logo_caa84ddc-c1dc-49fa-a3cf-063db73499d3_1757019113547.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppLayout({ children, footer }: AppLayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus management for page transitions
  useEffect(() => {
    // Focus main content when location changes for screen reader users
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [location.pathname]);

  // Handle skip link click
  const handleSkipToMain = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  };

  // Main navigation items
  const mainNavItems = [
    { path: paths.home, label: "Home", icon: Home },
    { path: paths.organizations, label: "Organizations", icon: Building2 },
    { path: paths.users, label: "Users", icon: Users },
    { path: "/sales", label: "Sales", icon: TrendingUp },
    { path: paths.quotes, label: "Quote Generator", icon: FileText },
  ];

  // Management dropdown items
  const managementItems = [
    { path: "/catalog", label: "Catalog", icon: Package },
    { path: "/designers", label: "Designers", icon: Palette },
    { path: "/manufacturers", label: "Manufacturers", icon: Factory },
  ];

  // All items for mobile menu
  const allNavItems = [...mainNavItems, ...managementItems];

  const isManagementActive = managementItems.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen bg-bg-void">
      {/* Skip Links */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          ref={skipLinkRef}
          href="#main-content"
          onClick={handleSkipToMain}
          className="absolute top-0 left-0 z-[100] bg-blue-600 text-white px-4 py-2 rounded-br focus:outline-none focus:ring-2 focus:ring-blue-300 transform -translate-y-full focus:translate-y-0 transition-transform"
          data-testid="skip-link-main"
        >
          Skip to main content
        </a>
        <a
          href="#navigation"
          className="absolute top-0 left-32 z-[100] bg-blue-600 text-white px-4 py-2 rounded-br focus:outline-none focus:ring-2 focus:ring-blue-300 transform -translate-y-full focus:translate-y-0 transition-transform"
          data-testid="skip-link-nav"
        >
          Skip to navigation
        </a>
      </div>

      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-bg-void via-gray-900/50 to-bg-void -z-10" />
      
      {/* Top Navigation */}
      <nav 
        id="navigation"
        role="navigation" 
        aria-label="Main navigation"
        className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={paths.home}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <img 
                  src={richHabitsLogo} 
                  alt="Rich Habits Logo" 
                  className="w-10 h-10 object-contain filter invert brightness-0"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-glow-1 to-glow-3 bg-clip-text text-transparent">
                  Rich Habits
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {mainNavItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link key={path} to={path}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-glow-1/20 to-glow-2/20 text-glow-1 border border-glow-1/30"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{label}</span>
                    </motion.div>
                  </Link>
                );
              })}

              {/* Management Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isManagementActive
                        ? "bg-gradient-to-r from-glow-1/20 to-glow-2/20 text-glow-1 border border-glow-1/30"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    data-testid="button-management-dropdown"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Management</span>
                    <ChevronDown className="h-3 w-3" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-white/10">
                  {managementItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                      <DropdownMenuItem key={path} asChild>
                        <Link 
                          to={path}
                          className={`flex items-center space-x-2 px-3 py-2 cursor-pointer ${
                            isActive ? "text-glow-1 bg-glow-1/10" : "text-white/70 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Hamburger Menu Button - Visible on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              data-testid="button-hamburger-menu"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden sticky top-16 z-40 backdrop-blur-xl bg-black/30 border-b border-white/10 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <nav 
                id="mobile-navigation"
                className="space-y-2" 
                role="navigation" 
                aria-label="Mobile navigation menu"
              >
                {/* Main Nav Items */}
                {mainNavItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-glow-1/20 to-glow-2/20 text-glow-1 border border-glow-1/30"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                      </motion.div>
                    </Link>
                  );
                })}

                {/* Separator */}
                <div className="border-t border-white/10 my-2" />
                
                {/* Management Section */}
                <div className="px-4 py-2 text-white/50 text-xs uppercase tracking-wider">Management</div>
                {managementItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-glow-1/20 to-glow-2/20 text-glow-1 border border-glow-1/30"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main 
        id="main-content"
        ref={mainContentRef}
        role="main"
        className="relative focus:outline-none"
        tabIndex={-1}
        aria-label="Main content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      {footer && (
        <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}