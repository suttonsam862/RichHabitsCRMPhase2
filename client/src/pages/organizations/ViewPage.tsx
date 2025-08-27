import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Settings, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { gradientFrom } from '@/features/organizations/gradient';

export default function OrganizationViewPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id
  });

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/organizations">
              <Button variant="ghost" size="sm" className="text-white hover:text-cyan-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {organization.name}
            </h1>
            {needsSetup && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm rounded-md border border-yellow-500/30 animate-pulse">
                Setup Required
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {needsSetup && (
              <Link to={`/organizations/${id}/setup`}>
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  <Settings className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              </Link>
            )}
            <Link to={`/organizations/${id}/edit`}>
              <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Organization Header with Gradient */}
        <GlowCard className="p-0 overflow-hidden mb-6">
          <div className="h-32 relative" style={{ background: gradient }}>
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute bottom-4 left-6 flex items-end gap-4">
              <div className="h-16 w-16 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center border-2 border-white/20">
                {organization.logoUrl ? (
                  <img 
                    src={`/storage/app/${organization.logoUrl}`} 
                    alt={`${organization.name} logo`} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-white/50" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{organization.name}</h2>
                <p className="text-white/80">{organization.isBusiness ? 'Business' : 'Organization'}</p>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Organization Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <GlowCard>
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60">Organization Name</label>
                <p className="text-white">{organization.name}</p>
              </div>
              <div>
                <label className="text-sm text-white/60">Type</label>
                <p className="text-white">{organization.isBusiness ? 'Business' : 'Organization'}</p>
              </div>
              <div>
                <label className="text-sm text-white/60">Status</label>
                <span className={`inline-block px-2 py-1 rounded-md text-xs ${
                  organization.isArchived 
                    ? 'bg-red-500/20 text-red-300' 
                    : 'bg-green-500/20 text-green-300'
                }`}>
                  {organization.isArchived ? 'Archived' : 'Active'}
                </span>
              </div>
              {organization.tags && organization.tags.length > 0 && (
                <div>
                  <label className="text-sm text-white/60">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {organization.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlowCard>

          {/* Branding */}
          <GlowCard>
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Branding</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60">Primary Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-6 h-6 rounded border border-white/20" 
                    style={{ backgroundColor: organization.brandPrimary }}
                  ></div>
                  <span className="font-mono text-sm">{organization.brandPrimary}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60">Secondary Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-6 h-6 rounded border border-white/20" 
                    style={{ backgroundColor: organization.brandSecondary }}
                  ></div>
                  <span className="font-mono text-sm">{organization.brandSecondary}</span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Setup Information */}
          {(organization.financeEmail || needsSetup) && (
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">Setup & Finance</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/60">Setup Status</label>
                  <p className={`${needsSetup ? 'text-yellow-300' : 'text-green-300'}`}>
                    {needsSetup ? 'Setup Required' : 'Setup Complete'}
                  </p>
                </div>
                {organization.financeEmail && (
                  <div>
                    <label className="text-sm text-white/60">Finance Email</label>
                    <p className="text-white">{organization.financeEmail}</p>
                  </div>
                )}
                {organization.setupCompletedAt && (
                  <div>
                    <label className="text-sm text-white/60">Setup Completed</label>
                    <p className="text-white text-sm">
                      {new Date(organization.setupCompletedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </GlowCard>
          )}

          {/* Timestamps */}
          <GlowCard>
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Timeline</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60">Created</label>
                <p className="text-white text-sm">
                  {new Date(organization.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-white/60">Last Updated</label>
                <p className="text-white text-sm">
                  {new Date(organization.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}