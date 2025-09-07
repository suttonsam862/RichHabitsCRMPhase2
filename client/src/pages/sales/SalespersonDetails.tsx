import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Loader2,
  User
} from 'lucide-react';

// Performance tier configurations
const PERFORMANCE_TIERS = [
  { value: 'bronze', label: 'Bronze', color: 'bg-amber-100 text-amber-800' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-100 text-gray-800' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'platinum', label: 'Platinum', color: 'bg-purple-100 text-purple-800' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800' },
];

interface SalespersonMetric {
  id: string;
  salesperson_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  orders_count: number;
  conversion_rate: number;
  average_deal_size: number;
  commission_earned: number;
  active_assignments: number;
  created_at: string;
}

export default function SalespersonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: salesperson, isLoading, error } = useQuery({
    queryKey: ['/api/v1/sales/salespeople', id],
    queryFn: () => api.get(`/api/v1/sales/salespeople/${id}`),
    enabled: !!id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierColor = (tier?: string) => {
    const tierConfig = PERFORMANCE_TIERS.find(t => t.value === tier);
    return tierConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const getTierLabel = (tier?: string) => {
    const tierConfig = PERFORMANCE_TIERS.find(t => t.value === tier);
    return tierConfig?.label || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !salesperson?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Salesperson Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The salesperson you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/sales')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const person = salesperson.data;
  const profile = person.profile;
  
  // Calculate recent performance metrics (last 30 days)
  const calculateRecentMetrics = () => {
    if (!person.metrics || person.metrics.length === 0) {
      return { totalSales: 0, ordersCount: 0, commissionEarned: 0 };
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Filter metrics for last 30 days and aggregate
    const recentMetrics = person.metrics.filter((metric: SalespersonMetric) => 
      new Date(metric.period_start) >= thirtyDaysAgo
    );
    
    return recentMetrics.reduce((acc: { totalSales: number; ordersCount: number; commissionEarned: number }, metric: SalespersonMetric) => ({
      totalSales: acc.totalSales + (metric.total_sales || 0),
      ordersCount: acc.ordersCount + (metric.orders_count || 0),
      commissionEarned: acc.commissionEarned + (metric.commission_earned || 0)
    }), { totalSales: 0, ordersCount: 0, commissionEarned: 0 });
  };
  
  const recentMetrics = calculateRecentMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/sales">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sales
              </Button>
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile?.profile_photo_url || undefined} alt={person.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                  {person.full_name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{person.full_name}</h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">Sales Representative</p>
                {profile?.performance_tier && (
                  <Badge className={`mt-2 ${getTierColor(profile.performance_tier)}`}>
                    <Award className="h-3 w-3 mr-1" />
                    {getTierLabel(profile.performance_tier)} Tier
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              onClick={() => navigate(`/sales/${id}/edit`)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="button-edit-salesperson"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium">{person.email}</p>
                </div>
              </div>
              
              {person.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium">{person.phone}</p>
                  </div>
                </div>
              )}

              {profile?.territory && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Territory</p>
                    <p className="font-medium">{profile.territory}</p>
                  </div>
                </div>
              )}

              {profile?.hire_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hire Date</p>
                    <p className="font-medium">{formatDate(profile.hire_date)}</p>
                  </div>
                </div>
              )}

              {profile?.employee_id && (
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                    <p className="font-medium">{profile.employee_id}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Configuration */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.commission_rate && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Commission Rate</p>
                    <p className="font-medium">{(profile.commission_rate / 100).toFixed(2)}%</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Performance Tier</p>
                  <Badge className={`mt-1 ${getTierColor(profile?.performance_tier)}`}>
                    {getTierLabel(profile?.performance_tier)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <Badge className="mt-1 bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(recentMetrics.totalSales)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{recentMetrics.ordersCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Orders</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(recentMetrics.commissionEarned)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Commission Earned</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}