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
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Key, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Database,
  Lock,
  Unlock,
  Filter
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
interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  data?: T;
  settings?: T;
}

// Form schemas
const settingSchema = z.object({
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  key: z.string().min(1, 'Key is required').max(100, 'Key must be less than 100 characters'),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.any())
  ]).refine((val, ctx) => {
    const dataType = ctx.parent?.dataType;
    if (dataType === 'number') {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a valid number'
        });
        return false;
      }
    } else if (dataType === 'json') {
      if (typeof val === 'string') {
        try {
          JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Value must be valid JSON'
          });
          return false;
        }
      }
    }
    return true;
  }, 'Invalid value for data type'),
  dataType: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isActive: z.boolean().default(true)
});

type SettingFormData = z.infer<typeof settingSchema>;

export default function AccessSettingsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/v1/system-settings'],
    select: (res: unknown) => {
      // Resilient response handling
      const r = res as ApiResponse<{ settings: SystemSetting[] }>;
      return Array.isArray(res) 
        ? res 
        : Array.isArray(r?.settings) 
          ? r.settings 
          : Array.isArray(r?.data?.settings) 
            ? r.data.settings 
            : Array.isArray(r?.data) 
              ? r.data 
              : [];
    }
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['/api/v1/system-settings/categories'],
    select: (r: unknown) => {
      // Handle API wrapper response
      return Array.isArray(r) ? r : Array.isArray((r as any)?.data) ? (r as any).data : [];
    }
  });

  // Form setup
  const createForm = useForm<SettingFormData>({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      category: '',
      key: '',
      value: '',
      dataType: 'string',
      description: '',
      isActive: true
    }
  });

  const editForm = useForm<SettingFormData>({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      category: '',
      key: '',
      value: '',
      dataType: 'string',
      description: '',
      isActive: true
    }
  });

  // Mutations
  const createSettingMutation = useMutation({
    mutationFn: async (data: SettingFormData) => {
      const processedData = {
        ...data,
        value: processValueByDataType(data.value, data.dataType)
      };
      return apiRequest('/api/v1/system-settings', {
        method: 'POST',
        data: processedData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings/categories'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "System setting created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create system setting",
        variant: "destructive"
      });
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingId, data }: { settingId: string; data: Partial<SettingFormData> }) => {
      const processedData = data.value !== undefined ? {
        ...data,
        value: processValueByDataType(data.value, data.dataType || 'string')
      } : data;
      return apiRequest(`/api/v1/system-settings/${settingId}`, {
        method: 'PATCH',
        data: processedData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings/categories'] });
      setIsEditDialogOpen(false);
      setSelectedSetting(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "System setting updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system setting",
        variant: "destructive"
      });
    }
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (settingId: string) => {
      return apiRequest(`/api/v1/system-settings/${settingId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings/categories'] });
      toast({
        title: "Success",
        description: "System setting deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete system setting",
        variant: "destructive"
      });
    }
  });

  const toggleSettingMutation = useMutation({
    mutationFn: async (settingId: string) => {
      return apiRequest(`/api/v1/system-settings/${settingId}/toggle`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/system-settings'] });
      toast({
        title: "Success",
        description: "System setting status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle setting status",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const processValueByDataType = (value: any, dataType: string) => {
    switch (dataType) {
      case 'number':
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) {
          throw new Error('Value must be a valid number');
        }
        return num;
      case 'boolean':
        return Boolean(value);
      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            throw new Error('Value must be valid JSON');
          }
        }
        return value;
      default:
        return String(value);
    }
  };

  const formatValue = (value: any, dataType: string) => {
    switch (dataType) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'number':
        return String(value);
      default:
        return String(value);
    }
  };

  const getValueForForm = (value: any, dataType: string) => {
    switch (dataType) {
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'boolean':
        return Boolean(value);
      default:
        return String(value);
    }
  };

  // Filter settings
  const filteredSettings = settingsData?.filter((setting: SystemSetting) => {
    const matchesSearch = !searchTerm || 
      setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (setting.description && setting.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && setting.isActive) ||
      (selectedStatus === 'inactive' && !setting.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  // Handle edit setting
  const handleEditSetting = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    editForm.reset({
      category: setting.category,
      key: setting.key,
      value: getValueForForm(setting.value, setting.dataType),
      dataType: setting.dataType,
      description: setting.description || '',
      isActive: setting.isActive
    });
    setIsEditDialogOpen(true);
  };

  // Submit handlers
  const onCreateSubmit = (data: SettingFormData) => {
    createSettingMutation.mutate(data);
  };

  const onEditSubmit = (data: SettingFormData) => {
    if (!selectedSetting) return;
    updateSettingMutation.mutate({ settingId: selectedSetting.id, data });
  };

  // Get unique categories from data
  const uniqueCategories = [...new Set(settingsData?.map((s: SystemSetting) => s.category) || [])];
  const allCategories = categoriesData || uniqueCategories;

  // System setting statistics
  const stats = {
    total: settingsData?.length || 0,
    active: settingsData?.filter((s: SystemSetting) => s.isActive).length || 0,
    inactive: settingsData?.filter((s: SystemSetting) => !s.isActive).length || 0,
    categories: uniqueCategories.length
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('security') || lowerCategory.includes('auth')) return Shield;
    if (lowerCategory.includes('api') || lowerCategory.includes('key')) return Key;
    if (lowerCategory.includes('database') || lowerCategory.includes('db')) return Database;
    return Settings;
  };

  // Get data type badge color
  const getDataTypeBadgeColor = (dataType: string) => {
    switch (dataType) {
      case 'string': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'number': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'boolean': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'json': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">System Settings Management</h2>
          <p className="text-white/60">Configure security, authentication, and system behavior settings</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium text-white">Total Settings</p>
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
                <p className="text-sm font-medium text-white">Categories</p>
                <p className="text-2xl font-bold text-white">{stats.categories}</p>
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
            placeholder="Search settings by key, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="input-search-settings"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white" data-testid="button-create-setting">
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </DialogTrigger>

          {/* Create Setting Dialog */}
          <DialogContent className="max-w-lg bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New System Setting
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Create a new system configuration setting
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., security" 
                            {...field}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            data-testid="input-setting-category"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Key</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., max_login_attempts" 
                            {...field}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            data-testid="input-setting-key"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Data Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-setting-data-type">
                            <SelectValue placeholder="Select data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Value</FormLabel>
                      <FormControl>
                        {createForm.watch('dataType') === 'boolean' ? (
                          <Switch
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            data-testid="switch-setting-value"
                          />
                        ) : createForm.watch('dataType') === 'json' ? (
                          <Textarea
                            placeholder="Enter JSON value..."
                            {...field}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 font-mono"
                            data-testid="textarea-setting-value"
                          />
                        ) : (
                          <Input 
                            placeholder="Enter value..." 
                            {...field}
                            type={createForm.watch('dataType') === 'number' ? 'number' : 'text'}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            data-testid="input-setting-value"
                          />
                        )}
                      </FormControl>
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
                          placeholder="Describe this setting..." 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
                          data-testid="textarea-setting-description"
                        />
                      </FormControl>
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
                    disabled={createSettingMutation.isPending}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                    data-testid="button-save-setting"
                  >
                    {createSettingMutation.isPending ? 'Creating...' : 'Create Setting'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Settings Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            System Settings ({filteredSettings.length})
          </CardTitle>
          <CardDescription className="text-white/60">
            Manage system configuration, security, and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings ? (
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
                    <TableHead className="text-white/70">Category</TableHead>
                    <TableHead className="text-white/70">Key</TableHead>
                    <TableHead className="text-white/70">Value</TableHead>
                    <TableHead className="text-white/70">Type</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.map((setting: SystemSetting) => {
                    const CategoryIcon = getCategoryIcon(setting.category);
                    return (
                      <TableRow 
                        key={setting.id} 
                        className="border-white/10 hover:bg-white/5"
                        data-testid={`row-setting-${setting.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-cyan-400" />
                            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                              {setting.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white" data-testid={`text-setting-key-${setting.id}`}>
                          <div>
                            <div>{setting.key}</div>
                            {setting.description && (
                              <div className="text-sm text-white/60 truncate max-w-xs">
                                {setting.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate font-mono text-sm text-white/80">
                            {formatValue(setting.value, setting.dataType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getDataTypeBadgeColor(setting.dataType)}
                          >
                            {setting.dataType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {setting.isActive ? (
                              <Unlock className="h-4 w-4 text-green-400" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                            <Badge 
                              variant={setting.isActive ? 'default' : 'secondary'}
                              className={setting.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
                              data-testid={`status-setting-${setting.id}`}
                            >
                              {setting.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSetting(setting)}
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              data-testid={`button-edit-${setting.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSettingMutation.mutate(setting.id)}
                              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                              data-testid={`button-toggle-${setting.id}`}
                            >
                              {setting.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  data-testid={`button-delete-${setting.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-gray-900 border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                    Delete System Setting
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-white/60">
                                    Are you sure you want to delete "{setting.category}.{setting.key}"? This action cannot be undone and may affect system behavior.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSettingMutation.mutate(setting.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Delete Setting
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoadingSettings && filteredSettings.length === 0 && (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/60 text-lg">No system settings found</p>
              <p className="text-white/40">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Setting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit System Setting - {selectedSetting?.key}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Update system configuration setting
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Category</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., security" 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-edit-setting-category"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Key</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., max_login_attempts" 
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-edit-setting-key"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Data Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-edit-setting-data-type">
                          <SelectValue placeholder="Select data type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Value</FormLabel>
                    <FormControl>
                      {editForm.watch('dataType') === 'boolean' ? (
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-setting-value"
                        />
                      ) : editForm.watch('dataType') === 'json' ? (
                        <Textarea
                          placeholder="Enter JSON value..."
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 font-mono"
                          data-testid="textarea-edit-setting-value"
                        />
                      ) : (
                        <Input 
                          placeholder="Enter value..." 
                          {...field}
                          type={editForm.watch('dataType') === 'number' ? 'number' : 'text'}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          data-testid="input-edit-setting-value"
                        />
                      )}
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
                        placeholder="Describe this setting..." 
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
                        data-testid="textarea-edit-setting-description"
                      />
                    </FormControl>
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
                  disabled={updateSettingMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                  data-testid="button-save-edit"
                >
                  {updateSettingMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}