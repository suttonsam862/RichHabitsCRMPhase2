import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Award, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ArrowUpDown,
  Percent,
  Star
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Types
interface PerformanceTier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  commissionMultiplier: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  data?: T;
  tiers?: T;
}

// Form schemas
const tierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  commissionMultiplier: z.number().min(0.1, 'Commission multiplier must be at least 0.1').max(10.0, 'Commission multiplier must be at most 10.0'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0, 'Sort order must be 0 or greater').default(0)
});

type TierFormData = z.infer<typeof tierSchema>;

export default function PerformanceTiersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<PerformanceTier | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: tiersData, isLoading: isLoadingTiers } = useQuery({
    queryKey: ['/api/v1/performance-tiers'],
    select: (res: unknown) => {
      // Resilient response handling
      const r = res as ApiResponse<{ tiers: PerformanceTier[] }>;
      return Array.isArray(res) 
        ? res 
        : Array.isArray(r?.tiers) 
          ? r.tiers 
          : Array.isArray(r?.data?.tiers) 
            ? r.data.tiers 
            : Array.isArray(r?.data) 
              ? r.data 
              : [];
    }
  });

  // Form setup
  const createForm = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      commissionMultiplier: 1.0,
      isActive: true,
      sortOrder: 0
    }
  });

  const editForm = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      commissionMultiplier: 1.0,
      isActive: true,
      sortOrder: 0
    }
  });

  // Mutations
  const createTierMutation = useMutation({
    mutationFn: async (data: TierFormData) => {
      return apiRequest('/api/v1/performance-tiers', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance-tiers'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Performance tier created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create performance tier",
        variant: "destructive"
      });
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: Partial<TierFormData> }) => {
      return apiRequest(`/api/v1/performance-tiers/${tierId}`, {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance-tiers'] });
      setIsEditDialogOpen(false);
      setSelectedTier(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Performance tier updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update performance tier",
        variant: "destructive"
      });
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return apiRequest(`/api/v1/performance-tiers/${tierId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance-tiers'] });
      toast({
        title: "Success",
        description: "Performance tier deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete performance tier",
        variant: "destructive"
      });
    }
  });

  const toggleTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return apiRequest(`/api/v1/performance-tiers/${tierId}/toggle`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance-tiers'] });
      toast({
        title: "Success",
        description: "Performance tier status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle tier status",
        variant: "destructive"
      });
    }
  });

  // Filter tiers
  const filteredTiers = tiersData?.filter((tier: PerformanceTier) => {
    const matchesSearch = !searchTerm || 
      tier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tier.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && tier.isActive) ||
      (selectedStatus === 'inactive' && !tier.isActive);
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Handle edit tier
  const handleEditTier = (tier: PerformanceTier) => {
    setSelectedTier(tier);
    editForm.reset({
      name: tier.name,
      slug: tier.slug,
      description: tier.description || '',
      commissionMultiplier: tier.commissionMultiplier,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder
    });
    setIsEditDialogOpen(true);
  };

  // Submit handlers
  const onCreateSubmit = (data: TierFormData) => {
    createTierMutation.mutate(data);
  };

  const onEditSubmit = (data: TierFormData) => {
    if (!selectedTier) return;
    updateTierMutation.mutate({ tierId: selectedTier.id, data });
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Performance tier statistics
  const stats = {
    total: tiersData?.length || 0,
    active: tiersData?.filter((t: PerformanceTier) => t.isActive).length || 0,
    inactive: tiersData?.filter((t: PerformanceTier) => !t.isActive).length || 0,
    avgMultiplier: tiersData?.length 
      ? (tiersData.reduce((sum, t: PerformanceTier) => sum + t.commissionMultiplier, 0) / tiersData.length).toFixed(2)
      : '0.00'
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium text-white">Total Tiers</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium text-white">Active</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <div>
                <p className="text-sm font-medium text-white">Inactive</p>
                <p className="text-2xl font-bold text-white">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-sm font-medium text-white">Avg Multiplier</p>
                <p className="text-2xl font-bold text-white">{stats.avgMultiplier}x</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
          <Input
            placeholder="Search tiers by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="input-search-tiers"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white" data-testid="button-create-tier">
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>

          {/* Create Tier Dialog */}
          <DialogContent className="max-w-lg bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Performance Tier
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Create a new performance tier with commission multiplier
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Tier Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Gold Tier" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            // Auto-generate slug
                            const slugValue = generateSlug(e.target.value);
                            createForm.setValue('slug', slugValue);
                          }}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-tier-name"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Slug</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., gold-tier" 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-tier-slug"
                        />
                      </FormControl>
                      <FormDescription className="text-white/60">
                        URL-friendly identifier (auto-generated from name)
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe this performance tier..." 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
                          data-testid="input-tier-description"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="commissionMultiplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Commission Multiplier</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10.0"
                            placeholder="1.0" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            data-testid="input-tier-multiplier"
                          />
                        </FormControl>
                        <FormDescription className="text-white/60">
                          0.1x to 10.0x multiplier
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Sort Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            data-testid="input-tier-sort-order"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTierMutation.isPending}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                    data-testid="button-save-tier"
                  >
                    {createTierMutation.isPending ? 'Creating...' : 'Create Tier'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Tiers Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Award className="h-5 w-5" />
            Performance Tiers ({filteredTiers.length})
          </CardTitle>
          <CardDescription className="text-white/60">
            Manage salesperson performance tier options with commission multipliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTiers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-6 w-20 bg-white/10" />
                  <Skeleton className="h-4 w-32 bg-white/10 flex-1" />
                  <Skeleton className="h-6 w-16 bg-white/10" />
                  <Skeleton className="h-8 w-24 bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">Name</TableHead>
                    <TableHead className="text-white/70">Slug</TableHead>
                    <TableHead className="text-white/70">Multiplier</TableHead>
                    <TableHead className="text-white/70">Sort Order</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Created</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTiers.map((tier: PerformanceTier) => (
                    <TableRow 
                      key={tier.id} 
                      className="border-white/10 hover:bg-white/5"
                      data-testid={`row-tier-${tier.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <div>
                            <div className="font-medium text-white" data-testid={`text-tier-name-${tier.id}`}>
                              {tier.name}
                            </div>
                            {tier.description && (
                              <div className="text-sm text-white/60 truncate max-w-xs">
                                {tier.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                          {tier.slug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-4 w-4 text-green-400" />
                          <span className="text-green-400 font-mono font-semibold">
                            {tier.commissionMultiplier}x
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ArrowUpDown className="h-4 w-4 text-white/40" />
                          <span className="text-white/70">{tier.sortOrder}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tier.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <Badge 
                            variant={tier.isActive ? 'default' : 'secondary'}
                            className={tier.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
                            data-testid={`status-tier-${tier.id}`}
                          >
                            {tier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {new Date(tier.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTier(tier)}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            data-testid={`button-edit-${tier.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTierMutation.mutate(tier.id)}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                            data-testid={`button-toggle-${tier.id}`}
                          >
                            {tier.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                data-testid={`button-delete-${tier.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-400" />
                                  Delete Performance Tier
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-white/60">
                                  Are you sure you want to delete "{tier.name}"? This action cannot be undone and may affect existing salesperson assignments.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTierMutation.mutate(tier.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Delete Tier
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoadingTiers && filteredTiers.length === 0 && (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/60 text-lg">No performance tiers found</p>
              <p className="text-white/40">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Performance Tier - {selectedTier?.name}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Update performance tier information
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Tier Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Gold Tier" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          // Auto-generate slug
                          const slugValue = generateSlug(e.target.value);
                          editForm.setValue('slug', slugValue);
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        data-testid="input-edit-tier-name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Slug</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., gold-tier" 
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        data-testid="input-edit-tier-slug"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this performance tier..." 
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
                        data-testid="input-edit-tier-description"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="commissionMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Commission Multiplier</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10.0"
                          placeholder="1.0" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-edit-tier-multiplier"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-edit-tier-sort-order"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTierMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                  data-testid="button-save-edit"
                >
                  {updateTierMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}