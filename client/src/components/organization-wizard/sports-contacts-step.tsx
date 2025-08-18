import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type CreateOrgFormData, type SportContact } from "./types";

// Temporary sports data - in real implementation this would come from the sports table
const AVAILABLE_SPORTS = [
  { id: "1", name: "Football" },
  { id: "2", name: "Basketball" },
  { id: "3", name: "Soccer" },
  { id: "4", name: "Baseball" },
  { id: "5", name: "Track & Field" },
  { id: "6", name: "Swimming" },
  { id: "7", name: "Volleyball" },
  { id: "8", name: "Tennis" },
  { id: "9", name: "Wrestling" },
];

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

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contact_name: "",
      contact_email: "",
      contact_phone: "",
    },
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
        brandPrimary: data.brand_primary || "", // Brand primary color
        brandSecondary: data.brand_secondary || "", // Brand secondary color
      };

      console.log("🔍 Sending organization payload:", payload);
      const orgResponse = await apiRequest("/api/organizations", {
        method: "POST",
        data: payload,
      });

      // Then create org_sports entries for each sport
      if (data.sports && data.sports.length > 0) {
        await Promise.all(
          data.sports.map(sport =>
            apiRequest("/api/org-sports", {
              method: "POST",
              data: {
                organizationId: orgResponse.id,
                sportId: sport.sportId,
                contact_name: sport.contact_name,
                contact_email: sport.contact_email,
                contact_phone: sport.contact_phone,
              },
            })
          )
        );
      }

      return orgResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Organization created",
        description: "The organization has been successfully created.",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Failed to create organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addSportContact = () => {
    const formValues = form.getValues();
    const sportName = AVAILABLE_SPORTS.find(s => s.id === selectedSportId)?.name;

    if (!selectedSportId || !sportName || !formValues.contact_name || !formValues.contact_email) {
      return;
    }

    const newContact: SportContact = {
      id: Date.now().toString(),
      sportId: selectedSportId,
      sportName,
      contact_name: formValues.contact_name,
      contact_email: formValues.contact_email,
      contact_phone: formValues.contact_phone,
    };

    const updatedSports = [...(formData.sports || []), newContact];
    updateFormData({ sports: updatedSports });

    // Reset form and selection
    form.reset();
    setSelectedSportId("");
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sport Selection */}
          <div className="space-y-2">
            <label className="text-white text-sm font-medium">Sport</label>
            <Select value={selectedSportId && selectedSportId !== "" ? selectedSportId : undefined} onValueChange={setSelectedSportId}>
              <SelectTrigger className="glass text-white border-white/20 focus:border-blue-400" data-testid="select-sport">
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/20">
                {AVAILABLE_SPORTS
                  .filter(sport => !(formData.sports || []).some(s => s.sportId === sport.id))
                  .map((sport) => (
                  <SelectItem key={sport.id} value={sport.id} className="text-white focus:bg-white/10">
                    {sport.name}
                  </SelectItem>
                ))}
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
                      className="glass text-white border-white/20 focus:border-blue-400"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Button
          type="button"
          onClick={addSportContact}
          disabled={!canAddSport}
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
                <div className="text-white font-medium">{sport.sportName}</div>
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