import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  User,
  AlertTriangle
} from 'lucide-react';
import { useEffect } from 'react';

const editSalespersonSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  employee_id: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  territory: z.string().optional(),
  hire_date: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional(),
});

type EditSalespersonFormData = z.infer<typeof editSalespersonSchema>;

export default function EditSalesperson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: salesperson, isLoading, error } = useQuery({
    queryKey: ['/api/v1/sales/salespeople', id],
    queryFn: () => api.get(`/api/v1/sales/salespeople/${id}`),
    enabled: !!id,
  });

  const form = useForm<EditSalespersonFormData>({
    resolver: zodResolver(editSalespersonSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      employee_id: "",
      commission_rate: 0,
      territory: "",
      hire_date: "",
      performance_tier: 'standard',
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (salesperson?.data) {
      const person = salesperson.data;
      const profile = person.profile;
      
      form.reset({
        full_name: person.full_name || "",
        email: person.email || "",
        phone: person.phone || "",
        employee_id: profile?.employee_id || "",
        commission_rate: profile?.commission_rate ? (profile.commission_rate / 100) : 0,
        territory: profile?.territory || "",
        hire_date: profile?.hire_date ? profile.hire_date.split('T')[0] : "",
        performance_tier: (profile?.performance_tier as any) || 'standard',
      });
    }
  }, [salesperson, form]);

  const updateSalespersonMutation = useMutation({
    mutationFn: async (data: EditSalespersonFormData) => {
      // Update user information
      const userResponse = await api.patch(`/api/v1/users/${id}`, {
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
      });

      // Update profile information
      const profileResponse = await api.put(`/api/v1/sales/salespeople/${id}/profile`, {
        employee_id: data.employee_id,
        commission_rate: (data.commission_rate || 0) * 100, // Convert to basis points
        territory: data.territory,
        hire_date: data.hire_date,
        performance_tier: data.performance_tier,
      });

      return { user: userResponse.data, profile: profileResponse.data };
    },
    onSuccess: () => {
      toast({ 
        title: "Salesperson updated successfully!", 
        description: "Changes have been saved." 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople', id] });
      navigate(`/sales/${id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update salesperson", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: EditSalespersonFormData) => {
    updateSalespersonMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !salesperson?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Salesperson Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The salesperson you're trying to edit doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/sales')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const person = salesperson.data;
  const profile = person.profile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to={`/sales/${id}`}>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.profile_photo_url || undefined} alt={person.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
                {person.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                Edit Salesperson
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Update {person.full_name}'s information
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle>Salesperson Information</CardTitle>
            <CardDescription>
              Update the details for this salesperson. All fields with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter full name"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-full-name"
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
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter email address"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-email"
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Enter phone number"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter employee ID"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-employee-id"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Sales Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="commission_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="0"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-commission-rate"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="territory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Territory</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., North America, Europe"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-territory"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="hire_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="bg-white dark:bg-gray-700"
                              data-testid="input-hire-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/sales/${id}`)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateSalespersonMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="button-save-salesperson"
                  >
                    {updateSalespersonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}