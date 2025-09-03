import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import GlowCard from '@/components/ui/GlowCard';
import { EditOrganizationForm } from '@/components/edit-organization-form';

export default function OrganizationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiRequest(`/v1/organizations/${id}`),
    enabled: !!id
  });

  const handleSuccess = () => {
    navigate(`/organizations/${id}`);
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
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-white/60 mb-6">The organization you're trying to edit doesn't exist or you don't have permission to edit it.</p>
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={`/organizations/${id}`}>
              <Button variant="ghost" size="sm" className="text-white hover:text-cyan-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to View
              </Button>
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Edit {organization.name}
            </h1>
          </div>
        </div>

        {/* Edit Form */}
        <GlowCard className="p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Save className="h-5 w-5 text-cyan-400" />
            Organization Details
          </h2>
          
          <EditOrganizationForm 
            organization={organization} 
            onSuccess={handleSuccess}
            onCancel={() => navigate(`/organizations/${id}`)}
          />
        </GlowCard>
      </div>
    </div>
  );
}