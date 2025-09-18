import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
  DollarSign,
  Target,
  Award,
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
  Calendar,
  Briefcase,
  Star,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import GlowCard from '@/components/ui/GlowCard';

interface Salesperson {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  organization_id?: string;
  profile?: SalespersonProfile;
  assignments: number;
  active_assignments: number;
}

interface SalespersonProfile {
  id: string;
  employee_id?: string;
  tax_id?: string;
  commission_rate: number;
  territory?: string;
  hire_date?: string;
  manager_id?: string;
  performance_tier: string;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  id: string;
  salesperson_id: string;
  organization_id: string;
  sport_id: string;
  team_name: string;
  is_active: boolean;
  assigned_at: string;
  notes?: string;
  organization_name?: string;
  sport_name?: string;
}

interface SalespersonDetails {
  users: Salesperson;
  salesperson_profiles?: SalespersonProfile;
  assignments: Assignment[];
  metrics: SalespersonMetric[];
}

interface SalespersonMetric {
  id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  orders_count: number;
  conversion_rate: number;
  average_deal_size: number;
  commission_earned: number;
  active_assignments: number;
}

interface DashboardData {
  overview: {
    total_salespeople: number;
    active_assignments: number;
    total_orders: number;
    total_revenue: number;
  };
  top_performers: {
    salesperson_id: string;
    full_name: string;
    total_sales: number;
    orders_count: number;
    commission_earned: number;
  }[];
}

const PERFORMANCE_TIERS = [
  { value: 'bronze', label: 'Bronze', color: 'bg-orange-100 text-orange-800' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-100 text-gray-800' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'platinum', label: 'Platinum', color: 'bg-purple-100 text-purple-800' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800' }
];

export default function SalesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    employee_id: '',
    tax_id: '',
    commission_rate: 0,
    territory: '',
    hire_date: '',
    manager_id: '',
    performance_tier: 'standard'
  });

  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    organization_id: '',
    sport_id: '',
    team_name: '',
    notes: ''
  });

  // Queries
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/v1/sales/dashboard', selectedPeriod],
    queryFn: async () => {
      const response = await api.get(`/api/v1/sales/dashboard?period=${selectedPeriod}`);
      return response; // Server returns direct data, not wrapped in .data
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time KPIs
    staleTime: 5000 // Consider data fresh for 5 seconds only
  });

  const { data: salespeople, isLoading: salespeopleLoading } = useQuery<Salesperson[]>({
    queryKey: ['/api/v1/sales/salespeople'],
    queryFn: async () => {
      const response = await api.get('/api/v1/sales/salespeople');
      console.log('📊 Salespeople data received:', response);
      
      if (!Array.isArray(response)) {
        console.error('❌ Expected array but got:', typeof response, response);
        return [];
      }
      
      return response.map((person: any) => ({
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        phone: person.phone,
        organization_id: person.organization_id,
        profile: person.profile,
        assignments: person.assignments || 0,
        active_assignments: person.active_assignments || 0
      }));
    },
    refetchInterval: 10000, // Refresh more frequently to catch changes
    staleTime: 5000 // Consider data fresh for 5 seconds only
  });

  const { data: salespersonDetails } = useQuery<SalespersonDetails>({
    queryKey: ['/api/v1/sales/salespeople', selectedSalesperson],
    queryFn: async () => {
      const response = await api.get(`/api/v1/sales/salespeople/${selectedSalesperson}`);
      return response; // Server returns direct data, not wrapped in .data
    },
    enabled: !!selectedSalesperson
  });

  // Query for all assignments across all salespeople
  const { data: allAssignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/v1/sales/assignments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/sales/assignments');
      return response; // Server returns direct data, not wrapped in .data
    },
    refetchInterval: 30000,
    staleTime: 25000
  });

  // Query for organizations and sports for assignment dropdowns
  const { data: organizations } = useQuery({
    queryKey: ['/api/v1/organizations'],
    queryFn: async () => {
      const response = await api.get('/api/v1/organizations');
      return response.data;
    }
  });

  const { data: sports } = useQuery({
    queryKey: ['/api/v1/sports'],
    queryFn: async () => {
      const response = await api.get('/api/v1/sports');
      return response.data?.data || response.data || [];
    }
  });

  // Fetch users with staff roles for salesperson assignment
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/v1/users/enhanced-staff'],
    queryFn: async () => {
      const response = await api.get('/api/v1/users/enhanced?type=staff&pageSize=100');
      return response;
    },
  });

  const allUsers = usersResponse?.data?.users || usersResponse?.data || [];

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await api.patch(`/api/v1/sales/salespeople/${selectedSalesperson}/profile`, data);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      setShowProfileModal(false);
    },
    onError: () => {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    }
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: typeof assignmentData) => {
      const response = await api.post(`/api/v1/sales/salespeople/${selectedSalesperson}/assignments`, data);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Assignment created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
      setShowAssignmentModal(false);
      setAssignmentData({ organization_id: '', sport_id: '', team_name: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to create assignment', variant: 'destructive' });
    }
  });

  // Filtered salespeople
  // Ensure salespeople is always an array to prevent filter errors
  const salespeopleArray = Array.isArray(salespeople) ? salespeople : [];

  const filteredSalespeople = salespeopleArray.filter(person => {
    const matchesSearch = person.full_name.toLowerCase().includes(search.toLowerCase()) ||
                          person.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'all' || person.profile?.performance_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getTierBadgeClass = (tier: string) => {
    const tierConfig = PERFORMANCE_TIERS.find(t => t.value === tier);
    return tierConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const openProfileModal = (salespersonId: string) => {
    setSelectedSalesperson(salespersonId);
    const person = salespeopleArray.find(s => s.id === salespersonId);
    if (person?.profile) {
      setProfileData({
        employee_id: person.profile.employee_id || '',
        tax_id: person.profile.tax_id || '',
        commission_rate: person.profile.commission_rate || 0,
        territory: person.profile.territory || '',
        hire_date: person.profile.hire_date?.split('T')[0] || '',
        manager_id: person.profile.manager_id || '',
        performance_tier: person.profile.performance_tier || 'standard'
      });
    }
    setShowProfileModal(true);
  };

  const openAssignmentModal = (salespersonId: string) => {
    setSelectedSalesperson(salespersonId);
    setShowAssignmentModal(true);
  };

  // Show loading state while data is fetching
  if (dashboardLoading || salespeopleLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading sales management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                Sales Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage your sales team, assignments, and performance metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/dashboard'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/salespeople'] });
                  queryClient.refetchQueries({ queryKey: ['/api/v1/sales/dashboard'] });
                  queryClient.refetchQueries({ queryKey: ['/api/v1/sales/salespeople'] });
                }}
                className="border-gray-700 hover:bg-gray-800/50"
              >
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => navigate('/sales/create')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-add-salesperson"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Salesperson
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 dark:bg-gray-700">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="salespeople">Salespeople</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <GlowCard>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Salespeople</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : dashboardData?.overview?.total_salespeople || 0}
                      </div>
                    </CardContent>
                  </GlowCard>

                  <GlowCard>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : dashboardData?.overview?.active_assignments || 0}
                      </div>
                    </CardContent>
                  </GlowCard>

                  <GlowCard>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : dashboardData?.overview?.total_orders || 0}
                      </div>
                    </CardContent>
                  </GlowCard>

                  <GlowCard>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(dashboardData?.overview?.total_revenue || 0)}
                      </div>
                    </CardContent>
                  </GlowCard>
                </div>

                {/* Top Performers */}
                <GlowCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Performers
                    </CardTitle>
                    <CardDescription>
                      Best performing salespeople in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Salesperson</TableHead>
                            <TableHead>Total Sales</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Commission</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dashboardData?.top_performers || []).map((performer) => (
                            <TableRow key={performer.salesperson_id}>
                              <TableCell className="font-medium">{performer.full_name}</TableCell>
                              <TableCell>{formatCurrency(performer.total_sales)}</TableCell>
                              <TableCell>{performer.orders_count}</TableCell>
                              <TableCell>{formatCurrency(performer.commission_earned)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </GlowCard>
              </div>
            </TabsContent>

            {/* Salespeople Tab */}
            <TabsContent value="salespeople">
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search salespeople..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-salespeople"
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-48" data-testid="select-tier-filter">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {PERFORMANCE_TIERS.map(tier => (
                        <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Salespeople Table */}
                <GlowCard>
                  <CardContent className="p-0">
                    {salespeopleLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Performance Tier</TableHead>
                            <TableHead>Assignments</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSalespeople.map((person) => (
                            <TableRow 
                              key={person.id} 
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              onClick={() => navigate(`/sales/${person.id}`)}
                            >
                              <TableCell className="font-medium">{person.full_name}</TableCell>
                              <TableCell>{person.email}</TableCell>
                              <TableCell>
                                <Badge className={getTierBadgeClass(person.profile?.performance_tier || 'standard')}>
                                  {PERFORMANCE_TIERS.find(t => t.value === person.profile?.performance_tier)?.label || 'Standard'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {person.active_assignments} active / {person.assignments} total
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/sales/${person.id}/edit`);
                                    }}
                                    data-testid={`button-edit-profile-${person.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAssignmentModal(person.id)}
                                    data-testid={`button-add-assignment-${person.id}`}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </GlowCard>
              </div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments">
              <GlowCard>
                <CardHeader>
                  <CardTitle>Team Assignments</CardTitle>
                  <CardDescription>
                    All salesperson assignments to organization teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assignmentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Salesperson</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Sport</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(allAssignments || []).map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              {salespeopleArray.find(p => p.id === assignment.salesperson_id)?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>{assignment.organization_name}</TableCell>
                            <TableCell>{assignment.sport_name}</TableCell>
                            <TableCell>{assignment.team_name}</TableCell>
                            <TableCell>
                              <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                                {assignment.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(assignment.assigned_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </GlowCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Salesperson Profile</DialogTitle>
            <DialogDescription>
              Update the salesperson's profile information and performance settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={profileData.employee_id}
                  onChange={(e) => setProfileData({ ...profileData, employee_id: e.target.value })}
                  data-testid="input-employee-id"
                />
              </div>
              <div>
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  value={profileData.commission_rate}
                  onChange={(e) => setProfileData({ ...profileData, commission_rate: parseFloat(e.target.value) })}
                  data-testid="input-commission-rate"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="territory">Territory</Label>
                <Input
                  id="territory"
                  value={profileData.territory}
                  onChange={(e) => setProfileData({ ...profileData, territory: e.target.value })}
                  data-testid="input-territory"
                />
              </div>
              <div>
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={profileData.hire_date}
                  onChange={(e) => setProfileData({ ...profileData, hire_date: e.target.value })}
                  data-testid="input-hire-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="performance_tier">Performance Tier</Label>
              <Select 
                value={profileData.performance_tier} 
                onValueChange={(value) => setProfileData({ ...profileData, performance_tier: value })}
              >
                <SelectTrigger data-testid="select-performance-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateProfileMutation.mutate(profileData)}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Creation Modal */}
      <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Assign this salesperson to an organization team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="organization_id">Organization</Label>
              <Select
                value={assignmentData.organization_id}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, organization_id: value })}
              >
                <SelectTrigger data-testid="select-organization">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.data?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  )) || organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sport_id">Sport</Label>
              <Select
                value={assignmentData.sport_id}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, sport_id: value })}
              >
                <SelectTrigger data-testid="select-sport">
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports?.map((sport: any) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="team_name">Team Name</Label>
              <Input
                id="team_name"
                placeholder="e.g., Varsity, JV, Middle School"
                value={assignmentData.team_name}
                onChange={(e) => setAssignmentData({ ...assignmentData, team_name: e.target.value })}
                data-testid="input-team-name"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Assignment notes (optional)"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                data-testid="input-assignment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createAssignmentMutation.mutate(assignmentData)}
              disabled={createAssignmentMutation.isPending}
              data-testid="button-create-assignment"
            >
              {createAssignmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}