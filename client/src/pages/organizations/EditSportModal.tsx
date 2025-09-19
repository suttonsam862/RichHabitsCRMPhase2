
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/auth/AuthProvider";

const editSportSchema = z.object({
  team_name: z.string().min(1, "Team name is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional(),
  user_id: z.string().optional(),
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
    team_name?: string;
  };
}

export default function EditSportModal({ isOpen, onClose, organizationId, sport }: EditSportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get authenticated user
  
  // Contact selector state
  const [contactType, setContactType] = useState<"new" | "existing">("new");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(editSportSchema),
    defaultValues: {
      team_name: sport.team_name || "Main Team",
      contact_name: sport.contact_name || "",
      contact_email: sport.contact_email || "",
      contact_phone: sport.contact_phone || "",
      user_id: "",
    },
  });


  // Fetch users for contact selection (with search) - using same pattern as setup route
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users-enhanced', userSearch, 'customers'],
    queryFn: async () => {
      console.log('🔍 Searching for users:', userSearch, 'User authenticated:', !!user);
      const params = new URLSearchParams();
      if (userSearch) params.append('q', userSearch);
      params.append('type', 'customers'); // This includes both 'customer' and 'contact' roles
      params.append('pageSize', '50');
      
      try {
        const result = await apiRequest(`/api/v1/users/enhanced?${params.toString()}`);
        console.log('👥 Users API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Users API error:', error);
        throw error;
      }
    },
    enabled: contactType === "existing" && userSearch.length >= 2 && !!user,
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });

  const users = usersData?.data || [];

  // Update form values when user is selected from existing contacts
  useEffect(() => {
    if (contactType === "existing" && selectedUser) {
      form.setValue("contact_name", selectedUser.fullName || selectedUser.email || "");
      form.setValue("contact_email", selectedUser.email || "");
      form.setValue("contact_phone", selectedUser.phone || "");
      form.setValue("user_id", selectedUser.id || "");
    }
  }, [selectedUser, contactType, form]);

  // Reset selected user when switching to new contact
  useEffect(() => {
    if (contactType === "new") {
      setSelectedUser(null);
      setUserSearch("");
      form.setValue("user_id", "");
    }
  }, [contactType, form]);

  const updateSportMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/v1/organizations/${organizationId}/sports/${sport.id}`, {
        method: 'PATCH',
        data: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'sports'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-summary', organizationId] });
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
    // Prepare submission data with only the required snake_case fields
    const submissionData: any = {
      team_name: data.team_name,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone || null,
    };

    // If using existing contact, include user_id
    if (contactType === "existing" && selectedUser) {
      submissionData.user_id = selectedUser.id;
    }

    updateSportMutation.mutate(submissionData);
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
            {/* Contact Type Toggle */}
            <div className="space-y-3">
              <label className="text-white text-sm font-medium">Contact Information</label>
              <RadioGroup 
                value={contactType} 
                onValueChange={(value: "new" | "existing") => setContactType(value)}
                className="flex gap-6"
                data-testid="radio-contact-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" className="border-white/40 text-cyan-400" data-testid="radio-contact-new" />
                  <Label htmlFor="new" className="text-white cursor-pointer">Edit Current Contact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" className="border-white/40 text-cyan-400" data-testid="radio-contact-existing" />
                  <Label htmlFor="existing" className="text-white cursor-pointer">Select Existing User</Label>
                </div>
              </RadioGroup>
            </div>
            {/* Team Name - Always visible */}
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

            {contactType === "new" ? (
              /* Current Contact Form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

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
            ) : (
              /* User Selection */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Search Users</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-white/5 text-white border-white/20 focus:border-cyan-400 pl-10"
                      data-testid="input-user-search"
                    />
                  </div>
                </div>

                {/* User Selection List */}
                {contactType === "existing" && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {usersLoading ? (
                      <div className="text-white/60 text-center py-4">Loading users...</div>
                    ) : usersError ? (
                      <div className="text-red-400 text-center py-4">
                        Error loading users: {usersError?.message || 'Authentication required'}
                      </div>
                    ) : users?.length > 0 ? (
                      users.map((user: any) => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-3 rounded border cursor-pointer transition-colors ${
                            selectedUser?.id === user.id
                              ? 'border-cyan-400 bg-cyan-400/10'
                              : 'border-white/20 bg-white/5 hover:bg-white/10'
                          }`}
                          data-testid={`user-option-${user.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-white/60" />
                            <div>
                              <div className="text-white font-medium">
                                {user.fullName || user.email}
                              </div>
                              <div className="text-white/60 text-sm">{user.email}</div>
                              {user.phone && (
                                <div className="text-white/60 text-sm">{user.phone}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : userSearch ? (
                      <div className="text-white/60 text-center py-4">No users found</div>
                    ) : (
                      <div className="text-white/60 text-center py-4">
                        Start typing to search for users
                      </div>
                    )}
                  </div>
                )}

                {selectedUser && (
                  <div className="p-3 border border-green-400/50 rounded bg-green-400/10">
                    <div className="text-white font-medium">Selected User:</div>
                    <div className="text-white/80">{selectedUser.fullName || selectedUser.email}</div>
                    <div className="text-white/60 text-sm">{selectedUser.email}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateSportMutation.isPending}
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSportMutation.isPending || (contactType === "existing" && !selectedUser)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                data-testid="button-update-sport"
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
