import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Users, 
  UserCheck, 
  Settings,
  Shield,
  MoreVertical,
  Edit,
  Trash2,
  Key
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types for users with enhanced permissions
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

interface StaffCustomerTabsProps {
  users: User[];
  loading: boolean;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onManagePermissions: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeactivateUser: (user: User) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function StaffCustomerTabs({
  users,
  loading,
  onCreateUser,
  onEditUser,
  onManagePermissions,
  onResetPassword,
  onDeactivateUser,
  searchTerm,
  onSearchChange
}: StaffCustomerTabsProps) {
  const [activeTab, setActiveTab] = useState('staff');

  // Filter users by staff vs customer
  const staffUsers = users.filter(user => 
    ['admin', 'sales', 'designer', 'manufacturing'].includes(user.role)
  );
  
  const customerUsers = users.filter(user => user.role === 'customer');

  // Further filter by search term
  const filterUsers = (userList: User[]) => {
    if (!searchTerm) return userList;
    
    const term = searchTerm.toLowerCase();
    return userList.filter(user => 
      user.full_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.job_title && user.job_title.toLowerCase().includes(term))
    );
  };

  const filteredStaff = filterUsers(staffUsers);
  const filteredCustomers = filterUsers(customerUsers);

  const getRoleBadgeColor = (role: string, subrole?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'sales':
        return subrole === 'salesperson' 
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-blue-100 text-blue-800 border-blue-200';
      case 'designer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manufacturing':
        return subrole === 'manufacturer'
          ? 'bg-orange-100 text-orange-800 border-orange-200'
          : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'customer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRoleDisplay = (role: string, subrole?: string) => {
    if (subrole) {
      return `${role} (${subrole})`;
    }
    return role;
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const UserRow = ({ user }: { user: User }) => (
    <TableRow key={user.id}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.full_name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium">{user.full_name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline" 
          className={getRoleBadgeColor(user.role, user.subrole)}
        >
          {formatRoleDisplay(user.role, user.subrole)}
        </Badge>
      </TableCell>
      <TableCell>
        {user.job_title && (
          <div>
            <div className="font-medium">{user.job_title}</div>
            {user.department && (
              <div className="text-sm text-muted-foreground">{user.department}</div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {user.is_active ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Inactive</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatLastLogin(user.last_login)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditUser(user)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManagePermissions(user)}>
              <Shield className="w-4 h-4 mr-2" />
              Manage Permissions
            </DropdownMenuItem>
            {user.role !== 'customer' && (
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onDeactivateUser(user)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {user.is_active ? 'Deactivate' : 'Reactivate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage staff and customer accounts with detailed permission controls
          </p>
        </div>
        <Button onClick={onCreateUser}>
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Staff ({filteredStaff.length})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers ({filteredCustomers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? 'No staff users found matching your search.' : 'No staff users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((user) => <UserRow key={user.id} user={user} />)
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((user) => <UserRow key={user.id} user={user} />)
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}