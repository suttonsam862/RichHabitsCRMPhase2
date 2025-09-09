import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, UserPlus, Loader2, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { US_STATES } from '@/constants/us-states';
import { Badge } from '@/components/ui/badge';

const salespersonSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  // employee_id: removed - will be auto-generated on backend
  commission_rate: z.number().min(0).max(100).optional(),
  territory: z.array(z.string()).optional(),
  hire_date: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional(),
});

type SalespersonFormData = z.infer<typeof salespersonSchema>;

export default function CreateSalesperson() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const form = useForm<SalespersonFormData>({
    resolver: zodResolver(salespersonSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      // employee_id: removed - auto-generated
      commission_rate: 0,
      territory: [],
      hire_date: "",
      performance_tier: 'standard',
    },
  });

  const createSalespersonMutation = useMutation({
    mutationFn: async (data: SalespersonFormData) => {
      // First create the user
      const userResponse = await api.post('/api/v1/users', {
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        role: 'salesperson'
      });

      // Then create their profile
      if (userResponse.success && userResponse.data) {
        const profileResponse = await api.post(`/api/v1/sales/salespeople/${userResponse.data.id}/profile`, {
          // employee_id will be auto-generated on backend
          commission_rate: (data.commission_rate || 0) * 100, // Convert to basis points
          territory: data.territory,
          hire_date: data.hire_date,
          performance_tier: data.performance_tier,
        });
        return { user: userResponse.data, profile: profileResponse.data };
      }
      
      throw new Error('Failed to create user');
    },
    onSuccess: (data) => {
      toast({ 
        title: "Salesperson created successfully!", 
        description: `${data.user.full_name} has been added to the sales team.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      navigate('/sales');
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create salesperson", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: SalespersonFormData) => {
    createSalespersonMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/sales">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sales
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-blue-600" />
              Create New Salesperson
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Add a new team member to your sales organization
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="max-w-4xl bg-gray-800 border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle>Salesperson Information</CardTitle>
            <CardDescription>
              Enter the details for the new salesperson. All fields with * are required.
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
                              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              data-testid="input-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Employee ID
                      </Label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Will be auto-generated (EMP-XXXX)
                        </span>
                      </div>
                    </div>
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
                              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        <FormItem className="col-span-2">
                          <FormLabel>Sales Regions</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Select
                                onValueChange={(value) => {
                                  const current = field.value || [];
                                  if (!current.includes(value)) {
                                    field.onChange([...current, value]);
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-white dark:bg-gray-700" data-testid="select-add-region">
                                  <SelectValue placeholder="Add a region" />
                                </SelectTrigger>
                                <SelectContent>
                                  {US_STATES
                                    .filter(state => !(field.value || []).includes(state.value))
                                    .map((state) => (
                                      <SelectItem key={state.value} value={state.value}>
                                        {state.label}
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                              
                              {/* Selected regions display */}
                              {field.value && field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {field.value.map((stateCode) => {
                                    const state = US_STATES.find(s => s.value === stateCode);
                                    return (
                                      <Badge
                                        key={stateCode}
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                                        data-testid={`badge-region-${stateCode}`}
                                      >
                                        {state?.label || stateCode}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                                          onClick={() => {
                                            const updated = (field.value || []).filter((code: string) => code !== stateCode);
                                            field.onChange(updated);
                                          }}
                                          data-testid={`button-remove-region-${stateCode}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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
                    onClick={() => navigate('/sales')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSalespersonMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="button-create-salesperson"
                  >
                    {createSalespersonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Salesperson
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