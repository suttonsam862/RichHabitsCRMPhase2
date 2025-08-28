import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertOrganizationSchema } from "../../../shared/supabase-schema";
import type { InsertOrganization, Organization } from "../../../shared/supabase-schema";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

import { useState } from "react";

interface EditOrganizationFormProps {
  organization: Organization;
  onSuccess: () => void;
  onCancel: () => void;
}

// Create a partial schema for updates
const updateOrganizationSchema = insertOrganizationSchema.partial();

type UpdateOrganizationData = {
  name?: string;
  state?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  brandPrimary?: string;
  brandSecondary?: string;
  isBusiness?: boolean;
  tags?: string[];
  isArchived?: boolean;
};

export function EditOrganizationForm({ organization, onSuccess, onCancel }: EditOrganizationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tagInput, setTagInput] = useState("");

  const form = useForm<UpdateOrganizationData>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      state: organization.state || "",
      logoUrl: organization.logo_url || "",
      address: organization.address || "",
      phone: organization.phone || "",
      email: organization.email || "",
      notes: organization.notes || "",
      brandPrimary: organization.brand_primary || "#6EE7F9",
      brandSecondary: organization.brand_secondary || "#A78BFA", 
      isBusiness: organization.is_business || false,
      tags: organization.tags || [],
      isArchived: organization.is_archived || false,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrganizationData) =>
      apiRequest(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        data: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ['org', organization.id] });
      toast({
        title: "Organization updated",
        description: "The organization has been successfully updated.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !form.getValues('tags')?.includes(tagInput.trim())) {
      const currentTags = form.getValues('tags') || [];
      form.setValue('tags', [...currentTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = (data: UpdateOrganizationData) => {
    // Clean up empty strings to undefined for optional fields
    const cleanedData: any = {
      ...data,
      logoUrl: data.logoUrl || undefined,
      address: data.address || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      notes: data.notes || undefined,
      brandPrimary: data.brandPrimary || undefined,
      brandSecondary: data.brandSecondary || undefined,
    };
    updateMutation.mutate(cleanedData);
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
                    data-testid="input-edit-org-name"
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
                    data-testid="input-edit-org-state"
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
                  data-testid="input-edit-org-logo-url"
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
                  data-testid="input-edit-org-address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                    data-testid="input-edit-org-phone"
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
                    data-testid="input-edit-org-email"
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
            name="brandPrimary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Brand Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="w-16 h-10 rounded border-0 p-1"
                      data-testid="input-edit-org-brand-primary"
                      {...field}
                    />
                    <Input
                      placeholder="#6EE7F9"
                      className="glass flex-1"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brandSecondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Brand Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="w-16 h-10 rounded border-0 p-1"
                      data-testid="input-edit-org-brand-secondary"
                      {...field}
                    />
                    <Input
                      placeholder="#A78BFA"
                      className="glass flex-1"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isBusiness"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-edit-org-is-business"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Business Organization
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Check if this is a business rather than a regular organization
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isArchived"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-edit-org-is-archived"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Archived
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Archive this organization (it will be hidden by default)
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="glass"
                      data-testid="input-add-tag"
                    />
                    <Button type="button" onClick={addTag} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {field.value?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  data-testid="input-edit-org-notes"
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
            onClick={onCancel}
            disabled={updateMutation.isPending}
            data-testid="button-cancel-edit-org"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-submit-edit-org"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}