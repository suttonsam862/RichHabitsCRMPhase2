import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { StaffCustomerTabs } from '@/components/users/StaffCustomerTabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Enhanced user interface 
interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'sales' | 'designer' | 'manufacturing' | 'customer';
  subrole?: 'salesperson' | 'designer' | 'manufacturer';
  organization_id?: string;
  job_title?: string;
  department?: string;
  avatar_url?: string;
  is_active: boolean;
  permissions?: Record<string, boolean>;
  page_access?: Record<string, boolean>;
  last_login?: string;
  created_at: string;
}

interface CreateUserFormData {
  email: string;
  fullName: string;
  phone: string;
  role: 'admin' | 'sales' | 'designer' | 'manufacturing' | 'customer';
  subrole?: 'salesperson' | 'designer' | 'manufacturer';
  jobTitle: string;
  department: string;
  organizationId: string;
  sendWelcomeEmail: boolean;
}

interface PermissionsFormData {
  permissions: Record<string, boolean>;
  pageAccess: Record<string, boolean>;
}

export default function EnhancedUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Form data
  const [createForm, setCreateForm] = useState<CreateUserFormData>({
    email: '',
    fullName: '',
    phone: '',
    role: 'customer',
    subrole: undefined,
    jobTitle: '',
    department: '',
    organizationId: '',
    sendWelcomeEmail: true
  });

  const [permissionsForm, setPermissionsForm] = useState<PermissionsFormData>({
    permissions: {},
    pageAccess: {}
  });

  // Queries
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['/api/users/enhanced'],
    queryFn: () => apiRequest('/api/users/enhanced'),
    staleTime: 30000
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserFormData) =>
      apiRequest('/api/users/enhanced', { method: 'POST', data: userData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/enhanced'] });
      setCreateDialogOpen(false);
      setCreateForm({
        email: '',
        fullName: '',
        phone: '',
        role: 'customer',
        subrole: undefined,
        jobTitle: '',
        department: '',
        organizationId: '',
        sendWelcomeEmail: true
      });
      
      // Show temporary password if it's a staff user
      if (data.temporaryPassword) {
        setTemporaryPassword(data.temporaryPassword);
        toast({
          title: "User created successfully!",
          description: `Temporary password: ${data.temporaryPassword}`,
          duration: 8000
        });
      } else {
        toast({
          title: "User created successfully!",
          description: "User has been created and can now log in.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || 'An error occurred while creating the user',
        variant: "destructive",
      });
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions, pageAccess }: { userId: string, permissions: Record<string, boolean>, pageAccess: Record<string, boolean> }) =>
      apiRequest(`/api/users/enhanced/${userId}/permissions`, { 
        method: 'PATCH', 
        data: { permissions, pageAccess } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/enhanced'] });
      setPermissionsDialogOpen(false);
      toast({
        title: "Permissions updated",
        description: "User permissions have been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error.message || 'An error occurred while updating permissions',
        variant: "destructive",
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/users/enhanced/${userId}/reset-password`, { method: 'POST' }),
    onSuccess: (data) => {
      setResetPasswordDialogOpen(false);
      setTemporaryPassword(data.temporaryPassword);
      toast({
        title: "Password reset successful",
        description: `New temporary password: ${data.temporaryPassword}`,
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || 'An error occurred while resetting password',
        variant: "destructive",
      });
    }
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/users/enhanced/${userId}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/enhanced'] });
      setDeactivateDialogOpen(false);
      toast({
        title: "User status updated",
        description: "User has been successfully deactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user status",
        description: error.message || 'An error occurred while updating user status',
        variant: "destructive",
      });
    }
  });

  // Event handlers
  const handleCreateUser = () => {
    setCreateDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleManagePermissions = async (user: User) => {
    setSelectedUser(user);
    try {
      const permissionsData = await apiRequest(`/api/users/enhanced/${user.id}/permissions`);
      setPermissionsForm({
        permissions: permissionsData.permissions || {},
        pageAccess: permissionsData.pageAccess || {}
      });
      setPermissionsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to load permissions",
        description: error.message || 'Could not load user permissions',
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleDeactivateUser = (user: User) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const submitCreateUser = () => {
    createUserMutation.mutate(createForm);
  };

  const submitUpdatePermissions = () => {
    if (!selectedUser) return;
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissions: permissionsForm.permissions,
      pageAccess: permissionsForm.pageAccess
    });
  };

  const submitResetPassword = () => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate(selectedUser.id);
  };

  const submitDeactivateUser = () => {
    if (!selectedUser) return;
    deactivateUserMutation.mutate(selectedUser.id);
  };

  // Get users from data
  const users: User[] = usersData?.users || [];

  return (
    <div className="container mx-auto p-6">
      <StaffCustomerTabs
        users={users}
        loading={isLoading}
        onCreateUser={handleCreateUser}
        onEditUser={handleEditUser}
        onManagePermissions={handleManagePermissions}
        onResetPassword={handleResetPassword}
        onDeactivateUser={handleDeactivateUser}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={createForm.role} 
                  onValueChange={(value: 'admin' | 'sales' | 'designer' | 'manufacturing' | 'customer') => 
                    setCreateForm({ ...createForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="sales">Sales Team</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {['sales', 'designer', 'manufacturing'].includes(createForm.role) && (
                <div>
                  <Label htmlFor="subrole">Subrole</Label>
                  <Select 
                    value={createForm.subrole || ''} 
                    onValueChange={(value: 'salesperson' | 'designer' | 'manufacturer') => 
                      setCreateForm({ ...createForm, subrole: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subrole" />
                    </SelectTrigger>
                    <SelectContent>
                      {createForm.role === 'sales' && (
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                      )}
                      {createForm.role === 'designer' && (
                        <SelectItem value="designer">Designer</SelectItem>
                      )}
                      {createForm.role === 'manufacturing' && (
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={createForm.jobTitle}
                  onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })}
                  placeholder="Sales Manager"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  placeholder="Sales"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sendWelcomeEmail"
                checked={createForm.sendWelcomeEmail}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, sendWelcomeEmail: checked })}
              />
              <Label htmlFor="sendWelcomeEmail">Send welcome email with login credentials</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitCreateUser} 
              disabled={createUserMutation.isPending || !createForm.email || !createForm.fullName}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for {selectedUser?.full_name}? 
              A new temporary password will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitResetPassword} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate User Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? 'Deactivate' : 'Reactivate'} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedUser?.is_active ? 'deactivate' : 'reactivate'} {selectedUser?.full_name}? 
              {selectedUser?.is_active ? 
                ' This will prevent them from logging in.' : 
                ' This will allow them to log in again.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDeactivateUser} disabled={deactivateUserMutation.isPending}>
              {deactivateUserMutation.isPending ? 
                'Updating...' : 
                (selectedUser?.is_active ? 'Deactivate' : 'Reactivate')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {temporaryPassword && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-green-600 font-medium">Temporary Password</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemporaryPassword('')}
                className="h-auto p-0 text-green-600"
              >
                ×
              </Button>
            </div>
            <div className="mt-1 font-mono text-sm bg-white px-2 py-1 rounded border">
              {temporaryPassword}
            </div>
            <div className="mt-2 text-xs text-green-600">
              Share this with the user for their first login.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}