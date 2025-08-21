import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CreateSportForm } from "@/components/create-sport-form";
import { EditSportForm } from "@/components/edit-sport-form";
import { apiRequest } from "@/lib/queryClient";

interface Sport {
  id: string;
  name: string;
  season?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}

interface SportsTabProps {
  organizationId: string;
  sports: Sport[];
}

export function SportsTab({ organizationId, sports = [] }: SportsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sports for the organization
  const { data: sportsData = [], isLoading } = useQuery({
    queryKey: ['sports', organizationId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/organizations/${organizationId}/sports`);
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch sports:', error);
        return [];
      }
    },
    enabled: !!organizationId,
  });

  // Delete sport mutation
  const deleteMutation = useMutation({
    mutationFn: async (sportId: string) => {
      await apiRequest(`/api/organizations/${organizationId}/sports/${sportId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports', organizationId] });
      toast({
        title: "Sport deleted",
        description: "The sport has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sport. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (sport: Sport) => {
    if (confirm(`Are you sure you want to delete ${sport.name}?`)) {
      deleteMutation.mutate(sport.id);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gray-700 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Sports & Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">Loading sports...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700 bg-gray-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            Sports & Contacts
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            data-testid="button-add-sport"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sport
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreateForm ? (
          <CreateSportForm
            organizationId={organizationId}
            onSuccess={() => {
              setShowCreateForm(false);
              queryClient.invalidateQueries({ queryKey: ['sports', organizationId] });
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : editingSport ? (
          <EditSportForm
            sport={editingSport}
            organizationId={organizationId}
            onSuccess={() => {
              setEditingSport(null);
              queryClient.invalidateQueries({ queryKey: ['sports', organizationId] });
            }}
            onCancel={() => setEditingSport(null)}
          />
        ) : (
          <>
            {sportsData.length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sports added yet.</p>
                <p className="text-sm">Click "Add Sport" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sportsData.map((sport: Sport) => (
                  <div
                    key={sport.id}
                    className="border border-gray-600 bg-gray-800/30 rounded-lg p-4 space-y-3"
                    data-testid={`sport-card-${sport.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-lg text-white" data-testid={`sport-name-${sport.id}`}>
                          {sport.name}
                        </h4>
                        {sport.season && (
                          <Badge variant="secondary" className="bg-blue-600 text-white" data-testid={`sport-season-${sport.id}`}>
                            {sport.season}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSport(sport)}
                          data-testid={`button-edit-sport-${sport.id}`}
                          className="border-gray-600 text-white hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sport)}
                          disabled={deleteMutation.isPending}
                          className="text-red-400 hover:text-red-300 border-gray-600 hover:bg-gray-700"
                          data-testid={`button-delete-sport-${sport.id}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {(sport.contact_name || sport.contact_email || sport.contact_phone) && (
                      <>
                        <Separator className="bg-gray-600" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {sport.contact_name && (
                            <div>
                              <p className="text-sm text-gray-400">Contact Name</p>
                              <p className="font-medium text-white" data-testid={`sport-contact-name-${sport.id}`}>
                                {sport.contact_name}
                              </p>
                            </div>
                          )}
                          {sport.contact_email && (
                            <div>
                              <p className="text-sm text-gray-400">Email</p>
                              <p className="font-medium text-sm text-white" data-testid={`sport-contact-email-${sport.id}`}>
                                {sport.contact_email}
                              </p>
                            </div>
                          )}
                          {sport.contact_phone && (
                            <div>
                              <p className="text-sm text-gray-400">Phone</p>
                              <p className="font-medium text-white" data-testid={`sport-contact-phone-${sport.id}`}>
                                {sport.contact_phone}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {sport.notes && (
                      <>
                        <Separator className="bg-gray-600" />
                        <div>
                          <p className="text-sm text-gray-400">Notes</p>
                          <p className="text-sm text-white" data-testid={`sport-notes-${sport.id}`}>
                            {sport.notes}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}