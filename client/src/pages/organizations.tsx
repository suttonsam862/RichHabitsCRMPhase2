import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OrganizationCard } from "@/components/organization-card";
import { OrganizationModal } from "@/components/organization-modal";
import { CreateOrganizationForm } from "@/components/create-organization-form";
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

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error loading organizations. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Rich Habits Organizations
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your custom clothing business relationships
        </p>
      </div>

      {/* Search and Actions */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search organizations, states, or sports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
                data-testid="input-search-organizations"
              />
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  className="whitespace-nowrap"
                  data-testid="button-create-organization"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <CreateOrganizationForm onSuccess={() => setShowCreateDialog(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Organizations by State */}
      {isLoading ? (
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading organizations...</p>
          </CardContent>
        </Card>
      ) : Object.keys(filteredOrganizationsByState).length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "No organizations match your search." : "No organizations found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(filteredOrganizationsByState)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([state, orgs]) => (
            <div key={state} className="space-y-4">
              <h2 
                className="text-2xl font-semibold text-foreground/90"
                data-testid={`text-state-${state.toLowerCase().replace(' ', '-')}`}
              >
                {state}
                <span className="text-sm text-muted-foreground ml-2">
                  ({orgs.length} organization{orgs.length !== 1 ? 's' : ''})
                </span>
              </h2>
              
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 scrollbar-hide" style={{ minWidth: 'min-content' }}>
                  {orgs.map((org) => (
                    <OrganizationCard
                      key={org.id}
                      organization={org}
                      onClick={() => setSelectedOrg(org)}
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
    </div>
  );
}