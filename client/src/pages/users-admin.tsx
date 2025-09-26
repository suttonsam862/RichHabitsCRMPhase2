import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Plus,
  Edit2,
  Key,
  Shield,
  AlertCircle,
  Loader2,
  Copy,
  RotateCcw,
  UserPlus,
  UserMinus
} from 'lucide-react';

// Enhanced User interface with roles
interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    organizationId?: string;
    organizationName?: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Organization {
  id: string;
  name: string;
}

interface CreateUserData {
  email: string;
  fullName?: string;
  phone?: string;
  emailConfirm?: boolean;
}

interface UpdateUserData {
  email?: string;
  fullName?: string;
  phone?: string;
}

interface AssignRoleData {
  userId: string;
  roleId: string;
  organizationId?: string;
}

// Helper to format dates
function formatDateSafe(dateString?: string | null): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '—';
  }
}

export default function UsersAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [managingRolesUser, setManagingRolesUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string>('');
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    fullName: '',
    phone: '',
    emailConfirm: true
  });
  
  const [editForm, setEditForm] = useState<UpdateUserData>({
    email: '',
    fullName: '',
    phone: ''
  });

  // Fetch users with roles
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/v1/users'],
    queryFn: async () => {
      const result = await apiRequest('/api/v1/users');
      console.log("🔍 Users admin page API response:", result);
      return result;
    },
    staleTime: 30000,
  });

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => apiRequest('/api/roles'),
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch organizations for role assignment
  const { data: orgsData } = useQuery({
    queryKey: ['/api/v1/organizations'],
    queryFn: () => apiRequest('/api/v1/organizations'),
    staleTime: 300000,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserData) => 
      apiRequest('/api/v1/users', { method: 'POST', data: userData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ email: '', fullName: '', phone: '', emailConfirm: true });
      
      if (data.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
        toast({
          title: "User created successfully!",
          description: `Temporary password has been generated`,
          duration: 8000
        });
      } else {
        toast({
          title: "User created successfully!"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message || 'Failed to create user',
        variant: "destructive"
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, ...userData }: UpdateUserData & { userId: string }) =>
      apiRequest(`/api/v1/users/${userId}`, { method: 'PATCH', data: userData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      setEditingUser(null);
      setEditForm({ email: '', fullName: '', phone: '' });
      toast({
        title: "User updated successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.message || 'Failed to update user',
        variant: "destructive"
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/v1/users/${userId}/reset-password`, { method: 'POST' }),
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword || '');
      setResetPasswordUser(null);
      toast({
        title: "Password reset successfully!",
        description: "New temporary password has been generated",
        duration: 8000
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resetting password",
        description: error.message || 'Failed to reset password',
        variant: "destructive"
      });
    }
  });

  // Toggle user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiRequest(`/api/v1/users/${userId}`, { method: 'PATCH', data: { isActive } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "User status updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user status",
        description: error.message || 'Failed to update user status',
        variant: "destructive"
      });
    }
  });

  // Assign/revoke role mutations
  const assignRoleMutation = useMutation({
    mutationFn: (data: AssignRoleData) =>
      apiRequest('/api/user-roles', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "Role assigned successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error assigning role",
        description: error.message || 'Failed to assign role',
        variant: "destructive"
      });
    }
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId, organizationId }: AssignRoleData) =>
      apiRequest(`/api/user-roles/${userId}/${roleId}${organizationId ? `/${organizationId}` : ''}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "Role revoked successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error revoking role",
        description: error.message || 'Failed to revoke role',
        variant: "destructive"
      });
    }
  });

  // Event handlers
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(createForm);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, ...editForm });
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      fullName: user.fullName || '',
      phone: user.phone || ''
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Password copied successfully"
    });
  };

  if (usersLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading users: {(usersError as any)?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const users = usersData?.data || [];
  const roles = rolesData?.data || [];
  const organizations = orgsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            User Administration
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="create-user-description">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription id="create-user-description">
                Create a new user account with email confirmation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  data-testid="input-fullname"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  data-testid="input-phone"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="emailConfirm"
                  checked={createForm.emailConfirm}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, emailConfirm: checked })}
                  data-testid="switch-email-confirm"
                />
                <Label htmlFor="emailConfirm">Send email confirmation</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createUserMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Temporary Password Display */}
      {tempPassword && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Temporary Password:</strong> <code className="ml-2 font-mono bg-muted px-2 py-1 rounded">{tempPassword}</code>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(tempPassword)}
              data-testid="button-copy-password"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>
            Manage user accounts and their roles within the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
                          <AvatarFallback>
                            {(user.fullName || user.email)?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium" data-testid={`user-name-${user.id}`}>
                            {user.fullName || user.email}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`user-id-${user.id}`}>
                            ID: {user.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium" data-testid={`user-email-${user.id}`}>
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground" data-testid={`user-phone-${user.id}`}>
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1" data-testid={`user-roles-${user.id}`}>
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge key={`${role.id}-${role.organizationId || 'global'}`} variant="outline">
                              {role.name}
                              {role.organizationName && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  @ {role.organizationName}
                                </span>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => 
                            toggleUserStatusMutation.mutate({ userId: user.id, isActive: checked })
                          }
                          disabled={toggleUserStatusMutation.isPending}
                          data-testid={`switch-user-active-${user.id}`}
                        />
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {user.lastLogin ? (
                          <span data-testid={`user-last-login-${user.id}`}>
                            {formatDateSafe(user.lastLogin)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManagingRolesUser(user)}
                          data-testid={`button-manage-roles-${user.id}`}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetPasswordUser(user)}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent aria-describedby="edit-user-description">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription id="edit-user-description">
              Update user account information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div>
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                data-testid="input-edit-fullname"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                data-testid="input-edit-phone"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingUser(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent aria-describedby="reset-password-description">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription id="reset-password-description">
              Generate a new temporary password for {resetPasswordUser?.fullName || resetPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will generate a new temporary password and invalidate the current one.
                The user will need to use the new password to log in.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setResetPasswordUser(null)}
                data-testid="button-cancel-reset"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => resetPasswordUser && resetPasswordMutation.mutate(resetPasswordUser.id)}
                disabled={resetPasswordMutation.isPending}
                data-testid="button-confirm-reset"
              >
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={!!managingRolesUser} onOpenChange={() => setManagingRolesUser(null)}>
        <DialogContent className="max-w-2xl" aria-describedby="manage-roles-description">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription id="manage-roles-description">
              Assign and revoke roles for {managingRolesUser?.fullName || managingRolesUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Roles */}
            <div>
              <h4 className="font-medium mb-3">Current Roles</h4>
              <div className="space-y-2">
                {managingRolesUser?.roles.length ? (
                  managingRolesUser.roles.map((role) => (
                    <div key={`${role.id}-${role.organizationId || 'global'}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                        {role.organizationName && (
                          <p className="text-xs text-muted-foreground">Organization: {role.organizationName}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeRoleMutation.mutate({
                          userId: managingRolesUser.id,
                          roleId: role.id,
                          organizationId: role.organizationId
                        })}
                        disabled={revokeRoleMutation.isPending}
                        data-testid={`button-revoke-role-${role.id}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Assign New Role */}
            <div>
              <h4 className="font-medium mb-3">Assign New Role</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: Role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Organization (optional)</Label>
                  <Select>
                    <SelectTrigger data-testid="select-organization">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (no organization)</SelectItem>
                      {organizations.map((org: Organization) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                className="mt-4"
                disabled={assignRoleMutation.isPending}
                data-testid="button-assign-role"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            </div>

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setManagingRolesUser(null)}
                data-testid="button-close-roles"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}