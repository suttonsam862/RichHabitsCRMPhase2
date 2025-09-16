import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { 
  Users, 
  Search, 
  Edit, 
  Shield, 
  UserCheck
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
import { Role, getUserRoleDisplayName, getRoleColor } from '@/auth/roles';

// Types based on server comprehensive.ts response
interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  notes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

// Form schemas - simplified to match server UpdateUserSchema
const editUserRoleSchema = z.object({
  role: z.enum(['admin', 'sales', 'designer', 'manufacturing', 'customer']),
  is_active: z.number().min(0).max(1).optional(),
});

type EditUserRoleFormData = z.infer<typeof editUserRoleSchema>;

export default function UserRolesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Queries - fix response format
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/v1/users/comprehensive'],
    select: (res) => Array.isArray(res) ? res : (Array.isArray((res as any).data) ? (res as any).data : [])
  });

  // Form setup - simplified
  const form = useForm<EditUserRoleFormData>({
    resolver: zodResolver(editUserRoleSchema),
    defaultValues: {
      role: 'customer',
      is_active: 1
    }
  });

  // Update user role mutation - fix endpoint
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserRoleFormData }) => {
      return apiRequest(`/api/v1/users/comprehensive/${userId}`, {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/comprehensive'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      form.reset();
      toast({
        title: "Success",
        description: "User role updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  });

  // Filter users based on search and role
  const filteredUsers = usersData?.filter((user: User) => {
    const matchesSearch = !searchTerm || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  }) || [];

  // Handle edit user - simplified form reset
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    form.reset({
      role: user.role as any,
      is_active: user.isActive ? 1 : 0
    });
    setIsEditDialogOpen(true);
  };


  // Submit form
  const onSubmit = (data: EditUserRoleFormData) => {
    if (!selectedUser) return;
    updateUserRoleMutation.mutate({ userId: selectedUser.id, data });
  };

  // Role statistics
  const roleStats = usersData?.reduce((acc: Record<string, number>, user: User) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(roleStats).map(([role, count]) => (
          <Card key={role} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getRoleColor(role as Role)}`} />
                <div>
                  <p className="text-sm font-medium text-white">{getUserRoleDisplayName(role as Role)}</p>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="input-search-users"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="select-role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Roles ({filteredUsers.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-white/10" />
                    <Skeleton className="h-3 w-1/4 bg-white/10" />
                  </div>
                  <Skeleton className="h-6 w-20 bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">User</TableHead>
                    <TableHead className="text-white/70">Role</TableHead>
                    <TableHead className="text-white/70">Organization</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Last Login</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow 
                      key={user.id} 
                      className="border-white/10 hover:bg-white/5"
                      data-testid={`row-user-${user.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white" data-testid={`text-username-${user.id}`}>{user.fullName}</p>
                            <p className="text-sm text-white/60">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getRoleColor(user.role as Role)} text-white border-0`}
                          data-testid={`badge-role-${user.id}`}
                        >
                          {getUserRoleDisplayName(user.role as Role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {user.organizationName || 'No Organization'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? 'default' : 'secondary'}
                          className={user.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}
                          data-testid={`status-user-${user.id}`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoadingUsers && filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/60 text-lg">No users found</p>
              <p className="text-white/40">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Edit User - {selectedUser?.fullName}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Modify user role and status. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Role Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Role Assignment
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">System Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-user-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="sales">Sales Representative</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-white/60">
                          The primary role determines system access and capabilities
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Account Status</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-user-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="0">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-white/60">
                          Active users can log in and use the system
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  data-testid="button-cancel-role-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserRoleMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                  data-testid="button-save-role"
                >
                  {updateUserRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}