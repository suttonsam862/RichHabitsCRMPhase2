import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertSportSchema } from "@shared/schema";
import type { InsertSport } from "@shared/schema";

interface CreateSportFormProps {
  organizationId: string;
  onSuccess: () => void;
}

export function CreateSportForm({ organizationId, onSuccess }: CreateSportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertSport>({
    resolver: zodResolver(insertSportSchema),
    defaultValues: {
      organizationId,
      name: "",
      salesperson: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSport) =>
      apiRequest("/api/sports", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId] });
      toast({
        title: "Sport added",
        description: "The sport has been successfully added.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add sport. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSport) => {
    createMutation.mutate(data);
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
                  data-testid="input-sport-name"
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
                  data-testid="input-sport-salesperson"
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
                    data-testid="input-sport-contact-name"
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
                      data-testid="input-sport-contact-email"
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
                      data-testid="input-sport-contact-phone"
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
            disabled={createMutation.isPending}
            data-testid="button-cancel-sport"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            data-testid="button-submit-sport"
          >
            {createMutation.isPending ? "Adding..." : "Add Sport"}
          </Button>
        </div>
      </form>
    </Form>
  );
}