import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash, Search, Factory, Mail, Phone, MapPin, Clock, Package, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Schema for manufacturer form
const manufacturerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Must be a valid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minimumOrderQuantity: z.union([z.number().int().positive(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string' && val === '') return undefined;
    if (typeof val === 'string') return parseInt(val);
    return val;
  }),
  leadTimeDays: z.union([z.number().int().positive(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string' && val === '') return undefined;
    if (typeof val === 'string') return parseInt(val);
    return val;
  }),
  isActive: z.boolean().optional()
});

type Manufacturer = {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  specialties?: string[];
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Common specialties for manufacturers
const COMMON_SPECIALTIES = [
  'Screen Printing',
  'Embroidery',
  'Sublimation',
  'Heat Transfer',
  'Direct-to-Garment',
  'Vinyl Cutting',
  'Jerseys',
  'Team Uniforms',
  'Promotional Items',
  'Custom Apparel',
  'Sportswear',
  'Corporate Apparel',
  'Athletic Wear',
  'Accessories'
];

export function ManufacturerManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('true');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
  const { toast } = useToast();

  // Fetch manufacturers
  const { data: manufacturers = [], isLoading } = useQuery({
    queryKey: ['/api/v1/manufacturers', searchQuery, filterSpecialty, filterActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterSpecialty && filterSpecialty !== 'all') params.append('specialty', filterSpecialty);
      params.append('isActive', filterActive);
      params.append('limit', '100');
      
      const response = await fetch(`/api/v1/manufacturers?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch manufacturers');
      return response.json();
    }
  });

  // Fetch unique specialties
  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['/api/v1/manufacturers/meta/specialties'],
    queryFn: async () => {
      const response = await fetch('/api/v1/manufacturers/meta/specialties', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) return COMMON_SPECIALTIES;
      return response.json();
    }
  });

  // Create manufacturer mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof manufacturerSchema>) => 
      apiRequest('/api/v1/manufacturers', {
        method: 'POST',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/manufacturers'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Manufacturer created successfully' });
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create manufacturer', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    }
  });

  // Update manufacturer mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof manufacturerSchema>> }) =>
      apiRequest(`/api/v1/manufacturers/${id}`, {
        method: 'PATCH',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/manufacturers'] });
      setIsEditDialogOpen(false);
      toast({ title: 'Manufacturer updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update manufacturer', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Delete manufacturer mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/manufacturers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/manufacturers'] });
      toast({ title: 'Manufacturer deactivated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to deactivate manufacturer', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Form for create
  const form = useForm<z.infer<typeof manufacturerSchema>>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      name: '',
      contactEmail: '',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      specialties: [],
      minimumOrderQuantity: '',
      leadTimeDays: '',
      isActive: true
    }
  });

  // Edit form
  const editForm = useForm<z.infer<typeof manufacturerSchema>>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      name: '',
      contactEmail: '',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      specialties: [],
      minimumOrderQuantity: '',
      leadTimeDays: '',
      isActive: true
    }
  });

  const handleSpecialtyToggle = (spec: string, isEdit = false) => {
    if (isEdit) {
      const current = editForm.getValues('specialties') || [];
      if (current.includes(spec)) {
        editForm.setValue('specialties', current.filter(s => s !== spec));
      } else {
        editForm.setValue('specialties', [...current, spec]);
      }
    } else {
      const current = form.getValues('specialties') || [];
      if (current.includes(spec)) {
        form.setValue('specialties', current.filter(s => s !== spec));
      } else {
        form.setValue('specialties', [...current, spec]);
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manufacturer Management</h1>
          <p className="text-muted-foreground mt-2">Manage your production partners and capabilities</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-manufacturer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Manufacturer
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search manufacturers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger data-testid="select-specialty">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {allSpecialties.map((spec: string) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
                <SelectItem value="all">All Manufacturers</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setFilterSpecialty('all');
                setFilterActive('true');
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacturers ({manufacturers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading manufacturers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Specialties</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manufacturers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No manufacturers found
                    </TableCell>
                  </TableRow>
                ) : (
                  manufacturers.map((manufacturer: Manufacturer) => (
                    <TableRow key={manufacturer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-muted-foreground" />
                          {manufacturer.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {manufacturer.contactEmail && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${manufacturer.contactEmail}`} className="text-blue-600 hover:underline">
                                {manufacturer.contactEmail}
                              </a>
                            </div>
                          )}
                          {manufacturer.contactPhone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {manufacturer.contactPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {manufacturer.city && manufacturer.state && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {manufacturer.city}, {manufacturer.state}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {manufacturer.specialties?.slice(0, 2).map(spec => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {manufacturer.specialties && manufacturer.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{manufacturer.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {manufacturer.minimumOrderQuantity && (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span>{manufacturer.minimumOrderQuantity}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {manufacturer.leadTimeDays && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{manufacturer.leadTimeDays} days</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {manufacturer.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedManufacturer(manufacturer);
                              editForm.reset({
                                name: manufacturer.name,
                                contactEmail: manufacturer.contactEmail || '',
                                contactPhone: manufacturer.contactPhone || '',
                                addressLine1: manufacturer.addressLine1 || '',
                                addressLine2: manufacturer.addressLine2 || '',
                                city: manufacturer.city || '',
                                state: manufacturer.state || '',
                                postalCode: manufacturer.postalCode || '',
                                country: manufacturer.country || '',
                                specialties: manufacturer.specialties || [],
                                minimumOrderQuantity: manufacturer.minimumOrderQuantity || '',
                                leadTimeDays: manufacturer.leadTimeDays || '',
                                isActive: manufacturer.isActive ?? true
                              });
                              setIsEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-${manufacturer.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Are you sure you want to deactivate this manufacturer?')) {
                                deleteMutation.mutate(manufacturer.id);
                              }
                            }}
                            data-testid={`button-delete-${manufacturer.id}`}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Manufacturer</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Premium Sports Apparel Co." data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contact@manufacturer.com" data-testid="input-email" />
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
                          <Input {...field} placeholder="(555) 123-4567" data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="address" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Manufacturing St" data-testid="input-address1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="addressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Suite 100" data-testid="input-address2" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Los Angeles" data-testid="input-city" />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="CA" data-testid="input-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="90001" data-testid="input-postal" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="USA" data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="capabilities" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="specialties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturing Specialties</FormLabel>
                        <FormDescription>Select all that apply</FormDescription>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {COMMON_SPECIALTIES.map(spec => (
                            <div
                              key={spec}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                field.value?.includes(spec) 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => handleSpecialtyToggle(spec)}
                              data-testid={`spec-${spec.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {spec}
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minimumOrderQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="e.g., 50"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                              data-testid="input-min-order"
                            />
                          </FormControl>
                          <FormDescription>Minimum units per order</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="leadTimeDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Time (Days)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="e.g., 14"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                              data-testid="input-lead-time"
                            />
                          </FormControl>
                          <FormDescription>Production time in days</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                            data-testid="checkbox-active"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active Manufacturer</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? 'Creating...' : 'Create Manufacturer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Manufacturer</DialogTitle>
          </DialogHeader>
          {selectedManufacturer && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: selectedManufacturer.id, data }))} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-edit-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="address" className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-address1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="addressLine2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-address2" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-postal" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-country" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="capabilities" className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="specialties"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturing Specialties</FormLabel>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {COMMON_SPECIALTIES.map(spec => (
                              <div
                                key={spec}
                                className={`p-2 border rounded cursor-pointer transition-colors ${
                                  field.value?.includes(spec) 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'hover:bg-muted'
                                }`}
                                onClick={() => handleSpecialtyToggle(spec, true)}
                                data-testid={`edit-spec-${spec.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {spec}
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="minimumOrderQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Order Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                                data-testid="input-edit-min-order"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="leadTimeDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Time (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                                data-testid="input-edit-lead-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                              data-testid="checkbox-edit-active"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Active Manufacturer</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? 'Updating...' : 'Update Manufacturer'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManufacturerManagement;