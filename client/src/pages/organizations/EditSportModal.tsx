
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const editSportSchema = z.object({
  team_name: z.string().min(1, "Team name is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional(),
  assigned_salesperson_id: z.string().optional(),
});

interface EditSportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  sport: {
    id: string;
    name: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    assigned_salesperson?: string;
    assigned_salesperson_id?: string;
    team_name?: string;
  };
}

export default function EditSportModal({ isOpen, onClose, organizationId, sport }: EditSportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(editSportSchema),
    defaultValues: {
      team_name: sport.team_name || "Main Team",
      contact_name: sport.contact_name || "",
      contact_email: sport.contact_email || "",
      contact_phone: sport.contact_phone || "",
      assigned_salesperson_id: sport.assigned_salesperson_id || "",
    },
  });

  // Fetch staff/sales users for salesperson assignment
  const { data: salespeopleData = {}, isLoading: salespeopleLoading } = useQuery({
    queryKey: ['users-salespeople'],
    queryFn: () => api.get('/api/v1/users/enhanced?type=staff&pageSize=100'),
  });

  const salespeople = salespeopleData?.data?.users || salespeopleData?.data || [];

  const updateSportMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.patch(`/api/v1/organizations/${organizationId}/sports/${sport.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'sports'] });
      toast({
        title: "Sport updated successfully!",
        description: `Updated ${sport.name} for this organization`,
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update sport:', error);
      const message = error?.response?.data?.error || error?.message || "Failed to update sport. Please try again.";
      toast({
        title: "Error", 
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    updateSportMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Edit {sport.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="team_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Team Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter team name"
                        className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact name"
                        className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Contact Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_salesperson_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Assign Salesperson (Optional)</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400">
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-white/20">
                      <SelectItem value="" className="text-white focus:bg-white/10">No assignment</SelectItem>
                      {salespeopleLoading ? (
                        <div className="p-2 text-white/60 text-sm">Loading salespeople...</div>
                      ) : salespeople.length === 0 ? (
                        <div className="p-2 text-white/60 text-sm">No salespeople available</div>
                      ) : (
                        salespeople.map((person: any) => (
                          <SelectItem key={person.id} value={person.id} className="text-white focus:bg-white/10">
                            {person.fullName || person.name || 'Unknown User'} ({person.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateSportMutation.isPending}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSportMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {updateSportMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Sport'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
