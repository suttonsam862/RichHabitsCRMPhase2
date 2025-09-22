import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Images,
  FileText,
  Settings,
  X,
  Edit,
  Trash,
  AlertCircle,
  Loader2,
  Upload,
  Download,
  Eye,
  Calendar,
  Hash,
  Globe,
  User,
  Shield,
  Star,
  Trash2 // Import Trash2 icon
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLogoDisplayUrl } from "@/lib/logoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for the summary data
interface OrganizationSummary {
  organization: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    state?: string;
    city?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    website?: string;
    logoUrl?: string;
    titleCardUrl?: string;
    brandPrimary?: string;
    brandSecondary?: string;
    colorPalette?: string[];
    isBusiness?: boolean;
    status?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  brandingFiles: Array<{
    name: string;
    size?: number;
    url: string;
    uploadedAt?: string;
  }>;
  sports: Array<{
    id: string;
    sportId: string;
    sportName: string;
    teamName?: string;
    sportEmoji?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactUserId?: string;
    contactUserFullName?: string;
    contactUserEmail?: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    isActive: boolean;
    lastLogin?: string;
    roles: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
    }>;
  }>;
  stats: {
    sportsCount: number;
    usersCount: number;
    brandingFilesCount: number;
    activeUsersCount: number;
  };
}

// Helper to format dates safely
function formatDateSafe(dateString?: string | null): string {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '—';
  }
}

// Helper to format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

interface OrgQuickViewDialogProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}

export function OrgQuickViewDialog({ organizationId, open, onClose }: OrgQuickViewDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organization summary using new endpoint
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['organizations', organizationId, 'summary'],
    queryFn: () => apiRequest(`/api/v1/organizations/${organizationId}/summary`),
    enabled: open && !!organizationId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const deleteOrgMutation = useMutation({
    mutationFn: () => apiRequest(`/api/v1/organizations/${organizationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      onClose();
      toast({
        title: "Organization deleted",
        description: "The organization has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Delete failed:", error);
      // Check if the error is a string or an object with a message property
      let errorMessage = 'Failed to delete organization';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      setDeleteError(errorMessage);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: `Could not delete organization: ${errorMessage}. Please try again.`,
      });
    },
  });

  const handleDelete = async () => {
    if (!summary?.organization) return;

    if (confirm(`Are you sure you want to delete ${summary.organization.name}? This action cannot be undone.`)) {
      try {
        await deleteOrgMutation.mutateAsync();
      } catch (error) {
        // The onError handler in useMutation will catch this, but we can log here too for safety.
        console.error('Error during deleteOrgMutation.mutateAsync:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh]" aria-describedby="org-dialog-loading-desc">
          <DialogHeader>
            <DialogTitle>Loading Organization...</DialogTitle>
            <DialogDescription id="org-dialog-loading-desc">
              Please wait while we fetch the organization details
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !summary) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md" aria-describedby="org-dialog-error-desc">
          <DialogHeader>
            <DialogTitle>Organization Not Found</DialogTitle>
            <DialogDescription id="org-dialog-error-desc">
              The requested organization could not be found or loaded
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center">
            <Button onClick={onClose} data-testid="button-close-error">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const organization = summary?.organization ?? {};
  const stats = summary?.stats ?? {};
  const brandingFiles = summary?.brandingFiles ?? [];
  const sports = summary?.sports ?? [];
  const users = summary?.users ?? [];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogDescription className="sr-only">
          {editMode ? "Edit organization details and settings" : "View comprehensive organization details, branding, sports, and users"}
        </DialogDescription>

        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {organization.logoUrl ? (
                <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                  <AvatarImage
                    src={getLogoDisplayUrl(organization.logoUrl) || `/api/v1/organizations/${organization.id}/logo`}
                    alt={`${organization.name} logo`}
                    data-testid="img-org-logo"
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
                <DialogTitle className="text-2xl font-bold" data-testid="text-org-name">
                  {organization.name}
                </DialogTitle>
                <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                  {organization.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span data-testid="text-org-location">{organization.city ? `${organization.city}, ` : ''}{organization.state}</span>
                    </div>
                  )}
                  <Badge variant={organization.isBusiness ? "default" : "secondary"} data-testid="badge-org-type">
                    {organization.isBusiness ? 'Business' : 'School'}
                  </Badge>
                  {(stats?.usersCount ?? 0) > 0 && (
                    <Badge variant="outline" data-testid="badge-user-count">
                      <Users className="h-3 w-3 mr-1" />
                      {stats?.usersCount ?? 0} user{(stats?.usersCount ?? 0) !== 1 ? 's' : ''}
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
                data-testid="button-edit-org"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {/* Updated Delete Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteOrgMutation.isPending}
                className={`transition-all duration-200 ${
                  deleteOrgMutation.isPending
                    ? 'animate-pulse cursor-not-allowed opacity-75'
                    : 'hover:scale-105'
                }`}
              >
                {deleteOrgMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Organization
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-dialog"
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

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview" data-testid="tab-overview" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="branding" data-testid="tab-branding" className="flex items-center gap-2">
                  <Images className="h-4 w-4" />
                  Branding ({stats?.brandingFilesCount ?? 0})
                </TabsTrigger>
                <TabsTrigger value="sports" data-testid="tab-sports" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sports ({stats?.sportsCount ?? 0})
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Users ({stats?.usersCount ?? 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Organization Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Type</p>
                          <p className="font-medium" data-testid="text-org-type-detail">
                            {organization.isBusiness ? 'Business' : 'School'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Created</p>
                          <p className="font-medium" data-testid="text-org-created">
                            {formatDateSafe(organization.createdAt)}
                          </p>
                        </div>
                      </div>

                      {organization.notes && (
                        <div>
                          <p className="text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm" data-testid="text-org-notes">
                            {organization.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {organization.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Email</p>
                            <p className="font-medium break-all" data-testid="text-org-email">
                              {organization.email}
                            </p>
                          </div>
                        </div>
                      )}

                      {organization.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Phone</p>
                            <p className="font-medium" data-testid="text-org-phone">
                              {organization.phone}
                            </p>
                          </div>
                        </div>
                      )}

                      {organization.website && (
                        <div className="flex items-start gap-3">
                          <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Website</p>
                            <a
                              href={organization.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline break-all"
                              data-testid="link-org-website"
                            >
                              {organization.website}
                            </a>
                          </div>
                        </div>
                      )}

                      {(organization.addressLine1 || organization.city || organization.state) && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Address</p>
                            <div className="font-medium space-y-1" data-testid="text-org-address">
                              {organization.addressLine1 && <p>{organization.addressLine1}</p>}
                              {organization.addressLine2 && <p>{organization.addressLine2}</p>}
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
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Color Palette */}
                {organization.colorPalette && organization.colorPalette.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Brand Colors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2" data-testid="color-palette">
                        {organization.colorPalette.map((color: string, index: number) => (
                          <div
                            key={index}
                            className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                            data-testid={`color-${index}`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="branding" className="space-y-6 mt-0">
                {(brandingFiles?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brandingFiles.map((file: any, index: number) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          {file.url && (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              data-testid={`branding-file-${index}`}
                            />
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <p className="font-medium text-sm truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Images className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No branding files uploaded yet</p>
                    <Button variant="outline" className="mt-4" data-testid="button-upload-branding">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sports" className="space-y-4 mt-0">
                {(sports?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {sports.map((sport: any) => (
                      <Card key={sport.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{sport.sportEmoji || '🏃'}</div>
                              <div>
                                <p className="font-medium" data-testid={`sport-name-${sport.id}`}>
                                  {sport.sportName}
                                </p>
                                {sport.teamName && (
                                  <p className="text-sm text-muted-foreground">
                                    Team: {sport.teamName}
                                  </p>
                                )}
                                {sport.contact_name && (
                                  <p className="text-sm text-muted-foreground">
                                    Contact: {sport.contact_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {sport.contact_email && (
                                <p data-testid={`sport-email-${sport.id}`}>{sport.contact_email}</p>
                              )}
                              {sport.contact_phone && (
                                <p data-testid={`sport-phone-${sport.id}`}>{sport.contact_phone}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No sports contacts configured</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-4 mt-0">
                {(users?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {users.map((user: any) => (
                      <Card key={user.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
                                <AvatarFallback>
                                  {(user.fullName || user.email)?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium" data-testid={`user-name-${user.id}`}>
                                  {user.fullName || user.email}
                                </p>
                                <p className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                                  {user.email}
                                </p>
                                {user.roles.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {user.roles.map((role: any) => (
                                      <Badge key={role.id} variant="outline" className="text-xs">
                                        {role.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {user.lastLogin && (
                                <p className="mt-1 text-xs">
                                  Last: {formatDateSafe(user.lastLogin)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users assigned to this organization</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}