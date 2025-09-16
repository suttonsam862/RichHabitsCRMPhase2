import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building,
  Loader2,
  UserPlus,
  Eye,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  isActive: boolean;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  lastLogin?: string;
  emailVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string; // Added jobTitle to the interface
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  recent: number;
  byRole: Record<string, number>;
}

const USER_ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'contact', label: 'Contact' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
];

export default function UsersManagement() {
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filters and pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'customer',
    password: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    notes: '',
    jobTitle: '' // Added jobTitle to formData
  });

  // Load users (show ALL users in the system)
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        q: search,
        type: 'all' // Explicitly request all users
      });

      const response = await api.get(`/api/v1/users/enhanced?${params}`);

      if (response.success) {
        let userData = response.data?.users || response.data || [];

        // Apply client-side filtering since endpoint doesn't support these filters yet
        if (roleFilter !== 'all') {
          userData = userData.filter((user: any) => user.role === roleFilter);
        }
        if (activeFilter !== 'all') {
          const isActiveFilter = activeFilter === '1';
          userData = userData.filter((user: any) => user.isActive === isActiveFilter);
        }

        setUsers(userData);
        setTotalUsers(userData.length);
      } else {
        throw new Error(response.error?.message || 'Failed to load users');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to load users',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load statistics (simplified since comprehensive stats not available)
  const loadStats = async () => {
    try {
      // Calculate basic stats from user list using consistent endpoint
      const response = await api.get('/api/v1/users/enhanced?type=all&pageSize=1000'); // Explicitly request all users
      if (response.success) {
        const users = response.data?.users || response.data || [];
        const totalUsers = users.length;
        const activeUsers = users.filter((u: any) => u.isActive).length;
        const recentUsers = users.filter((u: any) => {
          if (!u.createdAt) return false;
          const created = new Date(u.createdAt);
          if (isNaN(created.getTime())) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return created >= thirtyDaysAgo;
        }).length;

        // Count contacts (customer role users)
        const contactUsers = users.filter((u: any) => u.role === 'customer').length;

        setStats({
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          recent: recentUsers,
          byRole: { contact: contactUsers }
        });
      }
    } catch (error) {
      console.warn('Failed to load user stats:', error);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter, activeFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  // Create user
  const handleCreateUser = async () => {
    if (!formData.email || !formData.fullName) {
      toast({
        title: "Validation Error",
        description: "Email and full name are required",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const userData = {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone || undefined,
        role: formData.role || 'customer' // Include role in creation payload
      };

      const response = await api.post('/api/v1/users', userData);

      if (response.success) {
        toast({
          title: "Success",
          description: "User created successfully"
        });
        setShowCreateModal(false);
        resetForm();
        loadUsers();
        loadStats();
      } else {
        throw new Error(response.error?.message || 'Failed to create user');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create user',
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setUpdating(selectedUser.id);
    try {
      const updateData = {
        email: formData.email,
        fullName: formData.fullName, // Added fullName to updateData
        phone: formData.phone || undefined, // Added phone to updateData
        role: formData.role, // Added role to updateData
        jobTitle: formData.jobTitle || undefined, // Added jobTitle to updateData
        notes: formData.notes || undefined, // Added notes to updateData
        // Note: Standard users endpoint has limited PATCH support
        // Only email updates are currently supported via /api/v1/users/:id/email
        // For full user updates, we may need to use the comprehensive endpoint or extend the standard one
      };

      const response = await api.patch(`/api/v1/users/${selectedUser.id}`, updateData);

      if (response.success) {
        toast({
          title: "Success",
          description: "User updated successfully"
        });
        setShowEditModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        throw new Error(response.error?.message || 'Failed to update user');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to update user',
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  // Soft delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const response = await api.delete(`/api/v1/users/${userId}`);

      if (response.success) {
        toast({
          title: "Success",
          description: "User deactivated successfully"
        });
        loadUsers();
        loadStats();
      } else {
        throw new Error(response.error?.message || 'Failed to delete user');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to delete user',
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      phone: '',
      role: 'customer',
      password: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      notes: '',
      jobTitle: '' // Reset jobTitle
    });
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '',
      role: user.role || 'customer', // Ensure role always has a valid value
      password: '', // Don't pre-fill password
      addressLine1: user.address?.line1 || '',
      addressLine2: user.address?.line2 || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      postalCode: user.address?.postalCode || '',
      country: user.address?.country || 'US',
      notes: user.notes || '',
      jobTitle: user.jobTitle || '' // Initialize jobTitle in formData
    });
    setShowEditModal(true);
  };

  // Open view modal
  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Format role badge
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'staff': return 'default';
      case 'contact': return 'secondary';
      case 'customer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="w-8 h-8 mr-3 text-cyan-400" />
            Users Management
          </h1>
          <p className="text-white/70 mt-2">Manage all system users and contacts</p>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new user to the system
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-create-email"
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-create-fullname"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-create-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-create-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {USER_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle || ''}
                  onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="e.g., Sales Representative, Sales Manager"
                  data-testid="input-create-job-title"
                />
              </div>

              <div>
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Leave empty for auto-generated accounts"
                  data-testid="input-create-password"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  data-testid="input-create-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {setShowCreateModal(false); resetForm();}}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={creating}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-create-user"
              >
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-gray-400">Total Users</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-gray-400">Active Users</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.recent}</div>
            <div className="text-gray-400">Recent (30d)</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.byRole?.contact || 0}</div>
            <div className="text-gray-400">Sport Contacts</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
                data-testid="input-search-users"
              />
            </div>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 bg-gray-700 border-gray-600" data-testid="select-filter-role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All Roles</SelectItem>
              {USER_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-40 bg-gray-700 border-gray-600" data-testid="select-filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="1">Active</SelectItem>
              <SelectItem value="0">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-300">User</TableHead>
              <TableHead className="text-gray-300">Role</TableHead>
              <TableHead className="text-gray-300">Organization</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Created</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                  <div className="text-gray-400 mt-2">Loading users...</div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No users found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700/50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{user.fullName}</div>
                      <div className="text-sm text-gray-400 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-gray-400 flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1" />
                          {user.phone}
                        </div>
                      )}
                      {user.jobTitle && ( // Display job title
                        <div className="text-sm text-gray-400 flex items-center mt-1">
                          <Building className="w-3 h-3 mr-1" />
                          {user.jobTitle}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.organizationName ? (
                      <div className="flex items-center text-gray-300">
                        <Building className="w-3 h-3 mr-1" />
                        {user.organizationName}
                      </div>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link to={`/users/${user.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300"
                          data-testid={`button-view-user-${user.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/users/${user.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-400 hover:text-purple-300"
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="text-green-400 hover:text-green-300"
                        data-testid={`button-quick-edit-user-${user.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={!user.isActive}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalUsers > 20 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-white">
              Page {page} of {Math.ceil(totalUsers / 20)}
            </span>
            <Button
              variant="outline"
              disabled={page >= Math.ceil(totalUsers / 20)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user information
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  data-testid="input-edit-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  data-testid="input-edit-fullname"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {USER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-jobTitle">Job Title</Label>
              <Input
                id="edit-jobTitle"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                className="bg-gray-800 border-gray-600"
                placeholder="e.g., Sales Representative, Sales Manager"
                data-testid="input-edit-job-title"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="bg-gray-800 border-gray-600"
                data-testid="input-edit-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={updating === selectedUser?.id}
              className="bg-cyan-600 hover:bg-cyan-700"
              data-testid="button-update-user"
            >
              {updating === selectedUser?.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              View complete user information
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <div className="text-white">{selectedUser.email}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Full Name</Label>
                  <div className="text-white">{selectedUser.fullName}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Phone</Label>
                  <div className="text-white">{selectedUser.phone || 'Not provided'}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Role</Label>
                  <div>
                    <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Organization</Label>
                  <div className="text-white">{selectedUser.organizationName || 'None'}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Status</Label>
                  <div>
                    <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {selectedUser.jobTitle && ( // Display job title in view modal
                  <div>
                    <Label className="text-gray-400">Job Title</Label>
                    <div className="text-white">{selectedUser.jobTitle}</div>
                  </div>
                )}
              </div>

              {selectedUser.notes && (
                <div>
                  <Label className="text-gray-400">Notes</Label>
                  <div className="text-white bg-gray-800 p-3 rounded">{selectedUser.notes}</div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  <Label className="text-gray-400">Created</Label>
                  <div>{new Date(selectedUser.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-gray-400">Last Updated</Label>
                  <div>{new Date(selectedUser.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}