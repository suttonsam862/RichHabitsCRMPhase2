import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, DollarSign, Users, Trophy, Calendar, ShoppingCart, Target } from 'lucide-react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { motion } from 'framer-motion';

export default function OrganizationKPIPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id
  });

  // Fetch KPI metrics from API
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['organization-metrics', id],
    queryFn: () => api.get(`/api/organizations/${id}/metrics`),
    enabled: !!id && org?.success
  });

  const kpiData = metricsData?.data || {
    totalRevenue: 0,
    totalOrders: 0,
    activeSports: 0,
    yearsWithRichHabits: 0,
    averageOrderValue: 0,
    repeatCustomerRate: 0,
    growthRate: 0,
    satisfactionScore: 0
  };

  if (orgLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-2 text-white/60">Loading organization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!org?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <GlowCard className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-white/60 mb-6">The organization you're looking for doesn't exist.</p>
            <Link to="/organizations">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
          </GlowCard>
        </div>
      </div>
    );
  }

  const organization = org.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link to={`/organizations/${id}`}>
              <Button variant="ghost" size="sm" className="text-white hover:text-cyan-400 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {organization.name}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Key Performance Indicators
              </h1>
              <p className="text-white/60 mt-1">Performance metrics and insights for {organization.name}</p>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                ${kpiData.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-white/60 text-sm mb-2">Gross Revenue</p>
              <div className="flex items-center justify-center gap-1 text-green-400 text-sm">
                <TrendingUp className="h-3 w-3" />
                <span>+{kpiData.growthRate}%</span>
              </div>
            </GlowCard>
          </motion.div>

          {/* Total Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{kpiData.totalOrders}</h3>
              <p className="text-white/60 text-sm mb-2">Total Orders</p>
              <div className="text-white/60 text-sm">
                Avg: ${kpiData.averageOrderValue}
              </div>
            </GlowCard>
          </motion.div>

          {/* Active Sports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{kpiData.activeSports}</h3>
              <p className="text-white/60 text-sm mb-2">Active Sports</p>
              <div className="text-white/60 text-sm">
                Programs managed
              </div>
            </GlowCard>
          </motion.div>

          {/* Years with Rich Habits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{kpiData.yearsWithRichHabits}</h3>
              <p className="text-white/60 text-sm mb-2">Years Partnership</p>
              <div className="text-white/60 text-sm">
                Since {2025 - kpiData.yearsWithRichHabits}
              </div>
            </GlowCard>
          </motion.div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Customer Insights */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlowCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Customer Insights</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white font-medium">Repeat Customer Rate</p>
                    <p className="text-white/60 text-sm">Customer retention</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400">{kpiData.repeatCustomerRate}%</p>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-1000"
                        style={{ width: `${kpiData.repeatCustomerRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white font-medium">Average Order Value</p>
                    <p className="text-white/60 text-sm">Per order spending</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">${kpiData.averageOrderValue}</p>
                    <p className="text-white/60 text-sm">+12% vs last year</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white font-medium">Satisfaction Score</p>
                    <p className="text-white/60 text-sm">Customer feedback</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">{kpiData.satisfactionScore}/5</p>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map((star) => (
                        <div
                          key={star}
                          className={`w-3 h-3 rounded-full ${
                            star <= Math.floor(kpiData.satisfactionScore) 
                              ? 'bg-yellow-400' 
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* Performance Trends */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlowCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Performance Trends</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">Revenue Growth</p>
                    <span className="text-green-400 font-bold">+{kpiData.growthRate}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-1000"
                      style={{ width: `${kpiData.growthRate * 4}%` }}
                    ></div>
                  </div>
                  <p className="text-white/60 text-sm mt-2">Year over year comparison</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white">92%</p>
                    <p className="text-white/60 text-sm">Goal Achievement</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white">156</p>
                    <p className="text-white/60 text-sm">Active Customers</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}