import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  MapPin, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Globe,
  ToggleLeft,
  ToggleRight,
  AlertTriangle
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
interface Region {
  id: string;
  name: string;
  code: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  created_at?: string; // Fallback for snake_case
  updated_at?: string; // Fallback for snake_case
}

interface ApiResponse<T> {
  success: boolean;
  data?: T[];
  regions?: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form schemas
const regionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(10, 'Code must be less than 10 characters').toUpperCase(),
  country: z.string().default('US'),
  isActive: z.boolean().default(true),
});

type RegionFormData = z.infer<typeof regionSchema>;

export default function RegionsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: regionsData, isLoading: isLoadingRegions } = useQuery<ApiResponse<Region>, any, Region[]>({
    queryKey: ['/api/v1/regions'],
    select: (res: ApiResponse<Region>) => {
      // Handle different response formats resilienctly
      if (Array.isArray(res)) return res;
      if (res?.data && Array.isArray(res.data)) return res.data;
      if (res?.regions && Array.isArray(res.regions)) return res.regions;
      return [];
    }
  });

  // Form setup
  const createForm = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
      code: '',
      country: 'US',
      isActive: true
    }
  });

  const editForm = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
      code: '',
      country: 'US',
      isActive: true
    }
  });

  // Mutations
  const createRegionMutation = useMutation({
    mutationFn: async (data: RegionFormData) => {
      return apiRequest('/api/v1/regions', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/regions'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Region created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create region",
        variant: "destructive"
      });
    }
  });

  const updateRegionMutation = useMutation({
    mutationFn: async ({ regionId, data }: { regionId: string; data: Partial<RegionFormData> }) => {
      return apiRequest(`/api/v1/regions/${regionId}`, {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/regions'] });
      setIsEditDialogOpen(false);
      setSelectedRegion(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Region updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update region",
        variant: "destructive"
      });
    }
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (regionId: string) => {
      return apiRequest(`/api/v1/regions/${regionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/regions'] });
      toast({
        title: "Success",
        description: "Region deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete region",
        variant: "destructive"
      });
    }
  });

  const toggleRegionMutation = useMutation({
    mutationFn: async (regionId: string) => {
      return apiRequest(`/api/v1/regions/${regionId}/toggle`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/regions'] });
      toast({
        title: "Success",
        description: "Region status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle region status",
        variant: "destructive"
      });
    }
  });

  // Filter regions
  const filteredRegions = regionsData?.filter((region: Region) => {
    const matchesSearch = !searchTerm || 
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = selectedCountry === 'all' || region.country === selectedCountry;
    
    return matchesSearch && matchesCountry;
  }) || [];

  // Handle edit region
  const handleEditRegion = (region: Region) => {
    setSelectedRegion(region);
    editForm.reset({
      name: region.name,
      code: region.code,
      country: region.country,
      isActive: region.isActive
    });
    setIsEditDialogOpen(true);
  };

  // Submit handlers
  const onCreateSubmit = (data: RegionFormData) => {
    createRegionMutation.mutate(data);
  };

  const onEditSubmit = (data: RegionFormData) => {
    if (!selectedRegion) return;
    updateRegionMutation.mutate({ regionId: selectedRegion.id, data });
  };

  // Get unique countries (with TypeScript compatibility)
  const uniqueCountries = Array.from(new Set(regionsData?.map((r: Region) => r.country).filter(Boolean) || []));

  // Region statistics
  const stats = {
    total: regionsData?.length || 0,
    active: regionsData?.filter((r: Region) => r.isActive).length || 0,
    inactive: regionsData?.filter((r: Region) => !r.isActive).length || 0,
    countries: uniqueCountries.length
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
                <p className="text-sm font-medium text-white">Total Regions</p>
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
                <p className="text-sm font-medium text-white">Countries</p>
                <p className="text-2xl font-bold text-white">{stats.countries}</p>
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
            placeholder="Search regions by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="input-search-regions"
          />
        </div>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="select-country-filter">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {uniqueCountries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white" data-testid="button-create-region">
              <Plus className="h-4 w-4 mr-2" />
              Add Region
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Region
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Create a new geographic region for your system
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Region Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., California" 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-region-name"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Region Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., CA" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-region-code"
                        />
                      </FormControl>
                      <FormDescription className="text-white/60">
                        Short code for the region (automatically capitalized)
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-region-country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

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
                    disabled={createRegionMutation.isPending}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                    data-testid="button-save-region"
                  >
                    {createRegionMutation.isPending ? 'Creating...' : 'Create Region'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Regions Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5" />
            Regions ({filteredRegions.length})
          </CardTitle>
          <CardDescription className="text-white/60">
            Manage geographic regions for your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRegions ? (
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
                    <TableHead className="text-white/70">Code</TableHead>
                    <TableHead className="text-white/70">Name</TableHead>
                    <TableHead className="text-white/70">Country</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Created</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((region: Region) => (
                    <TableRow 
                      key={region.id} 
                      className="border-white/10 hover:bg-white/5"
                      data-testid={`row-region-${region.id}`}
                    >
                      <TableCell>
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                          {region.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white" data-testid={`text-region-name-${region.id}`}>
                        {region.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-white/40" />
                          <span className="text-white/70">{region.country}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {region.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <Badge 
                            variant={region.isActive ? 'default' : 'secondary'}
                            className={region.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
                            data-testid={`status-region-${region.id}`}
                          >
                            {region.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {new Date(region.createdAt || region.created_at || Date.now()).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRegion(region)}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            data-testid={`button-edit-${region.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRegionMutation.mutate(region.id)}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                            data-testid={`button-toggle-${region.id}`}
                          >
                            {region.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                data-testid={`button-delete-${region.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-400" />
                                  Delete Region
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-white/60">
                                  Are you sure you want to delete "{region.name}" ({region.code})? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRegionMutation.mutate(region.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Delete Region
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

          {!isLoadingRegions && filteredRegions.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/60 text-lg">No regions found</p>
              <p className="text-white/40">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Edit Region Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Region - {selectedRegion?.name}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Update region information
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Region Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., California" 
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        data-testid="input-edit-region-name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Region Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., CA" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        data-testid="input-edit-region-code"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Country</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-edit-region-country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="MX">Mexico</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

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
                  disabled={updateRegionMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                  data-testid="button-save-edit"
                >
                  {updateRegionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}