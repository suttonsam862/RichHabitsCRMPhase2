import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/constants/us-states";
import { ArrowRight } from "lucide-react";
import { type CreateOrgFormData } from "./types";

const primarySchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  is_business: z.boolean(),
  email_domain: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string(),
});

interface PrimaryStepProps {
  formData: Partial<CreateOrgFormData>;
  updateFormData: (data: Partial<CreateOrgFormData>) => void;
  onNext: () => void;
}

export function PrimaryStep({ formData, updateFormData, onNext }: PrimaryStepProps) {
  const form = useForm({
    resolver: zodResolver(primarySchema),
    defaultValues: {
      name: formData.name || "",
      is_business: formData.is_business || false,
      email_domain: formData.email_domain || "",
      address_line1: formData.address_line1 || "",
      address_line2: formData.address_line2 || "",
      city: formData.city || "",
      state: formData.state || "",
      postal_code: formData.postal_code || "",
      country: formData.country || "United States",
    },
  });

  const onSubmit = (data: z.infer<typeof primarySchema>) => {
    updateFormData(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Primary Information</h3>
        <p className="text-white/70">Required details about your organization</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Organization Name - Required */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Organization Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter organization name"
                    className="glass text-white border-white/20 focus:border-blue-400"
                    data-testid="input-org-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Business Toggle */}
          <FormField
            control={form.control}
            name="is_business"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/20 bg-white/5 p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-white">Business Organization</FormLabel>
                  <div className="text-sm text-white/70">
                    Check if this is a business rather than a school
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-is-business"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Email Domain */}
          <FormField
            control={form.control}
            name="email_domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Email Domain</FormLabel>
                <FormControl>
                  <Input
                    placeholder="example.com"
                    className="glass text-white border-white/20 focus:border-blue-400"
                    data-testid="input-email-domain"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Address Line 1</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Street address"
                      className="glass text-white border-white/20 focus:border-blue-400"
                      data-testid="input-address-line1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Address Line 2</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Apartment, suite, etc."
                      className="glass text-white border-white/20 focus:border-blue-400"
                      data-testid="input-address-line2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City"
                      className="glass text-white border-white/20 focus:border-blue-400"
                      data-testid="input-city"
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
                  <FormLabel className="text-white">State</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="glass text-white border-white/20 focus:border-blue-400" data-testid="select-state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-white/20">
                      {US_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value} className="text-white focus:bg-white/10">
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12345"
                      className="glass text-white border-white/20 focus:border-blue-400"
                      data-testid="input-postal-code"
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
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Country</FormLabel>
                <FormControl>
                  <Input
                    className="glass text-white border-white/20 focus:border-blue-400"
                    data-testid="input-country"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Next Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="neon-button"
              data-testid="button-next-primary"
            >
              <div className="neon-button-inner flex items-center">
                Next: Branding
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}