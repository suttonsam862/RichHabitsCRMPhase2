import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrgWizardModal } from "@/components/organization-wizard/org-wizard-modal";
import { OrganizationModal } from "@/components/organization-modal";
import { GlowCard } from "@/components/ui/glow-card";
import { RBButton } from "@/components/ui/rb-button";
import { HeadMeta } from "@/components/head-meta";
import { fetchOrganizations, deleteOrganization } from "@/lib/api/organizations";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import type { Org, OrgQueryParams } from "../../../shared/schemas/organization";

// US States for dropdown (without "All States" in the array - handled separately)
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
] as const;

// State type to match backend expectations
type StateType = typeof US_STATES[number]['value'] | 'any';

export default function OrganizationsEnhanced() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<StateType>("any");
  const [orgType, setOrgType] = useState<"all" | "school" | "business">("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Build query params
  const queryParams: OrgQueryParams = {
    q: debouncedSearch || undefined,
    state: selectedState === "any" ? undefined : selectedState as any, // Use "any" for no filter
    type: orgType,
    sort: sortBy,
    order: sortOrder,
    page,
    pageSize,
  };

  // Fetch organizations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["organizations", queryParams],
    queryFn: () => fetchOrganizations(queryParams),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setSelectedOrg(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    },
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedState, orgType, sortBy, sortOrder, pageSize]);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this organization?")) {
      deleteMutation.mutate(id);
    }
  };

  const renderEmptyState = () => (
    <GlowCard className="max-w-md mx-auto">
      <div className="p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
          <Plus className="h-8 w-8 text-glow-1" />
        </div>
        <p className="text-text-soft">
          {debouncedSearch ? "No organizations match your search." : "No organizations found."}
        </p>
        {!debouncedSearch && (
          <RBButton onClick={() => setShowCreateDialog(true)}>
            Add your first organization
          </RBButton>
        )}
      </div>
    </GlowCard>
  );

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <GlowCard key={i}>
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </GlowCard>
      ))}
    </div>
  );

  const renderErrorState = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Error loading organizations. Please try again.</span>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  const renderOrganizationCard = (org: Org) => (
    <div
      key={org.id}
      className="cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => setSelectedOrg(org)}
      data-testid={`card-organization-${org.id}`}
    >
      <GlowCard>
        <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-white" data-testid={`text-org-name-${org.id}`}>
              {org.name}
            </h3>
            {org.state && (
              <p className="text-sm text-text-soft">
                {US_STATES.find(s => s.value === org.state)?.label || org.state}
              </p>
            )}
          </div>
          {org.logo_url && (
            <img
              src={org.logo_url}
              alt={`${org.name} logo`}
              className="w-12 h-12 object-contain rounded"
              data-testid={`img-logo-${org.id}`}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={org.is_business ? "default" : "secondary"}>
            {org.is_business ? "Business" : "School"}
          </Badge>
          <span className="text-xs text-text-soft">
            Created {new Date(org.created_at).toLocaleDateString()}
          </span>
        </div>
        </div>
      </GlowCard>
    </div>
  );

  return (
    <>
      <HeadMeta 
        title="Organizations - Rich Habits Custom Clothing" 
        desc="Manage your custom clothing business relationships. Create, edit, and organize your school and business partnerships."
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-glow-1 via-glow-2 to-glow-3 bg-clip-text text-transparent">
            Rich Habits Organizations
          </h1>
          <p className="text-text-soft text-lg">
            Manage your custom clothing business relationships
          </p>
        </div>

        {/* Filters */}
        <GlowCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-glow-1/50"
                data-testid="input-search-organizations"
              />
            </div>

            {/* State Filter */}
            <Select value={selectedState} onValueChange={(value) => setSelectedState(value as StateType)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-state-filter">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All States</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value} data-testid={`option-state-${state.value}`}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={orgType} onValueChange={(value: any) => setOrgType(value)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-type-all">All</SelectItem>
                <SelectItem value="school" data-testid="option-type-school">Schools</SelectItem>
                <SelectItem value="business" data-testid="option-type-business">Businesses</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at" data-testid="option-sort-created">Date Created</SelectItem>
                <SelectItem value="name" data-testid="option-sort-name">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc" data-testid="option-order-asc">Ascending</SelectItem>
                <SelectItem value="desc" data-testid="option-order-desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>

            <RBButton onClick={() => setShowCreateDialog(true)} data-testid="button-add-organization">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </RBButton>
          </div>
        </GlowCard>

        {/* Results */}
        {error ? (
          renderErrorState()
        ) : isLoading ? (
          renderLoadingState()
        ) : !data || data.items.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map(renderOrganizationCard)}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-soft">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total} organizations
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <span className="px-3 text-sm text-white">
                    Page {page} of {data.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Organization Detail Modal */}
        {selectedOrg && (
          <OrganizationModal
            organization={selectedOrg as any}
            open={!!selectedOrg}
            onClose={() => setSelectedOrg(null)}
          />
        )}

        {/* Organization Creation Wizard */}
        <OrgWizardModal
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
          }}
        />
      </div>
    </>
  );
}