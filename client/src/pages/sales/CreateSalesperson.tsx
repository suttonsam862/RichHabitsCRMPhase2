
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, UserPlus, Loader2, Upload, X, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { US_STATES } from '@/constants/us-states';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const salespersonSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  territory: z.array(z.string()).optional(),
  hire_date: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional(),
});

const existingUserSchema = z.object({
  user_id: z.string().min(1, "Please select a user"),
  commission_rate: z.number().min(0).max(100).optional(),
  territory: z.array(z.string()).optional(),
  hire_date: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional(),
});

type SalespersonFormData = z.infer<typeof salespersonSchema>;
type ExistingUserFormData = z.infer<typeof existingUserSchema>;

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export default function CreateSalesperson() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("new");

  const newUserForm = useForm<SalespersonFormData>({
    resolver: zodResolver(salespersonSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      commission_rate: 0,
      territory: [],
      hire_date: "",
      performance_tier: 'standard',
    },
  });

  const existingUserForm = useForm<ExistingUserFormData>({
    resolver: zodResolver(existingUserSchema),
    defaultValues: {
      user_id: "",
      commission_rate: 0,
      territory: [],
      hire_date: "",
      performance_tier: 'standard',
    },
  });

  // Fetch existing users (staff and admin only)
  const { data: existingUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/v1/users/enhanced', 'staff'],
    queryFn: async () => {
      const response = await api.get('/api/v1/users/enhanced?type=staff&pageSize=100');
      if (response.success && response.data) {
        return response.data?.users || response.data || [];
      }
      return [];
    }
  });

  const createNewSalespersonMutation = useMutation({
    mutationFn: async (data: SalespersonFormData) => {
      // First create the user
      const userResponse = await api.post('/api/v1/users', {
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        role: 'sales' // Primary role for new users
      });

      if (!userResponse.success) {
        const errorMsg = userResponse.error?.message || 'Failed to create user';
        console.error('User creation failed:', userResponse);
        throw new Error(errorMsg);
      }

      // Then create their profile
      if (userResponse.data) {
        const profileResponse = await api.post(`/api/v1/sales/salespeople/${userResponse.data.id}/profile`, {
          commission_rate: data.commission_rate || 0,
          territory: data.territory,
          hire_date: data.hire_date,
          performance_tier: data.performance_tier,
        });
        
        if (!profileResponse.success) {
          const errorMsg = profileResponse.error?.message || 'Failed to create salesperson profile';
          console.error('Profile creation failed:', profileResponse);
          throw new Error(errorMsg);
        }
        
        return { user: userResponse.data, profile: profileResponse.data };
      }

      throw new Error('No user data returned from creation');
    },
    onSuccess: (data) => {
      toast({ 
        title: "Salesperson created successfully!", 
        description: `${data.user.full_name} has been added to the sales team.` 
      });
      // Invalidate all sales-related queries to refresh dashboard and list
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/enhanced'] });
      navigate('/sales');
    },
    onError: (error: any) => {
      console.error('Salesperson creation error:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || "Please try again.";
      toast({ 
        title: "Failed to create salesperson", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const addExistingSalespersonMutation = useMutation({
    mutationFn: async (data: ExistingUserFormData) => {
      // First, add sales to their subrole (stackable role)
      const userResponse = await api.patch(`/api/v1/users/${data.user_id}`, {
        subrole: 'salesperson' // Add stackable sales role
      });

      if (!userResponse.success) {
        const errorMsg = userResponse.error?.message || 'Failed to update user role';
        console.error('User role update failed:', userResponse);
        throw new Error(errorMsg);
      }

      // Then create their salesperson profile
      const profileResponse = await api.post(`/api/v1/sales/salespeople/${data.user_id}/profile`, {
        commission_rate: data.commission_rate || 0,
        territory: data.territory,
        hire_date: data.hire_date,
        performance_tier: data.performance_tier,
      });
      
      if (!profileResponse.success) {
        // Check if it's a duplicate profile error
        if (profileResponse.error?.message?.includes('already exists') || 
            profileResponse.error?.message?.includes('duplicate') ||
            profileResponse.error?.code === 'PROFILE_EXISTS') {
          throw new Error('A sales profile has already been created for this user.');
        }
        const errorMsg = profileResponse.error?.message || 'Failed to create salesperson profile';
        console.error('Profile creation failed:', profileResponse);
        throw new Error(errorMsg);
      }
      
      return { user: userResponse.data, profile: profileResponse.data };
    },
    onSuccess: (data) => {
      const selectedUser = existingUsers?.find((u: User) => u.id === existingUserForm.getValues('user_id'));
      toast({ 
        title: "Salesperson profile created successfully!", 
        description: `${selectedUser?.fullName} has been added to the sales team.` 
      });
      // Invalidate all sales-related queries to refresh dashboard and list
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/enhanced'] });
      navigate('/sales');
    },
    onError: (error: any) => {
      console.error('Salesperson profile creation error:', error);
      const errorMessage = error?.message || error?.response?.data?.error?.message || "Please try again.";
      toast({ 
        title: "Failed to create salesperson profile", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const onSubmitNewUser = (data: SalespersonFormData) => {
    createNewSalespersonMutation.mutate(data);
  };

  const onSubmitExistingUser = (data: ExistingUserFormData) => {
    addExistingSalespersonMutation.mutate(data);
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
              Add Salesperson
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Create a new user or add sales access to an existing staff member
            </p>
          </div>
        </div>

        {/* Form Tabs */}
        <Card className="max-w-4xl bg-gray-800 border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-white">Salesperson Setup</CardTitle>
            <CardDescription className="text-gray-300">
              Choose whether to create a new user or add sales access to an existing team member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="new" className="data-[state=active]:bg-blue-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New User
                </TabsTrigger>
                <TabsTrigger value="existing" className="data-[state=active]:bg-blue-600">
                  <Users className="h-4 w-4 mr-2" />
                  Select Existing User
                </TabsTrigger>
              </TabsList>

              {/* New User Tab */}
              <TabsContent value="new" className="space-y-6 mt-6">
                <Form {...newUserForm}>
                  <form onSubmit={newUserForm.handleSubmit(onSubmitNewUser)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Basic Information</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={newUserForm.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Full Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter full name"
                                  className="bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  data-testid="input-full-name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={newUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Email Address *</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter email address"
                                  className="bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  data-testid="input-email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={newUserForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter phone number"
                                  className="bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  data-testid="input-phone"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        <div>
                          <Label className="text-white font-medium">Employee ID</Label>
                          <Input
                            value="Will be auto-generated (EMP-XXXX)"
                            disabled
                            className="bg-white/5 border border-white/10 text-white/60 cursor-not-allowed"
                            data-testid="input-employee-id"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sales Configuration */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Sales Configuration</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={newUserForm.control}
                          name="commission_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Commission Rate (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="5.0"
                                  className="bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  data-testid="input-commission-rate"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={newUserForm.control}
                          name="territory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Sales Regions</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2 min-h-[50px] p-3 bg-white/5 border border-white/10 rounded-xl">
                                    {field.value?.map((state, index) => (
                                      <Badge
                                        key={index}
                                        className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
                                      >
                                        {state}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTerritories = field.value?.filter((_, i) => i !== index) || [];
                                            field.onChange(newTerritories);
                                          }}
                                          className="ml-2 text-cyan-300 hover:text-cyan-100"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  <Select
                                    value=""
                                    onValueChange={(value) => {
                                      if (value) {
                                        const current = field.value || [];
                                        if (!current.includes(value)) {
                                          field.onChange([...current, value]);
                                        }
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="bg-white/5 border border-white/10 text-white focus:border-cyan-500/50">
                                      <SelectValue placeholder="Add a region" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                      {US_STATES.filter(state => state && state.value && state.value.trim() !== '' && !field.value?.includes(state.value)).map((state) => (
                                        <SelectItem
                                          key={`state-${state.value}`}
                                          value={state.value}
                                          className="text-white hover:bg-white/10"
                                        >
                                          {state.name} ({state.value})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={newUserForm.control}
                          name="hire_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Hire Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  className="bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  data-testid="input-hire-date"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/sales')}
                        data-testid="button-cancel"
                        className="text-white border-gray-700 hover:bg-gray-800/50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createNewSalespersonMutation.isPending}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        data-testid="button-create-salesperson"
                      >
                        {createNewSalespersonMutation.isPending ? (
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
              </TabsContent>

              {/* Existing User Tab */}
              <TabsContent value="existing" className="space-y-6 mt-6">
                <Form {...existingUserForm}>
                  <form onSubmit={existingUserForm.handleSubmit(onSubmitExistingUser)} className="space-y-6">
                    {/* User Selection */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Select User</h3>

                      <FormField
                        control={existingUserForm.control}
                        name="user_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-medium">Choose User *</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-white/5 border border-white/10 text-white focus:border-cyan-500/50">
                                  <SelectValue placeholder="Select a user to add sales access" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                  {usersLoading ? (
                                    <SelectItem value="loading" disabled>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Loading users...
                                    </SelectItem>
                                  ) : existingUsers?.length ? (
                                    existingUsers.map((user: User) => (
                                      <SelectItem
                                        key={user.id}
                                        value={user.id}
                                        className="text-white hover:bg-white/10"
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>{user.fullName}</span>
                                          <div className="flex items-center space-x-2 ml-4">
                                            <Badge variant="outline" className="text-xs">
                                              {user.role}
                                            </Badge>
                                            <span className="text-gray-400 text-sm">{user.email}</span>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-users" disabled>
                                      No staff users available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Sales Configuration */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Sales Configuration</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={existingUserForm.control}
                          name="commission_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Commission Rate (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="5.0"
                                  className="bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={existingUserForm.control}
                          name="territory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Sales Regions</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2 min-h-[50px] p-3 bg-white/5 border border-white/10 rounded-xl">
                                    {field.value?.map((state, index) => (
                                      <Badge
                                        key={index}
                                        className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
                                      >
                                        {state}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTerritories = field.value?.filter((_, i) => i !== index) || [];
                                            field.onChange(newTerritories);
                                          }}
                                          className="ml-2 text-cyan-300 hover:text-cyan-100"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  <Select
                                    value=""
                                    onValueChange={(value) => {
                                      if (value) {
                                        const current = field.value || [];
                                        if (!current.includes(value)) {
                                          field.onChange([...current, value]);
                                        }
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="bg-white/5 border border-white/10 text-white focus:border-cyan-500/50">
                                      <SelectValue placeholder="Add a region" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                      {US_STATES.filter(state => state && state.value && state.value.trim() !== '' && !field.value?.includes(state.value)).map((state) => (
                                        <SelectItem
                                          key={`state-${state.value}`}
                                          value={state.value}
                                          className="text-white hover:bg-white/10"
                                        >
                                          {state.name} ({state.value})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={existingUserForm.control}
                          name="hire_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white font-medium">Sales Start Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  className="bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/sales')}
                        className="text-white border-gray-700 hover:bg-gray-800/50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={addExistingSalespersonMutation.isPending}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {addExistingSalespersonMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding Sales Access...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            Add Sales Access
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
