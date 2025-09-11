import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash, Search, Package, DollarSign, Clock, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Schema for catalog item form
const catalogItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sportId: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.string().min(0, 'Price must be positive'),
  turnaroundDays: z.number().min(1, 'Turnaround days must be at least 1'),
  fabric: z.string().optional(),
  buildInstructions: z.string().optional(),
  moq: z.number().min(1, 'MOQ must be at least 1').optional(),
  care: z.string().optional(),
  manufacturerIds: z.array(z.string()).optional()
});

type CatalogItem = z.infer<typeof catalogItemSchema> & {
  id: string;
  category?: { id: string; name: string };
  sport?: { id: string; name: string };
  manufacturers?: Array<{ id: string; name: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export function CatalogManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const { toast } = useToast();

  // Fetch catalog items
  const { data: catalogItems = [], isLoading } = useQuery({
    queryKey: ['/api/v1/catalog', searchQuery, selectedSport, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedSport) params.append('sportId', selectedSport);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      params.append('limit', '100');
      
      const response = await fetch(`/api/v1/catalog?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch catalog items');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/v1/catalog/meta/categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/catalog/meta/categories', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch sports
  const { data: sports = [] } = useQuery({
    queryKey: ['/api/v1/sports'],
    queryFn: async () => {
      const response = await fetch('/api/v1/sports', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch sports');
      return response.json();
    }
  });

  // Fetch manufacturers
  const { data: manufacturers = [] } = useQuery({
    queryKey: ['/api/v1/manufacturers'],
    queryFn: async () => {
      const response = await fetch('/api/v1/manufacturers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Create catalog item mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof catalogItemSchema>) => 
      apiRequest('/api/v1/catalog', {
        method: 'POST',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/catalog'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Catalog item created successfully' });
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create catalog item', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Update catalog item mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof catalogItemSchema>> }) =>
      apiRequest(`/api/v1/catalog/${id}`, {
        method: 'PATCH',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/catalog'] });
      setIsEditDialogOpen(false);
      toast({ title: 'Catalog item updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update catalog item', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Delete catalog item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/catalog/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/catalog'] });
      toast({ title: 'Catalog item deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete catalog item', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Form for create/edit
  const form = useForm<z.infer<typeof catalogItemSchema>>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: {
      name: '',
      basePrice: '0',
      turnaroundDays: 7,
      moq: 1,
      manufacturerIds: []
    }
  });

  // Edit form
  const editForm = useForm<z.infer<typeof catalogItemSchema>>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: selectedItem || {
      name: '',
      basePrice: '0',
      turnaroundDays: 7,
      moq: 1
    }
  });


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Catalog Management</h1>
          <p className="text-muted-foreground mt-2">Manage your product catalog and templates</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-catalog-item"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Catalog Item
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search catalog items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger data-testid="select-sport">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sports</SelectItem>
                {sports.map((sport: any) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedSport('');
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalog Items ({catalogItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading catalog items...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No catalog items found
                    </TableCell>
                  </TableRow>
                ) : (
                  catalogItems.map((item: CatalogItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.category?.name || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.sport?.name || 'All Sports'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span>{parseFloat(item.basePrice || '0').toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{item.turnaroundDays || 7} days</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.moq || 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedItem(item);
                              editForm.reset({
                                name: item.name,
                                sportId: item.sport?.id,
                                categoryId: item.category?.id,
                                basePrice: item.basePrice || '0',
                                turnaroundDays: item.turnaroundDays || 7,
                                fabric: item.fabric || '',
                                buildInstructions: item.buildInstructions || '',
                                moq: item.moq || 1,
                                care: item.care || '',
                                manufacturerIds: item.manufacturers?.map((m: any) => m.id) || []
                              });
                              setIsEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this catalog item?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            data-testid={`button-delete-${item.id}`}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Catalog Item</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Custom Jersey" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category-create">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
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
                  name="sportId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sport-create">
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sports.map((sport: any) => (
                            <SelectItem key={sport.id} value={sport.id}>
                              {sport.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="turnaroundDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turnaround Days</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-turnaround" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-moq" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fabric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabric Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 100% Polyester moisture-wicking" data-testid="input-fabric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buildInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build Instructions</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Special instructions for manufacturing..." data-testid="textarea-instructions" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="care"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care Instructions</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Machine wash cold, tumble dry low" data-testid="input-care" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? 'Creating...' : 'Create Item'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Catalog Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: selectedItem.id, data }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" data-testid="input-edit-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="turnaroundDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turnaround Days</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-edit-turnaround" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="moq"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-edit-moq" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? 'Updating...' : 'Update Item'}
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