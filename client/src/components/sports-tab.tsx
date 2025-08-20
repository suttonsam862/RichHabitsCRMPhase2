import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash, User, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateSportForm } from "@/components/create-sport-form";
import { EditSportForm } from "@/components/edit-sport-form";
import type { Sport } from "../../../shared/supabase-schema";

interface SportsTabProps {
  organizationId: string;
  sports: Sport[];
}

export function SportsTab({ organizationId, sports }: SportsTabProps) {
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteSportMutation = useMutation({
    mutationFn: (sportId: string) =>
      apiRequest(`/api/sports/${sportId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ['org', organizationId] });
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

  const handleDeleteSport = (sport: Sport) => {
    if (confirm(`Are you sure you want to delete ${sport.name}?`)) {
      deleteSportMutation.mutate(sport.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sports Management</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-sport">
              <Plus className="h-4 w-4 mr-2" />
              Add Sport
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Add New Sport</DialogTitle>
            </DialogHeader>
            <CreateSportForm
              organizationId={organizationId}
              onSuccess={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {sports.length === 0 ? (
        <Card className="bg-muted/30 backdrop-blur-sm border-border/50">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No sports configured for this organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sports.map((sport) => (
            <Card key={sport.id} className="bg-muted/30 backdrop-blur-sm border-border/50" data-testid={`card-sport-${sport.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      {sport.name}
                      {sport.assigned_salesperson && (
                        <Badge variant="secondary" className="text-xs">
                          {sport.assigned_salesperson}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-sport-${sport.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-2xl border-0 shadow-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Sport</DialogTitle>
                        </DialogHeader>
                        <EditSportForm
                          sport={sport}
                          onSuccess={() => {
                            toast({
                              title: "Sport updated",
                              description: "The sport has been successfully updated.",
                            });
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSport(sport)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-sport-${sport.id}`}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(sport.contact_name || sport.contact_email || sport.contact_phone) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
                    
                    {sport.contact_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-contact-name-${sport.id}`}>
                          {sport.contact_name}
                        </span>
                      </div>
                    )}
                    
                    {sport.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-contact-email-${sport.id}`}>
                          {sport.contact_email}
                        </span>
                      </div>
                    )}
                    
                    {sport.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-contact-phone-${sport.id}`}>
                          {sport.contact_phone}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Sport Modal */}
      {editingSport && (
        <Dialog open={true} onOpenChange={() => setEditingSport(null)}>
          <DialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Edit Sport</DialogTitle>
            </DialogHeader>
            <EditSportForm
              sport={editingSport}
              onSuccess={() => {
                setEditingSport(null);
                toast({
                  title: "Sport updated",
                  description: "The sport has been successfully updated.",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}