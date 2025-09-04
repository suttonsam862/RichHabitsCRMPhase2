import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Settings, Building2, Trash2, Trophy, Users, MapPin, Phone, Mail, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { gradientFrom } from '@/features/organizations/gradient';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function OrganizationViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/v1/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Organization deleted",
        description: "The organization has been successfully deleted.",
      });
      navigate('/organizations');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (!org?.data?.name) return;
    if (!confirm(`Are you sure you want to delete "${org.data.name}"? This action cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-2 text-white/60">Loading organization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !org?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <GlowCard className="text-center py-12">
            <Building2 className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-white/60 mb-6">The organization you're looking for doesn't exist or you don't have permission to view it.</p>
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
  const gradient = gradientFrom(organization.brandPrimary, organization.brandSecondary);
  const needsSetup = organization.setupComplete === false || organization.setupComplete === null;

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
            <Link to="/organizations">
              <Button variant="ghost" size="sm" className="text-white hover:text-cyan-400 transition-all duration-200 hover:scale-105">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              {/* Logo Display */}
              {(organization.logoUrl || organization.logo_url) && (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-cyan-500/30 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10" />
                  <img 
                    src={(() => {
                      const logoUrl = organization.logoUrl || organization.logo_url;
                      if (!logoUrl) return '';
                      if (logoUrl.startsWith('http')) return logoUrl;
                      if (logoUrl.startsWith('org/') || logoUrl.startsWith('app/')) {
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                        return `${supabaseUrl}/storage/v1/object/public/app/${logoUrl}`;
                      }
                      return `/api/v1/organizations/${organization.id}/logo`;
                    })()}
                    alt={`${organization.name} logo`}
                    className="relative z-10 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-2xl font-bold text-white';
                      fallback.textContent = organization.name.charAt(0);
                      e.currentTarget.parentElement?.appendChild(fallback);
                    }}
                  />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {organization.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${organization.isBusiness ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                    {organization.isBusiness ? 'Business' : 'Organization'}
                  </span>
                  {needsSetup && (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm rounded-full border border-yellow-500/30 animate-pulse">
                      Setup Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {needsSetup && (
              <Link to={`/organizations/${id}/setup`}>
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25 transition-all duration-200 hover:scale-105">
                  <Settings className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              </Link>
            )}
            <Link to={`/organizations/${id}/sports`}>
              <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:scale-105 transition-all duration-200">
                <Trophy className="h-4 w-4 mr-2" />
                Sports
              </Button>
            </Link>
            <Link to={`/organizations/${id}/kpis`}>
              <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:scale-105 transition-all duration-200">
                <BarChart3 className="h-4 w-4 mr-2" />
                KPIs
              </Button>
            </Link>
            <Link to={`/organizations/${id}/edit`}>
              <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:scale-105 transition-all duration-200">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:scale-105 transition-all duration-200"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-organization"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </motion.div>

        {/* Modern Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Users className="h-8 w-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{organization.sports?.length || 0}</h3>
              <p className="text-white/60 text-sm">Active Sports</p>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Contact Sales</h3>
              <p className="text-white/60 text-sm">Revenue Dashboard</p>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlowCard className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{organization.createdAt ? Math.floor((Date.now() - new Date(organization.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0}</h3>
              <p className="text-white/60 text-sm">Years Active</p>
            </GlowCard>
          </motion.div>
        </div>

        {/* Organization Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Contact & Basic Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlowCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Organization Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-medium">{organization.name}</p>
                    <p className="text-white/60 text-sm">{organization.isBusiness ? 'Business Organization' : 'Educational Organization'}</p>
                  </div>
                </div>

                {organization.email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <Mail className="h-5 w-5 text-cyan-400" />
                    <div>
                      <a href={`mailto:${organization.email}`} className="text-white hover:text-cyan-400 transition-colors">
                        {organization.email}
                      </a>
                      <p className="text-white/60 text-sm">Primary Contact</p>
                    </div>
                  </div>
                )}

                {organization.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <Phone className="h-5 w-5 text-cyan-400" />
                    <div>
                      <a href={`tel:${organization.phone}`} className="text-white hover:text-cyan-400 transition-colors">
                        {organization.phone}
                      </a>
                      <p className="text-white/60 text-sm">Phone Number</p>
                    </div>
                  </div>
                )}

                {organization.address && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <MapPin className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-white">{organization.address}</p>
                      <p className="text-white/60 text-sm">Address</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    organization.isArchived 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {organization.isArchived ? 'Archived' : 'Active'}
                  </span>
                  
                  {organization.tags && organization.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {organization.tags.slice(0, 2).map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md text-xs border border-purple-500/30">
                          {tag}
                        </span>
                      ))}
                      {organization.tags.length > 2 && (
                        <span className="px-2 py-1 bg-white/10 text-white/60 rounded-md text-xs">
                          +{organization.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* Branding & Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlowCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Branding & Timeline</h3>
              </div>

              <div className="space-y-6">
                {/* Brand Colors */}
                <div>
                  <h4 className="text-white/80 font-medium mb-3">Brand Colors</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg border-2 border-white/20 shadow-lg" 
                          style={{ backgroundColor: organization.brandPrimary }}
                        ></div>
                        <div>
                          <p className="text-white/60 text-xs">Primary</p>
                          <p className="text-white font-mono text-sm">{organization.brandPrimary}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg border-2 border-white/20 shadow-lg" 
                          style={{ backgroundColor: organization.brandSecondary }}
                        ></div>
                        <div>
                          <p className="text-white/60 text-xs">Secondary</p>
                          <p className="text-white font-mono text-sm">{organization.brandSecondary}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Setup Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-white font-medium">Setup Status</p>
                      <p className="text-white/60 text-sm">Organization configuration</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    needsSetup 
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {needsSetup ? 'Setup Required' : 'Complete'}
                  </span>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-white/80 font-medium mb-3">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Calendar className="h-4 w-4 text-green-400" />
                      <div>
                        <p className="text-white text-sm">Created</p>
                        <p className="text-white/60 text-xs">
                          {new Date(organization.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-white text-sm">Last Updated</p>
                        <p className="text-white/60 text-xs">
                          {new Date(organization.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
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