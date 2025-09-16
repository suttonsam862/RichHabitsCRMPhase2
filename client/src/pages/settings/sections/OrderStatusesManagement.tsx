import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  BarChart3, 
  Edit, 
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Package,
  Palette,
  Wrench,
  Target,
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

// Types for different status entities
interface OrderStatus {
  id: string;
  code: string;
  name: string;
  color?: string;
  sortOrder: number;
  isTerminal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface StatusTypeConfig {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  endpoint: string;
  description: string;
}

// Form schema for editing status
const editStatusSchema = z.object({
  sortOrder: z.number().int().min(0, 'Sort order must be 0 or greater'),
  isTerminal: z.boolean()
});

type EditStatusFormData = z.infer<typeof editStatusSchema>;

export default function OrderStatusesManagement() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Configuration for different status types
  const statusTypes: StatusTypeConfig[] = [
    {
      id: 'orders',
      name: 'Order Statuses',
      icon: Package,
      color: 'blue',
      endpoint: '/api/v1/order-status/orders',
      description: 'Main order workflow statuses'
    },
    {
      id: 'order-items',
      name: 'Order Item Statuses',
      icon: CheckCircle2,
      color: 'green',
      endpoint: '/api/v1/order-status/order-items',
      description: 'Individual item statuses within orders'
    },
    {
      id: 'design-jobs',
      name: 'Design Job Statuses',
      icon: Palette,
      color: 'purple',
      endpoint: '/api/v1/order-status/design-jobs',
      description: 'Design and artwork process statuses'
    },
    {
      id: 'work-orders',
      name: 'Work Order Statuses',
      icon: Wrench,
      color: 'orange',
      endpoint: '/api/v1/order-status/work-orders',
      description: 'Production workflow statuses'
    }
  ];

  // Form setup
  const editForm = useForm<EditStatusFormData>({
    resolver: zodResolver(editStatusSchema),
    defaultValues: {
      sortOrder: 0,
      isTerminal: false
    }
  });

  // Queries for each status type
  const useStatusQuery = (endpoint: string) => {
    return useQuery({
      queryKey: [endpoint],
      select: (data: unknown) => {
        // Handle different response shapes
        return Array.isArray(data) ? data : (data as any)?.data || [];
      }
    });
  };

  // Get current status data based on active tab
  const currentConfig = statusTypes.find(type => type.id === activeTab)!;
  const { data: statusData, isLoading: isLoadingStatuses } = useStatusQuery(currentConfig.endpoint);

  // Update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ endpoint, code, data }: { endpoint: string; code: string; data: Partial<EditStatusFormData> }) => {
      return apiRequest(`${endpoint}/${code}`, {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      // Invalidate all status queries
      statusTypes.forEach(type => {
        queryClient.invalidateQueries({ queryKey: [type.endpoint] });
      });
      setIsEditDialogOpen(false);
      setSelectedStatus(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  });

  // Handle edit status
  const handleEditStatus = (status: OrderStatus) => {
    setSelectedStatus(status);
    editForm.reset({
      sortOrder: status.sortOrder,
      isTerminal: status.isTerminal
    });
    setIsEditDialogOpen(true);
  };

  // Submit handler
  const onEditSubmit = (data: EditStatusFormData) => {
    if (!selectedStatus) return;
    updateStatusMutation.mutate({ 
      endpoint: currentConfig.endpoint, 
      code: selectedStatus.code, 
      data 
    });
  };

  // Get status statistics for current tab
  const getStatusStats = (statuses: OrderStatus[]) => {
    const total = statuses?.length || 0;
    const terminal = statuses?.filter(s => s.isTerminal).length || 0;
    const active = total - terminal;
    
    return { total, terminal, active };
  };

  const currentStats = getStatusStats(statusData || []);

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Order Status Management</h2>
            <p className="text-white/60">Configure workflow statuses and progression rules</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium text-white">Total Statuses</p>
                  <p className="text-2xl font-bold text-white">{currentStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium text-white">Active Statuses</p>
                  <p className="text-2xl font-bold text-white">{currentStats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-white">Terminal Statuses</p>
                  <p className="text-2xl font-bold text-white">{currentStats.terminal}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border-white/10">
          {statusTypes.map((type) => {
            const Icon = type.icon;
            return (
              <TabsTrigger
                key={type.id}
                value={type.id}
                className="flex items-center gap-2 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500"
                data-testid={`tab-${type.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Status Tables for each type */}
        {statusTypes.map((type) => (
          <TabsContent key={type.id} value={type.id} className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <type.icon className="h-5 w-5" />
                  {type.name}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStatuses ? (
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
                          <TableHead className="text-white/70">Sort Order</TableHead>
                          <TableHead className="text-white/70">Type</TableHead>
                          <TableHead className="text-white/70">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusData?.map((status: OrderStatus) => (
                          <TableRow 
                            key={status.id} 
                            className="border-white/10 hover:bg-white/5"
                            data-testid={`row-status-${status.id}`}
                          >
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`border-${type.color}-500/30 text-${type.color}-400 bg-${type.color}-500/10`}
                              >
                                {status.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-white" data-testid={`text-status-name-${status.id}`}>
                              {status.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <ArrowUpDown className="h-4 w-4 text-white/40" />
                                <span className="text-white/70">{status.sortOrder}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {status.isTerminal ? (
                                  <>
                                    <Target className="h-4 w-4 text-red-400" />
                                    <Badge className="bg-red-500 text-white" data-testid={`type-status-${status.id}`}>
                                      Terminal
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-4 w-4 text-blue-400" />
                                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10" data-testid={`type-status-${status.id}`}>
                                      Active
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStatus(status)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                data-testid={`button-edit-${status.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!isLoadingStatuses && (!statusData || statusData.length === 0) && (
                  <div className="text-center py-8">
                    <type.icon className="h-12 w-12 mx-auto text-white/20 mb-4" />
                    <p className="text-white/60 text-lg">No {type.name.toLowerCase()} found</p>
                    <p className="text-white/40">Status records will appear here when available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Status Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Status - {selectedStatus?.name}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Update status configuration and workflow settings
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                        data-testid="input-sort-order"
                      />
                    </FormControl>
                    <FormDescription className="text-white/60">
                      Determines the display order in workflow lists
                    </FormDescription>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isTerminal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-4 bg-white/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Terminal Status</FormLabel>
                      <FormDescription className="text-white/60">
                        Mark this status as a final state in the workflow
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-terminal"
                      />
                    </FormControl>
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
                  disabled={updateStatusMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                  data-testid="button-save-status"
                >
                  {updateStatusMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}