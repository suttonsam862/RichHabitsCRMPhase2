
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Building2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-2xl mx-auto">
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Rich Habits
          </h1>
          <p className="text-xl md:text-2xl text-white/70">
            Custom Clothing Business Management
          </p>
          <p className="text-white/50 max-w-lg mx-auto">
            Streamline your operations, manage organizations, and track orders with our powerful platform.
          </p>
        </motion.div>

        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Link href="/organizations">
            <div className="neon-card max-w-md mx-auto cursor-pointer group">
              <div className="neon-card-inner p-8 text-center space-y-4 transition-transform duration-300 group-hover:scale-[1.02]">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white/80" />
                </div>
                <h2 className="text-2xl font-semibold text-white">
                  Manage Organizations
                </h2>
                <p className="text-white/60">
                  View and manage your business relationships, sports programs, and orders.
                </p>
                <div className="flex items-center justify-center gap-2 text-purple-400 font-medium pt-2">
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8"
        >
          <div className="neon-card-blue">
            <div className="neon-card-inner p-6 text-center space-y-3">
              <h3 className="text-lg font-semibold text-white">Organizations</h3>
              <p className="text-white/60 text-sm">Manage business relationships and partnerships</p>
            </div>
          </div>
          
          <div className="neon-card-green">
            <div className="neon-card-inner p-6 text-center space-y-3">
              <h3 className="text-lg font-semibold text-white">Sports Programs</h3>
              <p className="text-white/60 text-sm">Track and organize different sports offerings</p>
            </div>
          </div>
          
          <div className="neon-card-orange">
            <div className="neon-card-inner p-6 text-center space-y-3">
              <h3 className="text-lg font-semibold text-white">Order Management</h3>
              <p className="text-white/60 text-sm">Handle orders and inventory efficiently</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
