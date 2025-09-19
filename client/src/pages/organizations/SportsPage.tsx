import { useState } from "react";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, Mail, User, Calendar, Trophy, Edit, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useToast } from '@/hooks/use-toast';
import EditSportModal from "./EditSportModal";

interface Sport {
  id: string;
  name: string;
  team_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizationSportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSport, setEditingSport] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id
  });

  // Fetch sports data from API
  const { data: sportsData } = useQuery({
    queryKey: ['organizations', id, 'sports'],
    queryFn: () => api.get(`/api/v1/organizations/${id}/sports`),
    enabled: !!id && org?.success
  });

  const sports: Sport[] = sportsData?.data || [];

  // Delete sport mutation
  const deleteSportMutation = useMutation({
    mutationFn: async (sportId: string) => {
      return api.delete(`/api/v1/organizations/${id}/sports/${sportId}`);
    },
    onSuccess: (_data, sportId) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'sports'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      const sportName = sports.find(s => s.id === sportId)?.name || 'Sport';
      toast({
        title: "Sport removed",
        description: `${sportName} has been removed from ${org?.data?.name}`,
      });
    },
    onError: (error: any, sportId) => {
      const sportName = sports.find(s => s.id === sportId)?.name || 'Sport';
      const message = error?.response?.data?.error || error?.message || "Failed to remove sport";
      toast({
        title: "Failed to remove sport",
        description: `Could not remove ${sportName}: ${message}`,
        variant: "destructive",
      });
    },
  });

  // Note: EditSportModal handles its own mutation internally

  const handleDeleteSport = (sport: Sport) => {
    if (window.confirm(`Are you sure you want to remove ${sport.name} from ${org?.data?.name}?`)) {
      deleteSportMutation.mutate(sport.id);
    }
  };

  if (orgLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="mt-2 text-white/60">Loading organization...</p>
        </div>
      </AppLayout>
    );
  }

  if (!org?.success) {
    return (
      <AppLayout>
        <GlowCard className="text-center py-12">
          <Trophy className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-white">Organization Not Found</h2>
          <p className="text-white/60 mb-6">The organization you're looking for doesn't exist.</p>
          <Link to="/organizations">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </Link>
        </GlowCard>
      </AppLayout>
    );
  }

  const organization = org.data;

  const headerActions = (
    <Button 
      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/25 transition-all duration-200"
      onClick={() => navigate(`/organizations/${id}/sports/new`)}
      data-testid="button-add-sport"
    >
      <Trophy className="h-4 w-4 mr-2" />
      Add Sport
    </Button>
  );

  return (
    <AppLayout 
      title="Sports & Teams"
      subtitle={`Manage sports programs and contacts for ${organization.name}`}
      showBackButton={true}
      backHref={`/organizations/${id}`}
      headerActions={headerActions}
    >
      {/* Render the EditSportModal */}
      {isEditModalOpen && editingSport && (
        <EditSportModal 
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSport(null);
          }}
          sport={editingSport}
          organizationId={id!}
        />
      )}

      {/* Sports Grid */}
      {sports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Trophy className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white/60 mb-2">No Sports Assigned</h3>
          <p className="text-white/40 mb-6">No sports have been assigned to this organization yet.</p>
          <Button 
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            onClick={() => navigate(`/organizations/${id}/sports/new`)}
            data-testid="button-add-first-sport"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Add First Sport
          </Button>
        </motion.div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sports.map((sport, index) => (
            <motion.div
              key={sport.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <GlowCard className="hover:scale-105 transition-transform duration-200 cursor-pointer">
                <div className="p-6">
                  {/* Sport Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{sport.name}</h3>
                        <p className="text-white/60 text-sm">Active Sport</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          Active
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSport(sport);
                              setIsEditModalOpen(true);
                            }}
                            className="border-white/20 text-white hover:bg-white/10"
                            data-testid={`button-edit-sport-${sport.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSport(sport)}
                            disabled={deleteSportMutation.isPending}
                            className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                            data-testid={`button-delete-sport-${sport.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-white/80">
                      <Trophy className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-medium">Team: {sport.team_name || 'Main Team'}</span>
                    </div>

                    {sport.contact_name && (
                      <div className="flex items-center gap-3 text-white/80">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm">{sport.contact_name}</span>
                      </div>
                    )}

                    {sport.contact_email && (
                      <div className="flex items-center gap-3 text-white/80">
                        <Mail className="h-4 w-4 text-cyan-400" />
                        <a 
                          href={`mailto:${sport.contact_email}`}
                          className="text-sm hover:text-cyan-400 transition-colors"
                        >
                          {sport.contact_email}
                        </a>
                      </div>
                    )}

                    {sport.contact_phone && (
                      <div className="flex items-center gap-3 text-white/80">
                        <Phone className="h-4 w-4 text-cyan-400" />
                        <a 
                          href={`tel:${sport.contact_phone}`}
                          className="text-sm hover:text-cyan-400 transition-colors"
                        >
                          {sport.contact_phone}
                        </a>
                      </div>
                    )}

                    {/* Removed assigned_salesperson field */}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added {sport.created_at ? new Date(sport.created_at).toLocaleDateString() : 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1">
                        Updated {sport.updated_at ? new Date(sport.updated_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
      </div>
      )}
    </AppLayout>
  );
}