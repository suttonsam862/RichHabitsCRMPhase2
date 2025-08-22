import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateOrganizationDTO } from "../../../shared/dtos/OrganizationDTO";
import { z } from "zod";

interface CreateOrganizationFormProps {
  onSuccess: () => void;
}

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateOrganizationDTO>({
    resolver: zodResolver(CreateOrganizationDTO),
    defaultValues: {
      name: "",
      state: "",
      logoUrl: "",
      address: "",
      phone: "",
      email: "",
      notes: "",
      universalDiscounts: {},
      colorPalette: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateOrganizationDTO) =>
      apiRequest('/api/organizations', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Organization created",
        description: "The organization has been successfully created.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateOrganizationDTO) => {
    // Clean up empty strings to null for optional fields
    const cleanedData = {
      ...data,
      logoUrl: data.logoUrl || undefined,
      address: data.address || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      notes: data.notes || undefined,
    };
    createMutation.mutate(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter organization name"
                    className="glass"
                    data-testid="input-org-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter state"
                    className="glass"
                    data-testid="input-org-state"
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
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/logo.png"
                  className="glass"
                  data-testid="input-org-logo-url"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter full address"
                  className="glass"
                  data-testid="input-org-address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="colorPalette"
          render={({ field }) => {
            const [colorInput, setColorInput] = useState("");
            const colors = field.value || [];

            const addColor = () => {
              const color = colorInput.trim();
              if (color && !colors.includes(color) && colors.length < 12) {
                // Basic validation for hex colors
                if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color)) {
                  field.onChange([...colors, color]);
                  setColorInput("");
                }
              }
            };

            const removeColor = (colorToRemove: string) => {
              field.onChange(colors.filter(c => c !== colorToRemove));
            };

            return (
              <FormItem>
                <FormLabel>Color Palette (Optional)</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="#3B82F6 or #RGB"
                        className="glass"
                        value={colorInput}
                        onChange={(e) => setColorInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addColor();
                          }
                        }}
                        data-testid="input-color-palette"
                      />
                      <Button
                        type="button"
                        onClick={addColor}
                        variant="outline"
                        size="sm"
                        data-testid="button-add-color"
                      >
                        Add
                      </Button>
                    </div>
                    {colors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                            data-testid={`badge-color-${index}`}
                          >
                            <div
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                            <button
                              type="button"
                              onClick={() => removeColor(color)}
                              className="ml-1 hover:text-red-500"
                              data-testid={`button-remove-color-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(555) 123-4567"
                    className="glass"
                    data-testid="input-org-phone"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="contact@organization.com"
                    className="glass"
                    data-testid="input-org-email"
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about the organization"
                  className="glass"
                  data-testid="input-org-notes"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={createMutation.isPending}
            data-testid="button-cancel-create"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            data-testid="button-submit-create"
          >
            {createMutation.isPending ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </form>
    </Form>
  );
}