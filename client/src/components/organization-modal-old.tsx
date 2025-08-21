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
import { getOrganization, deleteOrganization, formatDateSafe, type Organization } from "@/lib/api/organizations";
import { EditOrganizationForm } from "@/components/edit-organization-form";
import { SportsTab } from "@/components/sports-tab";
import { OrdersTab } from "@/components/orders-tab";

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
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
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
          <DialogHeader className="sr-only">
            <DialogTitle>Loading Organization</DialogTitle>
            <DialogDescription id="org-modal-loading-desc">
              Loading organization details and management interface
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 text-center">
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
      <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-4xl max-h-[90vh] overflow-hidden border-0 shadow-2xl" aria-describedby="org-modal-desc">
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
                organization={organization}
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
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {organization.logoUrl ? (
                    <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                      <AvatarImage 
                        src={organization.logoUrl} 
                        alt={`${organization.name} logo`}
                        data-testid="img-modal-organization-logo"
                      />
                      <AvatarFallback className="text-lg font-bold">
                        {organization.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-lg font-bold">
                        {organization.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="space-y-2">
                    <DialogTitle 
                      className="text-2xl font-bold"
                      data-testid="text-modal-organization-name"
                    >
                      {organization.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span data-testid="text-modal-organization-state">
                        {organization.state || 'No state'}
                      </span>
                      {organization.universalDiscounts && (
                        <Badge variant="secondary">
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
                    className="bg-background/80 hover:bg-background/90 backdrop-blur-sm border-border/50"
                    data-testid="button-edit-organization"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteOrgMutation.isPending}
                    className="bg-background/80 hover:bg-background/90 backdrop-blur-sm border-border/50 text-destructive hover:text-destructive hover:border-destructive/50"
                    data-testid="button-delete-organization"
                  >
                    {deleteOrgMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    data-testid="button-close-modal"
                    className="hover:bg-muted/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 max-h-[75vh] overflow-y-auto p-6 pt-4">
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm">
                  <TabsTrigger value="general" data-testid="tab-general" className="data-[state=active]:bg-background/60">
                    <Building2 className="h-4 w-4 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="sports" data-testid="tab-sports" className="data-[state=active]:bg-background/60">
                    <Users className="h-4 w-4 mr-2" />
                    Sports
                  </TabsTrigger>
                  <TabsTrigger value="discounts" data-testid="tab-discounts" className="data-[state=active]:bg-background/60">
                    <Settings className="h-4 w-4 mr-2" />
                    Discounts
                  </TabsTrigger>
                  {/* Orders tab disabled until /api/organizations/:id/orders endpoint is implemented
                  <TabsTrigger value="orders" data-testid="tab-orders">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Orders
                  </TabsTrigger>
                  */}
                  <TabsTrigger value="other" data-testid="tab-other" className="data-[state=active]:bg-background/60">
                    <FileText className="h-4 w-4 mr-2" />
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <Card className="bg-muted/30 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentOrg.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">Address</p>
                              <p 
                                className="text-muted-foreground"
                                data-testid="text-organization-address"
                              >
                                {currentOrg.address}
                              </p>
                            </div>
                          </div>
                        )}

                        {currentOrg.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Phone</p>
                              <p 
                                className="text-muted-foreground"
                                data-testid="text-organization-phone"
                              >
                                {currentOrg.phone}
                              </p>
                            </div>
                          </div>
                        )}

                        {currentOrg.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Email</p>
                              <p 
                                className="text-muted-foreground"
                                data-testid="text-organization-email"
                              >
                                {currentOrg.email}
                              </p>
                            </div>
                          </div>
                        )}

                        {(currentOrg.logoUrl || currentOrg.logo_url) && (
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Logo URL</p>
                              <p 
                                className="text-muted-foreground text-xs truncate max-w-[200px]"
                                data-testid="text-organization-logo-url"
                              >
                                {currentOrg.logoUrl || currentOrg.logo_url}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Type</p>
                            <p className="text-muted-foreground">
                              {currentOrg.is_business ? 'Business' : 'School/Organization'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Status</p>
                            <Badge variant="secondary" className="glass">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Created: {new Date(currentOrg.created_at || currentOrg.createdAt).toLocaleDateString()}</p>
                        {currentOrg.updated_at && (
                          <p>Updated: {new Date(currentOrg.updated_at).toLocaleDateString()}</p>
                        )}
                        <p>Organization ID: <span className="font-mono text-xs">{currentOrg.id}</span></p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sports" className="space-y-4">
                  <SportsTab organizationId={currentOrg.id} sports={currentOrg.sports || []} />
                </TabsContent>

                <TabsContent value="discounts" className="space-y-4">
                  <Card className="bg-muted/30 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle>Universal Discounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {discountInfo ? (
                        <div className="space-y-4">
                          {discountInfo.percentage && (
                            <div>
                              <p className="font-medium">Discount Percentage</p>
                              <p className="text-2xl font-bold text-primary">
                                {discountInfo.percentage}%
                              </p>
                            </div>
                          )}

                          {discountInfo.minOrder && (
                            <div>
                              <p className="font-medium">Minimum Order</p>
                              <p className="text-muted-foreground">
                                ${discountInfo.minOrder}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No universal discounts configured.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Orders tab content disabled until /api/organizations/:id/orders endpoint is implemented
                <TabsContent value="orders" className="space-y-4">
                  <OrdersTab 
                    organizationId={currentOrg.id} 
                    orders={currentOrg.orders || []} 
                  />
                </TabsContent>
                */}

                <TabsContent value="other" className="space-y-4">
                  <Card className="bg-muted/30 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle>Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentOrg.notes ? (
                        <div>
                          <p className="font-medium mb-2">Notes</p>
                          <p 
                            className="text-muted-foreground whitespace-pre-wrap"
                            data-testid="text-organization-notes"
                          >
                            {currentOrg.notes}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No additional notes available.
                        </p>
                      )}
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