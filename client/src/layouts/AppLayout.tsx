
// DEPRECATED: Wouter replaced with React Router
// import { Link, useLocation } from "wouter";
import { Link, useLocation } from "react-router-dom";
import { paths } from "@/lib/paths";
import { motion } from "framer-motion";
import { Building2, Home, Users, FileText } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppLayout({ children, footer }: AppLayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: paths.home, label: "Home", icon: Home },
    { path: paths.organizations, label: "Organizations", icon: Building2 },
    { path: paths.users, label: "Users", icon: Users },
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
                className="flex items-center space-x-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glow-1 to-glow-2 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RH</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-glow-1 to-glow-3 bg-clip-text text-transparent">
                  Rich Habits
                </span>
              </motion.div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
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
