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
import { Plus, Edit, Trash, Search, Palette, DollarSign, Globe, User, CheckCircle, XCircle } from 'lucide-react';
import { sb } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Schema for designer form
const designerSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  specializations: z.array(z.string()).optional(),
  portfolioUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  hourlyRate: z.string().optional(),
  isActive: z.boolean().optional()
});

type Designer = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  specializations?: string[];
  portfolioUrl?: string;
  hourlyRate?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Common specializations
const COMMON_SPECIALIZATIONS = [
  'Jersey Design',
  'Logo Design',
  'Team Uniforms',
  'Custom Apparel',
  'Embroidery Design',
  'Screen Printing',
  'Sublimation Design',
  'Sports Graphics',
  'Brand Identity',
  'Merchandise Design'
];

export function DesignerManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('true');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch designers
  const { data: designers = [], isLoading } = useQuery({
    queryKey: ['/api/v1/designers', searchQuery, filterSpecialization, filterActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterSpecialization && filterSpecialization !== 'all') params.append('specialization', filterSpecialization);
      params.append('isActive', filterActive);
      params.append('limit', '100');
      
      const response = await fetch(`/api/v1/designers?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch designers');
      return response.json();
    }
  });

  // Fetch users (for creating new designers)
  const { data: users = [] } = useQuery({
    queryKey: ['/api/v1/users/enhanced'],
    queryFn: async () => {
      let headers: Record<string, string> = {};
      
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      
      const response = await fetch('/api/v1/users/enhanced?type=all&pageSize=100', {
        headers: headers
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data?.users || result.data || result || [];
    }
  });

  // Fetch unique specializations
  const { data: allSpecializations = [] } = useQuery({
    queryKey: ['/api/v1/designers/meta/specializations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/designers/meta/specializations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) return COMMON_SPECIALIZATIONS;
      return response.json();
    }
  });

  // Create designer mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof designerSchema>) => 
      apiRequest('/api/v1/designers', {
        method: 'POST',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/designers'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Designer created successfully' });
      form.reset();
      setSelectedSpecializations([]);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create designer', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    }
  });

  // Update designer mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof designerSchema>> }) =>
      apiRequest(`/api/v1/designers/${id}`, {
        method: 'PATCH',
        data: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/designers'] });
      setIsEditDialogOpen(false);
      toast({ title: 'Designer updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update designer', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Delete designer mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/designers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/designers'] });
      toast({ title: 'Designer deactivated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to deactivate designer', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Form for create
  const form = useForm<z.infer<typeof designerSchema>>({
    resolver: zodResolver(designerSchema),
    defaultValues: {
      userId: '',
      specializations: [],
      portfolioUrl: '',
      hourlyRate: '',
      isActive: true
    }
  });

  // Edit form
  const editForm = useForm<z.infer<typeof designerSchema>>({
    resolver: zodResolver(designerSchema),
    defaultValues: selectedDesigner ? {
      userId: selectedDesigner.userId,
      specializations: selectedDesigner.specializations || [],
      portfolioUrl: selectedDesigner.portfolioUrl || '',
      hourlyRate: selectedDesigner.hourlyRate || '',
      isActive: selectedDesigner.isActive
    } : {}
  });

  const handleSpecializationToggle = (spec: string, isEdit = false) => {
    if (isEdit) {
      const current = editForm.getValues('specializations') || [];
      if (current.includes(spec)) {
        editForm.setValue('specializations', current.filter(s => s !== spec));
      } else {
        editForm.setValue('specializations', [...current, spec]);
      }
    } else {
      const current = form.getValues('specializations') || [];
      if (current.includes(spec)) {
        form.setValue('specializations', current.filter(s => s !== spec));
      } else {
        form.setValue('specializations', [...current, spec]);
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Designer Management</h1>
          <p className="text-muted-foreground mt-2">Manage your design team and specializations</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-designer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Designer
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search designers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
              <SelectTrigger data-testid="select-specialization">
                <SelectValue placeholder="All Specializations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                {allSpecializations.map((spec: string) => (
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
                <SelectItem value="all">All Designers</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setFilterSpecialization('all');
                setFilterActive('true');
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Designers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Designers ({designers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading designers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specializations</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No designers found
                    </TableCell>
                  </TableRow>
                ) : (
                  designers.map((designer: Designer) => (
                    <TableRow key={designer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {designer.name}
                        </div>
                      </TableCell>
                      <TableCell>{designer.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {designer.specializations?.slice(0, 3).map(spec => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {designer.specializations && designer.specializations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{designer.specializations.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {designer.hourlyRate && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span>{designer.hourlyRate}/hr</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {designer.portfolioUrl && (
                          <a 
                            href={designer.portfolioUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            Portfolio
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        {designer.isActive ? (
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
                              setSelectedDesigner(designer);
                              editForm.reset({
                                userId: designer.userId,
                                specializations: designer.specializations || [],
                                portfolioUrl: designer.portfolioUrl || '',
                                hourlyRate: designer.hourlyRate || '',
                                isActive: designer.isActive
                              });
                              setIsEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-${designer.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Are you sure you want to deactivate this designer?')) {
                                deleteMutation.mutate(designer.id);
                              }
                            }}
                            data-testid={`button-delete-${designer.id}`}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Designer Profile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select User</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName || user.email}
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
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="e.g., 75.00" data-testid="input-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio URL</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://portfolio.example.com" data-testid="input-portfolio" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {COMMON_SPECIALIZATIONS.map(spec => (
                        <div
                          key={spec}
                          className={`p-2 border rounded cursor-pointer transition-colors ${
                            field.value?.includes(spec) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSpecializationToggle(spec)}
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
                    <FormLabel className="!mt-0">Active Designer</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? 'Creating...' : 'Create Designer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Designer Profile</DialogTitle>
          </DialogHeader>
          {selectedDesigner && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: selectedDesigner.id, data }))} className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Editing: {selectedDesigner.name}
                </div>

                <FormField
                  control={editForm.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-edit-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="portfolioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" data-testid="input-edit-portfolio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="specializations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specializations</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {COMMON_SPECIALIZATIONS.map(spec => (
                          <div
                            key={spec}
                            className={`p-2 border rounded cursor-pointer transition-colors ${
                              field.value?.includes(spec) 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => handleSpecializationToggle(spec, true)}
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
                      <FormLabel className="!mt-0">Active Designer</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? 'Updating...' : 'Update Designer'}
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

export default DesignerManagement;