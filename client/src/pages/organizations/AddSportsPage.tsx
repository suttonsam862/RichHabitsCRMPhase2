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
import { Plus, Trash2, Trophy, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layouts/AppLayout";

// Simplified form schema matching API expectations (snake_case)
const sportFormSchema = z.object({
  sport_id: z.string().min(1, "Sport is required"),
  team_name: z.string().min(1, "Team name is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional()
});

interface SportFormData {
  sport_id: string;
  team_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
}

interface SportContact extends SportFormData {
  id: string;
  sportName: string;
}

export default function AddSportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sportsToAdd, setSportsToAdd] = useState<SportContact[]>([]);

  const form = useForm<SportFormData>({
    resolver: zodResolver(sportFormSchema),
    defaultValues: {
      sport_id: "",
      team_name: "Main Team",
      contact_name: "",
      contact_email: "",
      contact_phone: ""
    }
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
  const { data: availableSportsData = {} } = useQuery({
    queryKey: ['sports'],
    queryFn: () => api.get('/api/v1/sports'),
  });

  // Handle API response structure
  const availableSports = availableSportsData?.data || [];

  const addSportsMutation = useMutation({
    mutationFn: async (sports: SportFormData[]) => {
      const payload = { sports };
      return api.post(`/api/v1/organizations/${id}/sports`, payload);
    },
    onSuccess: () => {
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

  const addSportToList = (data: SportFormData) => {
    const sportName = Array.isArray(availableSports) ? availableSports.find((s: any) => s.id === data.sport_id)?.name : "Unknown Sport";

    // Check if sport is already added
    if (sportsToAdd.some(s => s.sport_id === data.sport_id)) {
      toast({
        title: "Sport already added",
        description: "This sport has already been added to the list.",
        variant: "destructive",
      });
      return;
    }

    const newContact: SportContact = {
      id: Date.now().toString(),
      sportName: sportName || "Unknown Sport",
      ...data
    };

    setSportsToAdd(prev => [...prev, newContact]);

    // Reset form
    form.reset({
      sport_id: "",
      team_name: "Main Team",
      contact_name: "",
      contact_email: "",
      contact_phone: ""
    });
  };

  const removeSportFromList = (id: string) => {
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

    // Convert to API format
    const sportsData: SportFormData[] = sportsToAdd.map(sport => ({
      sport_id: sport.sport_id,
      team_name: sport.team_name,
      contact_name: sport.contact_name,
      contact_email: sport.contact_email,
      contact_phone: sport.contact_phone
    }));

    addSportsMutation.mutate(sportsData);
  };

  // Get filtered sports (filter out existing ones and already added ones)
  const existingSportIds = existingSports?.data?.map((s: any) => s.id) || [];
  const addedSportIds = sportsToAdd.map(s => s.sport_id);
  const filteredSports = Array.isArray(availableSports)
    ? availableSports.filter((sport: any) =>
        !existingSportIds.includes(sport.id) && !addedSportIds.includes(sport.id)
      )
    : [];

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(addSportToList)} className="space-y-4">
            {/* Sport Selection */}
            <FormField
              control={form.control}
              name="sport_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400" data-testid="select-sport">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        data-testid="input-team-name"
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
                        data-testid="input-contact-name"
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
                        data-testid="input-contact-email"
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
                        data-testid="input-contact-phone"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={!form.watch("sport_id") || !form.watch("team_name") || !form.watch("contact_name") || !form.watch("contact_email")}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              data-testid="button-add-sport-to-list"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to List
            </Button>
          </form>
        </Form>
      </motion.div>

      {/* Sports to Add List */}
      {sportsToAdd.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Sports to Add ({sportsToAdd.length})</h3>
          <div className="space-y-3">
            {sportsToAdd.map((sport) => (
              <div key={sport.id} className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="flex items-center gap-4">
                  <Trophy className="h-5 w-5 text-cyan-400" />
                  <div>
                    <div className="text-white font-medium">{sport.sportName}</div>
                    <div className="text-white/60 text-sm">{sport.team_name} - {sport.contact_name}</div>
                    <div className="text-white/60 text-sm">{sport.contact_email}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSportFromList(sport.id)}
                  className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                  data-testid={`button-remove-sport-${sport.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AppLayout>
  );
}