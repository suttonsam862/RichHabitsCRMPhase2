import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  ShoppingBag, 
  FileText,
  Settings,
  X,
  Edit,
  Trash,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getOrganization, deleteOrganization } from "@/lib/api-sdk";
import type { OrganizationDTO as Organization } from "@shared/dtos/OrganizationDTO";

// Helper to format dates safely
function formatDateSafe(dateString?: string | null): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    }).format(date);
  } catch {
    return '—';
  }
}
import { EditOrganizationForm } from "@/components/edit-organization-form";
import { SportsTab } from "@/components/sports-tab";

interface OrganizationModalProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}

export function OrganizationModal({ organizationId, open, onClose }: OrganizationModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organization details using new API
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: () => getOrganization(organizationId),
    enabled: open && !!organizationId,
    staleTime: 0, // Always fetch fresh data
  });

  const deleteOrgMutation = useMutation({
    mutationFn: () => deleteOrganization(organizationId),
    onSuccess: () => {
      // Invalidate organization queries and close modal
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId] });
      onClose();
      toast({
        title: "Organization deleted",
        description: "The organization has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Delete failed:", error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete organization');
      toast({
        variant: "destructive",
        title: "Delete failed", 
        description: "Could not delete organization. Please try again.",
      });
    },
  });

  const handleDelete = async () => {
    if (!organization) return;
    
    if (confirm(`Are you sure you want to delete ${organization.name}? This action cannot be undone.`)) {
      try {
        await deleteOrgMutation.mutateAsync();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-4xl max-h-[90vh] overflow-hidden border-0 shadow-2xl" aria-describedby="org-modal-loading-desc">
          <DialogHeader>
            <DialogTitle>Loading Organization</DialogTitle>
            <DialogDescription id="org-modal-loading-desc">
              Loading organization details and management interface
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading organization details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle error and missing organization states
  if (error) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-md" aria-describedby="org-modal-error-desc">
          <DialogHeader>
            <DialogTitle>Error Loading Organization</DialogTitle>
            <DialogDescription id="org-modal-error-desc">
              Failed to load organization details
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!organization) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-md" aria-describedby="org-modal-notfound-desc">
          <DialogHeader>
            <DialogTitle>Organization Not Found</DialogTitle>
            <DialogDescription id="org-modal-notfound-desc">
              The requested organization could not be found
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-background border max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" aria-describedby="org-modal-desc">
        <DialogDescription id="org-modal-desc" className="sr-only">
          {editMode ? "Edit organization details and settings" : "View organization details and management interface"}
        </DialogDescription>
        {editMode ? (
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-border/50">
              <DialogTitle className="flex items-center justify-between">
                Edit Organization
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  data-testid="button-cancel-edit"
                  className="hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <EditOrganizationForm 
                organization={organization as any}
                onSuccess={() => {
                  setEditMode(false);
                  // Refresh the data after successful update
                  queryClient.invalidateQueries({ queryKey: ['organizations', organizationId] });
                  toast({
                    title: "Organization updated",
                    description: "Changes have been saved successfully.",
                  });
                }}
                onCancel={() => setEditMode(false)}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-0 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {organization.logoUrl ? (
                    <Avatar className="w-16 h-16 ring-2 ring-primary/20 bg-muted">
                      <AvatarImage 
                        src={organization.logoUrl} 
                        alt={`${organization.name} logo`}
                        data-testid="img-modal-organization-logo"
                      />
                      <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                        {organization.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-16 h-16 bg-primary">
                      <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                        {organization.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="space-y-2">
                    <DialogTitle 
                      className="text-2xl font-bold text-foreground"
                      data-testid="text-modal-organization-name"
                    >
                      {organization.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-foreground/70">
                      <MapPin className="h-4 w-4" />
                      <span data-testid="text-modal-organization-state" className="font-medium">
                        {organization.state || 'No state'}
                      </span>
                      {organization.universalDiscounts && (
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          Universal Discounts Available
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    data-testid="button-edit-organization"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteOrgMutation.isPending}
                    className="text-destructive hover:text-destructive hover:border-destructive"
                    data-testid="button-delete-organization"
                  >
                    {deleteOrgMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    data-testid="button-close-modal"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Display delete error if exists */}
              {deleteError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </DialogHeader>

            <div className="flex-1 max-h-[75vh] overflow-y-auto p-6 pt-4">
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="general" data-testid="tab-general" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                    <Building2 className="h-4 w-4 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="sports" data-testid="tab-sports" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    Sports
                  </TabsTrigger>
                  <TabsTrigger value="other" data-testid="tab-other" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Organization Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-sm text-foreground/70">Organization Name</p>
                          <p className="font-semibold text-foreground" data-testid="text-org-name">{organization.name}</p>
                        </div>
                        
                        {organization.isBusiness !== undefined && (
                          <div>
                            <p className="font-medium text-sm text-foreground/70">Type</p>
                            <p className="font-semibold text-foreground" data-testid="text-org-type">{organization.isBusiness ? 'Business' : 'School'}</p>
                          </div>
                        )}

                        {organization.status && (
                          <div>
                            <p className="font-medium text-sm text-foreground/70">Status</p>
                            <Badge variant="default" className="bg-primary text-primary-foreground" data-testid="badge-org-status">{organization.status}</Badge>
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-sm text-foreground/70">Created</p>
                          <p className="font-semibold text-foreground" data-testid="text-org-created">{formatDateSafe(organization.createdAt)}</p>
                        </div>

                        {organization.updatedAt && (
                          <div>
                            <p className="font-medium text-sm text-foreground/70">Last Updated</p>
                            <p className="font-semibold text-foreground" data-testid="text-org-updated">{formatDateSafe(organization.updatedAt)}</p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {organization.email && (
                          <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-foreground/70">Email</p>
                              <p className="text-foreground font-semibold" data-testid="text-org-email">
                                {organization.email}
                              </p>
                            </div>
                          </div>
                        )}

                        {organization.phone && (
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-foreground/70">Phone</p>
                              <p className="text-foreground font-semibold" data-testid="text-org-phone">
                                {organization.phone}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {(organization.addressLine1 || organization.city || organization.state || organization.postalCode) && (
                        <>
                          <Separator />
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-foreground/70">Address</p>
                              <div className="text-foreground font-semibold" data-testid="text-org-address">
                                {organization.addressLine1 && <p>{organization.addressLine1}</p>}
                                {(organization.city || organization.state || organization.postalCode) && (
                                  <p>
                                    {[organization.city, organization.state, organization.postalCode]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {organization.logoUrl && (
                        <>
                          <Separator />
                          <div>
                            <p className="font-medium text-sm text-foreground/70 mb-2">Logo URL</p>
                            <p className="text-foreground text-xs break-all font-mono bg-muted p-2 rounded" data-testid="text-org-logo-url">
                              {organization.logoUrl}
                            </p>
                          </div>
                        </>
                      )}

                      {organization.titleCardUrl && (
                        <>
                          <Separator />
                          <div>
                            <p className="font-medium text-sm text-foreground/70 mb-2">Title Card Background</p>
                            <p className="text-foreground text-xs break-all font-mono bg-muted p-2 rounded" data-testid="text-org-titlecard-url">
                              {organization.titleCardUrl}
                            </p>
                            {organization.titleCardUrl && (
                              <div className="mt-2 p-4 rounded-lg bg-muted/50" 
                                   style={{ 
                                     backgroundImage: `url(${organization.titleCardUrl})`,
                                     backgroundSize: 'cover',
                                     backgroundPosition: 'center',
                                     minHeight: '120px'
                                   }}
                                   data-testid="img-org-titlecard-preview"
                              />
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sports" className="space-y-4">
                  <SportsTab organizationId={organizationId} sports={[]} />
                </TabsContent>

                <TabsContent value="other" className="space-y-4">
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Additional Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-sm text-foreground/70">Universal Discounts</p>
                          <Badge 
                            variant={organization.universalDiscounts ? "default" : "secondary"} 
                            className={organization.universalDiscounts ? "bg-primary text-primary-foreground" : ""}
                            data-testid="text-org-discounts"
                          >
                            {organization.universalDiscounts ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}