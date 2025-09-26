import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  Settings,
  Key,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react';

interface UserDetails {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  subrole?: string;
  organizationId?: string;
  organizationName?: string;
  jobTitle?: string;
  department?: string;
  hireDate?: string;
  isActive: boolean;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  permissions?: Record<string, boolean>;
  pageAccess?: Record<string, boolean>;
  initialTempPassword?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: 'system' | 'custom' | 'role-based';
  permissions: Record<string, boolean>;
  page_access: Record<string, boolean>;
}

interface AvailablePermissions {
  actions: Record<string, Record<string, string>>;
  pages: Record<string, Record<string, string>>;
}

export default function ComprehensiveUserEditForm() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UserDetails | null>(null);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'customer',
    subrole: '',
    jobTitle: '',
    department: '',
    hireDate: '',
    isActive: true,
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    },
    permissions: {} as Record<string, boolean>,
    pageAccess: {} as Record<string, boolean>,
    notes: ''
  });

  useEffect(() => {
    if (id) {
      loadUserDetails();
      loadPermissionTemplates();
      loadAvailablePermissions();
    }
  }, [id]);

  const loadUserDetails = async () => {
    try {
      const result = await api.get(`/api/v1/users/enhanced/${id}`);
      if (result.success) {
        const userData = result.data;
        setUser(userData);
        setFormData({
          email: userData.email || '',
          fullName: userData.fullName || '',
          phone: userData.phone || '',
          role: userData.role || 'customer',
          subrole: userData.subrole || '',
          jobTitle: userData.jobTitle || '',
          department: userData.department || '',
          hireDate: userData.hireDate ? userData.hireDate.split('T')[0] : '',
          isActive: userData.isActive ?? true,
          address: {
            line1: userData.address?.line1 || '',
            line2: userData.address?.line2 || '',
            city: userData.address?.city || '',
            state: userData.address?.state || '',
            postalCode: userData.address?.postalCode || '',
            country: userData.address?.country || 'US'
          },
          permissions: userData.permissions || {},
          pageAccess: userData.pageAccess || {},
          notes: userData.notes || ''
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionTemplates = async () => {
    try {
      const result = await api.get('/api/v1/permission-templates?isActive=true');
      if (result.success) {
        setTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load permission templates:', error);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const result = await api.get('/api/v1/permission-templates/available-permissions');
      if (result.success) {
        setAvailablePermissions(result.data);
      }
    } catch (error) {
      console.error('Failed to load available permissions:', error);
    }
  };

  const applyTemplate = async (template: PermissionTemplate) => {
    try {
      const result = await api.post(`/api/v1/permission-templates/${template.id}/apply/${id}`, {});
      if (result.success) {
        toast({
          title: "Success",
          description: `Applied template "${template.name}" successfully`,
        });
        setFormData(prev => ({
          ...prev,
          permissions: template.permissions || {},
          pageAccess: template.page_access || {}
        }));
        setShowTemplateDialog(false);
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to apply template",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async () => {
    try {
      const result = await api.post(`/api/v1/users/enhanced/${id}/reset-password`, {});
      if (result.success) {
        toast({
          title: "Password Reset",
          description: `New password: ${result.data.temporaryPassword}`,
        });
        loadUserDetails(); // Reload to get new password
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const copyPassword = () => {
    if (user?.initialTempPassword) {
      navigator.clipboard.writeText(user.initialTempPassword);
      toast({
        title: "Password Copied",
        description: "The temporary password has been copied to your clipboard",
      });
    }
  };

  const saveUser = async () => {
    setSaving(true);
    try {
      const updateData = {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone || null,
        role: formData.role,
        subrole: formData.subrole || null,
        jobTitle: formData.jobTitle || null,
        department: formData.department || null,
        hireDate: formData.hireDate || null,
        isActive: formData.isActive,
        address: formData.address,
        permissions: formData.permissions,
        pageAccess: formData.pageAccess,
        notes: formData.notes || null
      };

      const result = await api.patch(`/api/v1/users/enhanced/${id}`, updateData);
      if (result.success) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        loadUserDetails(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to update user",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: checked
      }
    }));
  };

  const handlePageAccessChange = (pageKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      pageAccess: {
        ...prev.pageAccess,
        [pageKey]: checked
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
          <Link href="/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href={`/users/${id}`}>
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
              <h1 className="ml-4 text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Edit {user.fullName}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={user.isActive ? "default" : "destructive"}
                className={user.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button 
                onClick={saveUser}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="access">Page Access</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="contact">Contact</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Account Active</Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Address Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      value={formData.address.line1}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, line1: e.target.value }
                      }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="line2">Address Line 2</Label>
                    <Input
                      id="line2"
                      value={formData.address.line2}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, line2: e.target.value }
                      }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.address.state}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={formData.address.postalCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, postalCode: e.target.value }
                        }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Additional notes about this user..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Permissions */}
          <TabsContent value="permissions" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Shield className="h-5 w-5" />
                      Action Permissions
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Configure what actions this user can perform
                    </CardDescription>
                  </div>
                  
                  <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white/10">
                        Apply Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Apply Permission Template</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Select a template to apply its permissions to this user
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
                            onClick={() => applyTemplate(template)}
                            data-testid={`button-apply-template-${template.id}`}
                          >
                            <h4 className="font-medium text-white">{template.name}</h4>
                            <p className="text-sm text-white/60">{template.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {Object.keys(template.permissions || {}).length} actions
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Object.keys(template.page_access || {}).length} pages
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                          Cancel
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {availablePermissions?.actions && (
                  <div className="space-y-6">
                    {Object.entries(availablePermissions.actions).map(([category, actions]) => (
                      <div key={category} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <h4 className="font-medium text-white mb-3 capitalize">{category.toLowerCase()}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(actions).map(([action, permissionKey]) => (
                            <div key={permissionKey} className="flex items-center space-x-2">
                              <Checkbox
                                id={permissionKey}
                                checked={formData.permissions[permissionKey] || false}
                                onCheckedChange={(checked) => handlePermissionChange(permissionKey, checked as boolean)}
                              />
                              <Label htmlFor={permissionKey} className="text-white/80 text-sm">
                                {action.replace(/_/g, ' ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Page Access */}
          <TabsContent value="access" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5" />
                  Page Access Control
                </CardTitle>
                <CardDescription className="text-white/60">
                  Configure which pages and sections this user can access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availablePermissions?.pages && (
                  <div className="space-y-6">
                    {Object.entries(availablePermissions.pages).map(([category, pages]) => (
                      <div key={category} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <h4 className="font-medium text-white mb-3 capitalize">{category.toLowerCase()}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(pages).map(([page, pageKey]) => (
                            <div key={pageKey} className="flex items-center space-x-2">
                              <Checkbox
                                id={pageKey}
                                checked={formData.pageAccess[pageKey] || false}
                                onCheckedChange={(checked) => handlePageAccessChange(pageKey, checked as boolean)}
                              />
                              <Label htmlFor={pageKey} className="text-white/80 text-sm">
                                {page.replace(/_/g, ' ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Key className="h-5 w-5" />
                  Security & Password Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Generated Password */}
                {user.initialTempPassword && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-medium text-amber-400 mb-3">Current Generated Password</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 font-mono text-white bg-black/20 px-3 py-2 rounded">
                        {showPassword ? user.initialTempPassword : '••••••••••••'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="border-white/20 text-white/70 hover:bg-white/10"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPassword}
                        className="border-white/20 text-white/70 hover:bg-white/10"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Password Management */}
                <div className="flex gap-3">
                  <Button 
                    onClick={resetPassword}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Password
                  </Button>
                </div>

                {/* Account Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-white/80">Account Status</span>
                    <Badge 
                      variant={user.isActive ? "default" : "destructive"}
                      className={user.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}