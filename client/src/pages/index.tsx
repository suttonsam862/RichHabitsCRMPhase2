

// DEPRECATED: Wouter replaced with React Router - see routes.tsx  
// import { Link } from "wouter";
import { Link } from "react-router-dom";
import { paths } from "@/lib/paths";
import { motion } from "framer-motion";
import { Building2, ArrowRight } from "lucide-react";
import { GlowCard } from "@/components/ui/glow-card";
import { RBButton } from "@/components/ui/rb-button";
import { HeadMeta } from "@/components/head-meta";

export default function Home() {
  return (
    <>
      <HeadMeta title="Home" desc="Welcome to Rich Habits - Custom Clothing Business Management" />
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-16">
        <div className="text-center space-y-8 max-w-2xl mx-auto">
          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-glow-1 via-glow-2 to-glow-3 bg-clip-text text-transparent">
              Rich Habits
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Custom Clothing Business Management
            </p>
            <p className="text-text-soft max-w-lg mx-auto">
              Streamline your operations, manage organizations, and track orders with our powerful platform.
            </p>
          </motion.div>

          {/* Main CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Link to={paths.organizations}>
              <GlowCard className="max-w-md mx-auto cursor-pointer group" variant="intense">
                <div className="text-center space-y-4 transition-transform duration-300 group-hover:scale-[1.02]">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-glow-1/20 to-glow-3/20 border border-white/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-white/80" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">
                    Manage Organizations
                  </h2>
                  <p className="text-text-soft">
                    View and manage your business relationships, sports programs, and orders.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-glow-1 font-medium pt-2">
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </GlowCard>
            </Link>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8"
          >
            <GlowCard>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-white">Organizations</h3>
                <p className="text-text-soft text-sm">Manage business relationships and partnerships</p>
              </div>
            </GlowCard>
            
            <GlowCard>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-white">Sports Programs</h3>
                <p className="text-text-soft text-sm">Track and organize different sports offerings</p>
              </div>
            </GlowCard>
            
            <GlowCard>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-white">Order Management</h3>
                <p className="text-text-soft text-sm">Handle orders and inventory efficiently</p>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}

