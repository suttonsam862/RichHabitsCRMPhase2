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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  User,
  AlertTriangle,
  X,
  Trash2
} from 'lucide-react';
import { US_STATES } from '@/constants/us-states';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

const editSalespersonSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  territory: z.array(z.string()).optional(),
  hire_date: z.string().optional(),
  performance_tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'standard']).optional(),
});

type EditSalespersonFormData = z.infer<typeof editSalespersonSchema>;

export default function EditSalesperson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      commission_rate: 0,
      territory: [],
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
        commission_rate: profile?.commission_rate ? (profile.commission_rate / 100) : 0,
        territory: Array.isArray(profile?.territory) ? profile.territory : (profile?.territory ? [profile.territory] : []),
        hire_date: profile?.hire_date ? profile.hire_date.split('T')[0] : "",
        performance_tier: (profile?.performance_tier as any) || 'standard',
      });
    }
  }, [salesperson, form]);

  const updateSalespersonMutation = useMutation({
    mutationFn: async (data: EditSalespersonFormData) => {
      try {
        // Update user information
        const userResponse = await api.patch(`/api/v1/users/${id}`, {
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
        });

        // Update profile information
        const profileResponse = await api.patch(`/api/v1/sales/salespeople/${id}/profile`, {
          commission_rate: (data.commission_rate || 0),
          territory: data.territory,
          hire_date: data.hire_date,
          performance_tier: data.performance_tier,
        });

        return { user: userResponse.data, profile: profileResponse.data };
      } catch (error) {
        console.error('Update error:', error);
        throw error;
      }
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

  const deleteSalespersonMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/api/v1/sales/salespeople/${id}`);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete salesperson');
      }
      return response;
    },
    onSuccess: () => {
      toast({ 
        title: "Salesperson deleted successfully!", 
        description: "The salesperson has been removed from the system." 
      });
      // Invalidate all sales-related queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/enhanced'] });
      navigate('/sales');
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete salesperson", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: EditSalespersonFormData) => {
    updateSalespersonMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteSalespersonMutation.mutate();
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Salesperson Not Found
            </h2>
            <p className="text-gray-300 mb-6">
              The salesperson you're trying to edit doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/sales')} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to={`/sales/${id}`}>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-blue-400 hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.profile_photo_url || undefined} alt={person.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
                {person.full_name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
                Edit Salesperson
              </h1>
              <p className="text-gray-300 mt-2">
                Update {person.full_name}'s information
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Update Salesperson Information</CardTitle>
            <CardDescription className="text-gray-400">
              Modify the details for this salesperson. All fields with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Basic Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Full Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter full name"
                              className="bg-gray-900 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                              data-testid="input-full-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter email address"
                              className="bg-gray-900 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
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
                          <FormLabel className="text-gray-200">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Enter phone number"
                              className="bg-gray-900 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                              data-testid="input-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-200">
                        Employee ID
                      </Label>
                      <div className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-md">
                        <span className="text-sm text-gray-100 font-mono">
                          {salesperson.data.profile?.employee_id || 'Not assigned yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Sales Configuration</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="commission_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="0"
                              className="bg-gray-900 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                              data-testid="input-commission-rate"
                              {...field}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="performance_tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Performance Tier</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 text-white border-gray-600" data-testid="select-performance-tier">
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              <SelectItem value="bronze" className="text-white hover:bg-gray-700">Bronze</SelectItem>
                              <SelectItem value="silver" className="text-white hover:bg-gray-700">Silver</SelectItem>
                              <SelectItem value="gold" className="text-white hover:bg-gray-700">Gold</SelectItem>
                              <SelectItem value="platinum" className="text-white hover:bg-gray-700">Platinum</SelectItem>
                              <SelectItem value="standard" className="text-white hover:bg-gray-700">Standard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="territory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Sales Regions</FormLabel>
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
                              <SelectTrigger className="bg-gray-900 text-white border-gray-600" data-testid="select-add-region">
                                <SelectValue placeholder="Add a region" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-600 max-h-[200px]">
                                {US_STATES.filter(state => state && state.value && state.value.trim() !== '' && !field.value?.includes(state.value)).map((state) => (
                                  <SelectItem
                                    key={`edit-state-${state.value}`}
                                    value={state.value}
                                    className="text-white hover:bg-gray-700"
                                  >
                                    {state.name} ({state.value})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Selected regions display */}
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {field.value?.map((stateCode, index) => {
                                  const stateInfo = US_STATES.find(state => state.value === stateCode);
                                  return (
                                    <Badge
                                      key={`edit-selected-${stateCode}-${index}`}
                                      className="bg-blue-500/20 text-blue-300 border-blue-500/30"
                                    >
                                      {stateInfo ? `${stateInfo.label} (${stateInfo.value})` : stateCode}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="ml-1 h-4 w-4 p-0 text-blue-300 hover:text-blue-100"
                                        onClick={() => {
                                          const newTerritories = field.value?.filter((_, i) => i !== index) || [];
                                          field.onChange(newTerritories);
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
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Hire Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-gray-900 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            data-testid="input-hire-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-600">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Salesperson
                  </Button>

                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/sales/${id}`)}
                      data-testid="button-cancel"
                      className="text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600"
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Salesperson
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Are you sure you want to delete <strong className="text-white">{person.full_name}</strong>? 
                This action cannot be undone and will remove all associated data including assignments and metrics.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSalespersonMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteSalespersonMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}