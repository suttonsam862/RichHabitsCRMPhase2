import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertSportSchema } from "@shared/schema";
import type { InsertSport, Sport } from "@shared/schema";

interface EditSportFormProps {
  sport: Sport;
  onSuccess: () => void;
}

export function EditSportForm({ sport, onSuccess }: EditSportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertSport>({
    resolver: zodResolver(insertSportSchema.partial()),
    defaultValues: {
      organizationId: sport.organizationId,
      name: sport.name,
      salesperson: sport.salesperson || "",
      contactName: sport.contactName || "",
      contactEmail: sport.contactEmail || "",
      contactPhone: sport.contactPhone || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InsertSport>) =>
      apiRequest(`/api/sports/${sport.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", sport.organizationId] });
      toast({
        title: "Sport updated",
        description: "The sport has been successfully updated.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sport. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSport) => {
    updateMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sport Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Basketball, Soccer, Tennis"
                  className="glass"
                  data-testid="input-edit-sport-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="salesperson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Salesperson</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter salesperson name"
                  className="glass"
                  data-testid="input-edit-sport-salesperson"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h4 className="font-medium">Contact Information</h4>
          
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter contact person name"
                    className="glass"
                    data-testid="input-edit-sport-contact-name"
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
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      className="glass"
                      data-testid="input-edit-sport-contact-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(555) 123-4567"
                      className="glass"
                      data-testid="input-edit-sport-contact-phone"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={updateMutation.isPending}
            data-testid="button-cancel-edit-sport"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-submit-edit-sport"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}