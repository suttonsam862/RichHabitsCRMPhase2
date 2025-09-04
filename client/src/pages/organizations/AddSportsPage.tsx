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
import { ArrowLeft, Plus, Trash2, Trophy, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

// Available sports data - using UUIDs that match the database
const AVAILABLE_SPORTS = [
  { id: "550e8400-e29b-41d4-a716-446655440001", name: "Football" },
  { id: "550e8400-e29b-41d4-a716-446655440002", name: "Basketball" },
  { id: "550e8400-e29b-41d4-a716-446655440003", name: "Soccer" },
  { id: "550e8400-e29b-41d4-a716-446655440004", name: "Baseball" },
  { id: "550e8400-e29b-41d4-a716-446655440005", name: "Track & Field" },
  { id: "550e8400-e29b-41d4-a716-446655440006", name: "Swimming" },
  { id: "550e8400-e29b-41d4-a716-446655440007", name: "Volleyball" },
  { id: "550e8400-e29b-41d4-a716-446655440008", name: "Tennis" },
  { id: "550e8400-e29b-41d4-a716-446655440009", name: "Wrestling" },
];

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
    queryFn: () => apiRequest(`/v1/organizations/${id}`),
    enabled: !!id,
  });

  // Fetch existing sports to filter out duplicates
  const { data: existingSports = [] } = useQuery({
    queryKey: ['organizations', id, 'sports'],
    queryFn: () => apiRequest(`/v1/organizations/${id}/sports`),
    enabled: !!id,
  });

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

      return apiRequest(`/v1/organizations/${id}/sports`, {
        method: "POST",
        data: payload,
      });
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
    const sportName = AVAILABLE_SPORTS.find(s => s.id === selectedSportId)?.name;

    if (!selectedSportId || !sportName || !formValues.contact_name || !formValues.contact_email) {
      toast({
        title: "Missing information",
        description: "Please select a sport and fill in all required contact fields.",
        variant: "destructive",
      });
      return;
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
      contact_name: formValues.contact_name,
      contact_email: formValues.contact_email,
      contact_phone: formValues.contact_phone,
    };

    setSportsToAdd(prev => [...prev, newContact]);

    // Reset form and selection
    form.reset();
    setSelectedSportId("");
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

  // Get available sports (filter out existing ones and already added ones)
  const existingSportIds = existingSports?.data?.map((s: any) => s.id) || [];
  const addedSportIds = sportsToAdd.map(s => s.sport_id);
  const availableSports = AVAILABLE_SPORTS.filter(sport => 
    !existingSportIds.includes(sport.id) && !addedSportIds.includes(sport.id)
  );

  const canAddSport = selectedSportId && form.watch("contact_name") && form.watch("contact_email");

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white/60 mt-4">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization?.success || !organization?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Organization Not Found</h1>
          <p className="text-white/60 mb-6">The organization you're looking for doesn't exist.</p>
          <Link to="/organizations">
            <Button>Back to Organizations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link to={`/organizations/${id}/sports`}>
              <Button variant="ghost" size="sm" className="text-white hover:text-cyan-400 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sports
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Add Sports
              </h1>
              <p className="text-white/60 mt-1">Add sports programs and contacts to {organization.data.name}</p>
            </div>
          </div>
          
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
        </motion.div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Sport Selection */}
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Sport</label>
              <Select value={selectedSportId || undefined} onValueChange={setSelectedSportId}>
                <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400" data-testid="select-sport">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/20">
                  {availableSports.length === 0 ? (
                    <div className="p-2 text-white/60 text-sm">No additional sports available</div>
                  ) : (
                    availableSports.map((sport) => (
                      <SelectItem key={sport.id} value={sport.id} className="text-white focus:bg-white/10">
                        {sport.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          <Button
            onClick={addSportContact}
            disabled={!canAddSport || availableSports.length === 0}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
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
      </div>
    </div>
  );
}