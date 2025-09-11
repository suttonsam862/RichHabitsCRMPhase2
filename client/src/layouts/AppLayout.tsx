
import { Link, useLocation, Outlet } from "react-router-dom";
import { paths } from "@/lib/paths";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Home, Users, FileText, TrendingUp, Menu, X, Package, Palette } from "lucide-react";
import { useState } from "react";
import richHabitsLogo from "@assets/BlackPNG_New_Rich_Habits_Logo_caa84ddc-c1dc-49fa-a3cf-063db73499d3_1757019113547.png";

interface AppLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppLayout({ children, footer }: AppLayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: paths.home, label: "Home", icon: Home },
    { path: paths.organizations, label: "Organizations", icon: Building2 },
    { path: paths.users, label: "Users", icon: Users },
    { path: "/sales", label: "Sales", icon: TrendingUp },
    { path: "/catalog", label: "Catalog", icon: Package },
    { path: "/designers", label: "Designers", icon: Palette },
    { path: paths.quotes, label: "Quote Generator", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-bg-void">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-bg-void via-gray-900/50 to-bg-void -z-10" />
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
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
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map(({ path, label, icon: Icon }) => {
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
                      <span className="font-medium">{label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Hamburger Menu Button - Visible on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              data-testid="button-hamburger-menu"
              aria-label="Toggle navigation menu"
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
              <nav className="space-y-2">
                {navItems.map(({ path, label, icon: Icon }) => {
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
                        <span className="font-medium text-lg">{label}</span>
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
      <main className="relative">
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
