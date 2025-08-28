import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Mail, User, MapPin, Calendar, Trophy, Users } from 'lucide-react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { motion } from 'framer-motion';

interface Sport {
  id: string;
  name: string;
  assigned_salesperson?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizationSportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id
  });

  // For now, we'll use mock sports data until the sports API is implemented
  const mockSports: Sport[] = [
    {
      id: '1',
      name: 'Football',
      assigned_salesperson: 'John Smith',
      contact_name: 'Coach Mike Johnson',
      contact_email: 'coach.johnson@school.edu',
      contact_phone: '(555) 123-4567',
      created_at: '2024-08-01T00:00:00Z',
      updated_at: '2024-08-15T00:00:00Z'
    },
    {
      id: '2', 
      name: 'Basketball',
      assigned_salesperson: 'Sarah Davis',
      contact_name: 'Coach Lisa Williams',
      contact_email: 'l.williams@school.edu',
      contact_phone: '(555) 234-5678',
      created_at: '2024-08-05T00:00:00Z',
      updated_at: '2024-08-20T00:00:00Z'
    },
    {
      id: '3',
      name: 'Soccer',
      contact_name: 'Coach Roberto Martinez',
      contact_email: 'r.martinez@school.edu',
      contact_phone: '(555) 345-6789',
      created_at: '2024-08-10T00:00:00Z',
      updated_at: '2024-08-25T00:00:00Z'
    }
  ];

  if (orgLoading) {
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
            <Trophy className="h-12 w-12 text-red-400 mx-auto mb-4" />
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
      <div className="max-w-6xl mx-auto">
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
                Sports & Teams
              </h1>
              <p className="text-white/60 mt-1">Manage sports programs and contacts for {organization.name}</p>
            </div>
          </div>
          
          <Button 
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/25 transition-all duration-200"
            onClick={() => navigate(`/organizations/${id}/sports/new`)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Add Sport
          </Button>
        </motion.div>

        {/* Sports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockSports.map((sport, index) => (
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                      onClick={() => navigate(`/organizations/${id}/sports/${sport.id}/edit`)}
                    >
                      Edit
                    </Button>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
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
                    
                    {sport.assigned_salesperson && (
                      <div className="flex items-center gap-3 text-white/80">
                        <Users className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm">Sales: {sport.assigned_salesperson}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added {new Date(sport.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        Updated {new Date(sport.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {mockSports.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <GlowCard className="max-w-md mx-auto p-8">
              <Trophy className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Sports Yet</h3>
              <p className="text-white/60 mb-6">
                Get started by adding sports programs for {organization.name}
              </p>
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                onClick={() => navigate(`/organizations/${id}/sports/new`)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Add Your First Sport
              </Button>
            </GlowCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}