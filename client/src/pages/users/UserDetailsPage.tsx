import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Key,
  Settings,
  Check,
  X,
  Loader2
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
  lastLogin?: string;
  emailVerified: boolean;
  notes?: string;
  permissions?: Record<string, boolean>;
  pageAccess?: Record<string, boolean>;
  initialTempPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<{ permissions: Record<string, boolean>; pageAccess: Record<string, boolean> } | null>(null);

  useEffect(() => {
    if (id) {
      loadUserDetails();
      loadUserPermissions();
    }
  }, [id]);

  const loadUserDetails = async () => {
    try {
      const result = await api.get(`/api/v1/users/enhanced/${id}`);
      if (result.success) {
        setUser(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to load user details",
          variant: "destructive",
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

  const loadUserPermissions = async () => {
    try {
      const result = await api.get(`/api/v1/users/enhanced/${id}/permissions`);
      if (result.success) {
        setPermissions(result.data);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
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

  const resetPassword = async () => {
    if (!user?.id) return;
    
    try {
      const result = await api.post(`/api/v1/users/enhanced/${user.id}/reset-password`, {});
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
          <p className="text-white/60 mb-4">The user you're looking for doesn't exist.</p>
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
              <Link href="/users">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
              <Separator orientation="vertical" className="mx-4 h-8 bg-white/10" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {user.fullName}
                </h1>
                <p className="text-sm text-white/60">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={user.isActive ? "default" : "destructive"}
                className={user.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/70">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="access">Page Access</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white/70">Full Name</Label>
                    <p className="text-white font-medium">{user.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-white/70">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-white/60" />
                      <p className="text-white">{user.email}</p>
                      {user.emailVerified && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </div>
                  {user.phone && (
                    <div>
                      <Label className="text-white/70">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-white/60" />
                        <p className="text-white">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  {user.jobTitle && (
                    <div>
                      <Label className="text-white/70">Job Title</Label>
                      <p className="text-white">{user.jobTitle}</p>
                    </div>
                  )}
                  {user.department && (
                    <div>
                      <Label className="text-white/70">Department</Label>
                      <p className="text-white">{user.department}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              {(user.address.line1 || user.address.city) && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <MapPin className="h-5 w-5" />
                      Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-white/80">
                      {user.address.line1 && <p>{user.address.line1}</p>}
                      {user.address.line2 && <p>{user.address.line2}</p>}
                      <p>
                        {[user.address.city, user.address.state, user.address.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {user.address.country && <p>{user.address.country}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Role Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-white/70">Role</Label>
                    <p className="text-white font-medium">{user.role}</p>
                  </div>
                  {user.subrole && (
                    <div>
                      <Label className="text-white/70">Subrole</Label>
                      <p className="text-white">{user.subrole}</p>
                    </div>
                  )}
                  {user.organizationName && (
                    <div>
                      <Label className="text-white/70">Organization</Label>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-white/60" />
                        <p className="text-white">{user.organizationName}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-white/70">Last Login</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white/60" />
                      <p className="text-white">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Account Created</Label>
                    <p className="text-white">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {user.notes && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80">{user.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5" />
                  User Permissions
                </CardTitle>
                <CardDescription className="text-white/60">
                  Action-level permissions for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissions?.permissions && Object.keys(permissions.permissions).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(permissions.permissions).map(([permission, enabled]) => (
                      <div key={permission} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-white/80 text-sm font-medium">
                          {permission.replace(/\./g, ' → ')}
                        </span>
                        {enabled ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <X className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60">No specific permissions assigned</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5" />
                  Page Access Control
                </CardTitle>
                <CardDescription className="text-white/60">
                  Pages and sections this user can access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissions?.pageAccess && Object.keys(permissions.pageAccess).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(permissions.pageAccess).map(([page, enabled]) => (
                      <div key={page} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-white/80 text-sm font-medium">
                          {page.replace(/page\./g, '').replace(/\./g, ' → ')}
                        </span>
                        {enabled ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <X className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60">No specific page access defined</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Key className="h-5 w-5" />
                  Security Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Generated Password */}
                {user.initialTempPassword && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-medium text-amber-400 mb-2">Initial Generated Password</h4>
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
                    <p className="text-amber-400/80 text-sm mt-2">
                      This is the system-generated password for this user. Share securely.
                    </p>
                  </div>
                )}

                {/* Password Actions */}
                <div className="flex gap-3">
                  <Button 
                    onClick={resetPassword}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>

                {/* Security Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-white/80">Email Verified</span>
                    {user.emailVerified ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
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