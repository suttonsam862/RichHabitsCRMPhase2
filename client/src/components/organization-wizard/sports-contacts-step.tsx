import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Search, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type CreateOrgFormData, type SportContact } from "./types";

// Fetch sports data from API instead of hardcoded list

const contactSchema = z.object({
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional(),
});

interface SportsContactsStepProps {
  formData: Partial<CreateOrgFormData>;
  updateFormData: (data: Partial<CreateOrgFormData>) => void;
  onPrev: () => void;
  onSuccess: () => void;
}

export function SportsContactsStep({ formData, updateFormData, onPrev, onSuccess }: SportsContactsStepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSportId, setSelectedSportId] = useState<string | undefined>(undefined);
  const [teamName, setTeamName] = useState(""); // NEW: Team name state
  const [contactType, setContactType] = useState<"new" | "existing">("new");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch available sports from API
  const { data: sportsData, isLoading: sportsLoading, error: sportsError } = useQuery({
    queryKey: ["/api/v1/sports"],
    queryFn: () => apiRequest("/api/v1/sports", { method: "GET" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const availableSports = sportsData?.data || [];

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contact_name: "",
      contact_email: "",
      contact_phone: "",
    },
  });

  // Fetch users for selection
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/v1/users/comprehensive", userSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch) params.append("search", userSearch);
      params.append("limit", "10");
      return apiRequest(`/api/v1/users/comprehensive?${params.toString()}`, { method: "GET" });
    },
    enabled: contactType === "existing",
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgFormData) => {
      // First, create the organization
      // Map form data to camelCase payload as expected by CreateOrganizationSchema
      const payload = {
        name: data.name,
        address: data.address_line1 || "", // Single address field
        state: data.state || "", // Optional state (2-letter code or empty)
        phone: data.phone || "",
        email: data.email || "",
        notes: data.notes || "",
        logoUrl: data.logo_url || "", // camelCase for API
        isBusiness: data.is_business || false, // camelCase boolean
        universalDiscounts: {}, // Always send empty object, never null
      };

      console.log("🔍 Sending organization payload:", payload);
      const orgResponse = await apiRequest("/v1/organizations", {
        method: "POST",
        data: payload,
      });

      // Then create org_sports entries for each sport
      if (data.sports && data.sports.length > 0) {
        await Promise.all(
          data.sports.map(sport =>
            apiRequest("/org-sports", {
              method: "POST",
              data: {
                orgId: orgResponse.id,
                sport_id: sport.sport_id,
                contactName: sport.contact_name,
                contactEmail: sport.contact_email,
                contactPhone: sport.contact_phone,
                userId: sport.user_id, // Include user_id for existing users
              },
            })
          )
        );
      }

      return orgResponse;
    },
    onSuccess: (data) => {
      console.log("Organization created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/v1/organizations"] });
      toast({
        title: "Organization created!",
        description: "Your organization has been created successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Failed to create organization:', error);
      const message = error?.response?.data?.message || error?.message || "Failed to create organization. Please try again.";
      toast({
        title: "Error", 
        description: message,
        variant: "destructive",
      });
    },
  });

  const addSportContact = () => {
    const sportName = availableSports.find((s: any) => s.id === selectedSportId)?.name;
    
    if (!selectedSportId || !sportName) {
      toast({
        title: "Missing Information",
        description: "Please select a sport.",
        variant: "destructive",
      });
      return;
    }
    
    // NEW: Validate team name is provided
    if (!teamName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a team name.",
        variant: "destructive",
      });
      return;
    }
    
    // NEW: Check for duplicate sport + team name combination
    const existingTeam = (formData.sports || []).find(
      s => s.sport_id === selectedSportId && s.teamName.toLowerCase() === teamName.toLowerCase().trim()
    );
    
    if (existingTeam) {
      toast({
        title: "Team Already Exists",
        description: `${sportName} - ${teamName} has already been added.`,
        variant: "destructive",
      });
      return;
    }

    let newContact: SportContact;

    if (contactType === "new") {
      const formValues = form.getValues();
      if (!formValues.contact_name || !formValues.contact_email) {
        toast({
          title: "Missing Information",
          description: "Please enter contact name and email.",
          variant: "destructive",
        });
        return;
      }

      newContact = {
        id: Date.now().toString(),
        sport_id: selectedSportId,
        sportName,
        teamName: teamName.trim(), // NEW: Include team name
        contact_name: formValues.contact_name,
        contact_email: formValues.contact_email,
        contact_phone: formValues.contact_phone,
      };
    } else {
      // Using existing user
      if (!selectedUser) {
        toast({
          title: "Missing Information",
          description: "Please select a user.",
          variant: "destructive",
        });
        return;
      }

      newContact = {
        id: Date.now().toString(),
        sport_id: selectedSportId,
        sportName,
        teamName: teamName.trim(), // NEW: Include team name for existing users too
        contact_name: selectedUser.full_name || selectedUser.email,
        contact_email: selectedUser.email,
        contact_phone: selectedUser.phone || "",
        user_id: selectedUser.id, // Store the user ID for existing users
      };
    }

    const updatedSports = [...(formData.sports || []), newContact];
    updateFormData({ sports: updatedSports });

    // Reset form and selection
    form.reset();
    setSelectedSportId("");
    setTeamName(""); // NEW: Reset team name
    setSelectedUser(null);
    setUserSearch("");
    setContactType("new");
  };

  const removeSportContact = (id: string) => {
    const updatedSports = (formData.sports || []).filter(s => s.id !== id);
    updateFormData({ sports: updatedSports });
  };

  const handleSubmit = () => {
    const currentSports = formData.sports || [];

    // Validate that non-business organizations have at least one sport
    if (!formData.is_business && currentSports.length === 0) {
      toast({
        title: "Sports Required",
        description: "Non-business organizations must have at least one sport.",
        variant: "destructive",
      });
      return;
    }

    createOrgMutation.mutate(formData as CreateOrgFormData);
  };

  const canAddSport = selectedSportId && form.watch("contact_name") && form.watch("contact_email");
  const hasSports = (formData.sports || []).length > 0;
  const canSubmit = formData.is_business || hasSports;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Sports & Contacts</h3>
        <p className="text-white/70">
          {formData.is_business 
            ? "Add sports and contact information (optional for businesses)"
            : "Add one or more sports with contact information (required)"}
        </p>
      </div>

      {/* Add Sport Contact Form */}
      <div className="space-y-4 p-4 border border-white/20 rounded-lg bg-white/5">
        <h4 className="text-lg font-medium text-white">Add Sport Contact</h4>

        {/* Sport Selection */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">Sport</label>
          <Select value={selectedSportId && selectedSportId !== "" ? selectedSportId : undefined} onValueChange={setSelectedSportId}>
            <SelectTrigger className="glass text-white border-white/20 focus:border-blue-400" data-testid="select-sport">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/20">
              {sportsLoading ? (
                <div className="p-2 text-white/60 text-center">Loading sports...</div>
              ) : sportsError ? (
                <div className="p-2 text-red-400 text-center">Error loading sports</div>
              ) : (
                availableSports.map((sport: any) => (
                  <SelectItem key={sport.id} value={sport.id} className="text-white focus:bg-white/10">
                    {sport.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* NEW: Team Name Input */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">Team Name</label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Varsity, JV, Middle School, High School"
            className="glass text-white border-white/20 focus:border-blue-400 placeholder:text-white/50"
            data-testid="input-team-name"
          />
          <p className="text-white/60 text-xs">
            Enter a name to distinguish this team (e.g., Varsity, JV, Middle School, High School)
          </p>
        </div>

        {/* Contact Type Toggle */}
        <div className="space-y-3">
          <label className="text-white text-sm font-medium">Contact Type</label>
          <RadioGroup 
            value={contactType} 
            onValueChange={(value: "new" | "existing") => setContactType(value)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" className="border-white/40 text-blue-400" />
              <Label htmlFor="new" className="text-white cursor-pointer">Add New Contact</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" className="border-white/40 text-blue-400" />
              <Label htmlFor="existing" className="text-white cursor-pointer">Select Existing User</Label>
            </div>
          </RadioGroup>
        </div>

        {contactType === "new" ? (
          /* New Contact Form */
          <div className="space-y-4">
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
                          className="glass text-white border-white/20 focus:border-blue-400"
                          data-testid="input-contact-name"
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
                          placeholder="contact@example.com"
                          className="glass text-white border-white/20 focus:border-blue-400"
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

            <Form {...form}>
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Contact Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(555) 123-4567"
                        className="glass text-white border-white/20 focus:border-blue-400"
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
                  className="glass text-white border-white/20 focus:border-blue-400 pl-10"
                  data-testid="input-user-search"
                />
              </div>
            </div>

            {/* User Selection List */}
            {contactType === "existing" && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {usersLoading ? (
                  <div className="text-white/60 text-center py-4">Loading users...</div>
                ) : usersData?.length > 0 ? (
                  usersData.map((user: any) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'border-blue-400 bg-blue-400/10'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                      data-testid={`user-option-${user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-white/60" />
                        <div>
                          <div className="text-white font-medium">
                            {user.full_name || user.email}
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

        <Button
          type="button"
          onClick={addSportContact}
          disabled={!selectedSportId || !teamName.trim() || (contactType === "new" ? (!form.watch("contact_name") || !form.watch("contact_email")) : !selectedUser)}
          className="neon-button w-full"
          data-testid="button-add-sport"
        >
          <div className="neon-button-inner flex items-center justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Sport Contact
          </div>
        </Button>
      </div>

      {/* Added Sports List */}
      {hasSports && (
        <div className="space-y-3">
          <h4 className="text-lg font-medium text-white">Added Sports</h4>
          {(formData.sports || []).map((sport) => (
            <div
              key={sport.id}
              className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5"
              data-testid={`sport-contact-${sport.id}`}
            >
              <div>
                <div className="text-white font-medium">
                  {sport.sportName} - {sport.teamName}
                </div>
                <div className="text-white/70 text-sm">
                  {sport.contact_name} • {sport.contact_email}
                  {sport.contact_phone && ` • ${sport.contact_phone}`}
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
            </div>
          ))}
        </div>
      )}

      {/* Validation Warning */}
      {!formData.is_business && !hasSports && (
        <div className="p-3 border border-yellow-500/50 rounded-lg bg-yellow-500/10 text-yellow-300 text-sm">
          ⚠️ Schools must have at least one sport contact.
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          onClick={onPrev}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/5"
          disabled={createOrgMutation.isPending}
          data-testid="button-prev-sports"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          className="neon-button"
          disabled={!canSubmit || createOrgMutation.isPending}
          data-testid="button-create-organization"
        >
          <div className="neon-button-inner">
            {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
          </div>
        </Button>
      </div>
    </div>
  );
}