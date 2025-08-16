

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OrganizationCard } from "@/components/organization-card";
import { OrganizationModal } from "@/components/organization-modal";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { PageShell } from "@/components/ui/page-shell";
import { GlowCard } from "@/components/ui/glow-card";
import { RBButton } from "@/components/ui/rb-button";
import { HeadMeta } from "@/components/head-meta";
import type { OrganizationWithSports } from "../../../shared/supabase-schema";

export default function Organizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithSports | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: organizations = [], isLoading, error } = useQuery<OrganizationWithSports[]>({
    queryKey: ["/api/organizations"],
    select: (data) => data || [],
  });

  // Group organizations by state
  const organizationsByState = organizations.reduce((acc, org) => {
    if (!acc[org.state]) {
      acc[org.state] = [];
    }
    acc[org.state].push(org);
    return acc;
  }, {} as Record<string, OrganizationWithSports[]>);

  // Filter organizations based on search term
  const filteredOrganizationsByState = Object.keys(organizationsByState).reduce((acc, state) => {
    const filtered = organizationsByState[state].filter((org) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        org.name.toLowerCase().includes(searchLower) ||
        org.state.toLowerCase().includes(searchLower) ||
        org.sports.some(sport => sport.name.toLowerCase().includes(searchLower))
      );
    });

    if (filtered.length > 0) {
      acc[state] = filtered;
    }
    return acc;
  }, {} as Record<string, OrganizationWithSports[]>);

  const getGradientVariant = (index: number) => {
    const variants = ['default', 'blue', 'green', 'orange'] as const;
    return variants[index % variants.length];
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <PageShell>
          <GlowCard>
            <div className="p-8 text-center">
              <p className="text-red-400">Error loading organizations. Please try again.</p>
            </div>
          </GlowCard>
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeadMeta title="Organizations" desc="Manage organizations and sports programs" />
      <PageShell>
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-glow-1 via-glow-2 to-glow-3 bg-clip-text text-transparent">
            Rich Habits Organizations
          </h1>
          <p className="text-text-soft text-lg">
            Manage your custom clothing business relationships
          </p>
        </div>

        {/* Search and Actions */}
        <GlowCard className="max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
              <Input
                placeholder="Search organizations, states, or sports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-glow-1/50"
                data-testid="input-search-organizations"
              />
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <RBButton className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </RBButton>
              </DialogTrigger>
              <DialogContent className="bg-gray-900/95 border-white/20 backdrop-blur-xl max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Organization</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <CreateOrganizationForm onSuccess={() => setShowCreateDialog(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </GlowCard>

        {/* Organizations by State */}
        {isLoading ? (
          <GlowCard className="max-w-md mx-auto">
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-glow-1 mx-auto mb-4"></div>
              <p className="text-text-soft">Loading organizations...</p>
            </div>
          </GlowCard>
        ) : Object.keys(filteredOrganizationsByState).length === 0 ? (
          <GlowCard className="max-w-md mx-auto">
            <div className="p-8 text-center">
              <p className="text-text-soft">
                {searchTerm ? "No organizations match your search." : "No organizations found."}
              </p>
            </div>
          </GlowCard>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredOrganizationsByState)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([state, orgs]) => (
              <div key={state} className="space-y-6">
                <h2 
                  className="text-3xl font-semibold text-white/90 text-center"
                  data-testid={`text-state-${state.toLowerCase().replace(' ', '-')}`}
                >
                  {state}
                  <span className="text-sm text-text-soft ml-3 font-normal">
                    ({orgs.length} organization{orgs.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-6 justify-center scrollbar-hide" style={{ minWidth: 'min-content' }}>
                    {orgs.map((org, index) => (
                      <OrganizationCard
                        key={org.id}
                        organization={org}
                        onClick={() => setSelectedOrg(org)}
                        gradientVariant={getGradientVariant(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Organization Detail Modal */}
        {selectedOrg && (
          <OrganizationModal
            organization={selectedOrg}
            open={!!selectedOrg}
            onClose={() => setSelectedOrg(null)}
          />
        )}
      </PageShell>
    </div>
  );
}

