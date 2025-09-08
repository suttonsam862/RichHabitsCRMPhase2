import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Trophy, Save, Users, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layouts/AppLayout";

// Sports data will be fetched dynamically from API

const contactSchema = z.object({
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional(),
});

interface SportContact {
  id: string;
  sport_id: string;
  sportName: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
}

export default function AddSportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSportId, setSelectedSportId] = useState<string>("");
  const [sportsToAdd, setSportsToAdd] = useState<SportContact[]>([]);
  const [contactMode, setContactMode] = useState<'new' | 'existing'>('new');
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contact_name: "",
      contact_email: "",
      contact_phone: "",
    },
  });

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organizations', id],
    queryFn: () => api.get(`/api/v1/organizations/${id}`),
    enabled: !!id,
  });

  // Fetch existing sports to filter out duplicates
  const { data: existingSports = [] } = useQuery({
    queryKey: ['organizations', id, 'sports'],
    queryFn: () => api.get(`/api/v1/organizations/${id}/sports`),
    enabled: !!id,
  });

  // Fetch available sports from API
  const { data: availableSportsData = {}, isLoading: sportsLoading } = useQuery({
    queryKey: ['sports'],
    queryFn: () => api.get('/api/v1/sports'),
  });

  // Handle API response structure
  const availableSports = availableSportsData?.data || [];

  // Fetch existing users for selection
  const { data: existingUsersData = {}, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/v1/users'),
  });

  const existingUsers = existingUsersData?.data || [];

  const addSportsMutation = useMutation({
    mutationFn: async (sports: SportContact[]) => {
      const payload = {
        sports: sports.map(sport => ({
          sport_id: sport.sport_id,
          contact_name: sport.contact_name,
          contact_email: sport.contact_email,
          contact_phone: sport.contact_phone || "",
        })),
      };

      return api.post(`/api/v1/organizations/${id}/sports`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'sports'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      toast({
        title: "Sports added successfully!",
        description: `Added ${sportsToAdd.length} sport${sportsToAdd.length > 1 ? 's' : ''} to ${organization?.data?.name}`,
      });
      
      navigate(`/organizations/${id}/sports`);
    },
    onError: (error: any) => {
      console.error('Failed to add sports:', error);
      const message = error?.response?.data?.error || error?.message || "Failed to add sports. Please try again.";
      toast({
        title: "Error", 
        description: message,
        variant: "destructive",
      });
    },
  });

  const addSportContact = () => {
    const formValues = form.getValues();
    const sportName = Array.isArray(availableSports) ? availableSports.find((s: any) => s.id === selectedSportId)?.name : undefined;

    if (!selectedSportId || !sportName) {
      toast({
        title: "Missing information",
        description: "Please select a sport.",
        variant: "destructive",
      });
      return;
    }

    let contactData;
    
    if (contactMode === 'new') {
      if (!formValues.contact_name || !formValues.contact_email) {
        toast({
          title: "Missing information",
          description: "Please fill in all required contact fields.",
          variant: "destructive",
        });
        return;
      }
      contactData = {
        contact_name: formValues.contact_name,
        contact_email: formValues.contact_email,
        contact_phone: formValues.contact_phone || ""
      };
    } else {
      const selectedUser = existingUsers.find((u: any) => u.id === selectedUserId);
      if (!selectedUser) {
        toast({
          title: "Missing information",
          description: "Please select an existing user.",
          variant: "destructive",
        });
        return;
      }
      contactData = {
        contact_name: selectedUser.fullName || selectedUser.full_name || selectedUser.name,
        contact_email: selectedUser.email,
        contact_phone: selectedUser.phone || "",
        userId: selectedUser.id
      };
    }

    // Check if sport is already added
    if (sportsToAdd.some(s => s.sport_id === selectedSportId)) {
      toast({
        title: "Sport already added",
        description: "This sport has already been added to the list.",
        variant: "destructive",
      });
      return;
    }

    const newContact: SportContact = {
      id: Date.now().toString(),
      sport_id: selectedSportId,
      sportName,
      ...contactData
    };

    setSportsToAdd(prev => [...prev, newContact]);

    // Reset form and selection
    form.reset();
    setSelectedSportId("");
    setSelectedUserId("");
  };

  const removeSportContact = (id: string) => {
    setSportsToAdd(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (sportsToAdd.length === 0) {
      toast({
        title: "No sports to add",
        description: "Please add at least one sport before saving.",
        variant: "destructive",
      });
      return;
    }

    addSportsMutation.mutate(sportsToAdd);
  };

  // Get filtered sports (filter out existing ones and already added ones)
  const existingSportIds = existingSports?.data?.map((s: any) => s.id) || [];
  const addedSportIds = sportsToAdd.map(s => s.sport_id);
  const filteredSports = Array.isArray(availableSports) 
    ? availableSports.filter((sport: any) => 
        !existingSportIds.includes(sport.id) && !addedSportIds.includes(sport.id)
      )
    : [];

  const canAddSport = selectedSportId && form.watch("contact_name") && form.watch("contact_email");

  if (orgLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white/60 mt-4">Loading organization...</p>
        </div>
      </AppLayout>
    );
  }

  if (!organization?.success || !organization?.data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">Organization Not Found</h1>
          <p className="text-white/60 mb-6">The organization you're looking for doesn't exist.</p>
          <Link to="/organizations">
            <Button>Back to Organizations</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const headerActions = (
    <Button 
      onClick={handleSave}
      disabled={sportsToAdd.length === 0 || addSportsMutation.isPending}
      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25 transition-all duration-200"
      data-testid="button-save-sports"
    >
      {addSportsMutation.isPending ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          Save Sports ({sportsToAdd.length})
        </>
      )}
    </Button>
  );

  return (
    <AppLayout
      title="Add Sports"
      subtitle={`Add sports programs and contacts to ${organization.data.name}`}
      showBackButton={true}
      backHref={`/organizations/${id}/sports`}
      headerActions={headerActions}
    >

      {/* Add Sport Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6"
      >
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-cyan-400" />
            Add Sport & Contact
          </h3>

          {/* Sport Selection */}
          <div className="mb-6">
            <label className="text-white text-sm font-medium">Sport</label>
            <Select value={selectedSportId || undefined} onValueChange={setSelectedSportId}>
              <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400 mt-2" data-testid="select-sport">
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/20">
                {filteredSports.length === 0 ? (
                  <div className="p-2 text-white/60 text-sm">No additional sports available</div>
                ) : (
                  filteredSports.map((sport: any) => (
                    <SelectItem key={sport.id} value={sport.id} className="text-white focus:bg-white/10">
                      {sport.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Mode Tabs */}
          <Tabs value={contactMode} onValueChange={(value: any) => setContactMode(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="new" className="flex items-center gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <UserPlus className="h-4 w-4" />
                New Contact
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <Users className="h-4 w-4" />
                Select Existing User
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form {...form}>
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
                            data-testid="input-contact-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                <Form {...form}>
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
                            data-testid="input-contact-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </div>

              <div className="mt-4">
                <Form {...form}>
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
                            data-testid="input-contact-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium">Select User</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400 mt-2" data-testid="select-existing-user">
                      <SelectValue placeholder="Choose an existing user" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-white/20">
                      {usersLoading ? (
                        <div className="p-2 text-white/60 text-sm">Loading users...</div>
                      ) : existingUsers.length === 0 ? (
                        <div className="p-2 text-white/60 text-sm">No users available</div>
                      ) : (
                        existingUsers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id} className="text-white focus:bg-white/10">
                            {user.fullName || user.full_name || user.name} ({user.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedUserId && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-2">Selected User Details</h4>
                    {(() => {
                      const user = existingUsers.find((u: any) => u.id === selectedUserId);
                      return user ? (
                        <div className="space-y-1 text-sm text-white/80">
                          <p><strong>Name:</strong> {user.fullName || user.full_name || user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={addSportContact}
            disabled={!selectedSportId || filteredSports.length === 0 || (contactMode === 'new' ? (!form.watch("contact_name") || !form.watch("contact_email")) : !selectedUserId)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 mt-4"
            data-testid="button-add-sport"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sport to List
          </Button>
      </motion.div>

      {/* Added Sports List */}
      {sportsToAdd.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-cyan-400" />
              Sports to Add ({sportsToAdd.length})
            </h3>

            <div className="space-y-3">
              {sportsToAdd.map((sport, index) => (
                <motion.div
                  key={sport.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  data-testid={`sport-item-${sport.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{sport.sportName}</h4>
                      <div className="text-white/70 text-sm">
                        {sport.contact_name} • {sport.contact_email}
                        {sport.contact_phone && ` • ${sport.contact_phone}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSportContact(sport.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    data-testid={`button-remove-sport-${sport.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
        </motion.div>
      )}
    </AppLayout>
  );
}