import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings2, Shield, Users, MapPin, Award, BarChart3, Layers } from 'lucide-react';

// Import sub-components for each section
import SportsManagement from './sections/SportsManagement';
import RegionsManagement from './sections/RegionsManagement';
import PerformanceTiersManagement from './sections/PerformanceTiersManagement';
import OrderStatusesManagement from './sections/OrderStatusesManagement';
import UserRolesManagement from './sections/UserRolesManagement';
import PermissionTemplatesManagement from './sections/PermissionTemplatesManagement';
import AccessSettingsManagement from './sections/AccessSettingsManagement';

export default function OrganizedSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: Settings2,
      description: 'Basic system configuration'
    },
    {
      id: 'access',
      label: 'Access Settings',
      icon: Shield,
      description: 'User access and security settings'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: Users,
      description: 'Permission templates and user roles'
    },
    {
      id: 'regions',
      label: 'Regions',
      icon: MapPin,
      description: 'Geographic regions configuration'
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: Award,
      description: 'Performance tiers and metrics'
    },
    {
      id: 'workflow',
      label: 'Workflow',
      icon: BarChart3,
      description: 'Order statuses and processes'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">System Configuration</h2>
          <p className="text-white/60">Manage all aspects of your system settings and configurations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-white/10">
            <TabsList className="grid w-full grid-cols-6 bg-transparent border-0 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab Description */}
          <div className="text-center mb-6">
            <p className="text-white/80 text-lg">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Layers className="h-5 w-5" />
                    Sports Management
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Configure available sports for organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SportsManagement />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Access Settings */}
          <TabsContent value="access" className="space-y-6">
            <AccessSettingsManagement />
          </TabsContent>

          {/* Permissions & Templates */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Permission Templates */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5" />
                    Permission Templates
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Create and manage reusable permission sets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PermissionTemplatesManagement />
                </CardContent>
              </Card>

              {/* User Roles */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5" />
                    User Roles
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Define system roles and their default permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserRolesManagement />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Regions Management */}
          <TabsContent value="regions" className="space-y-6">
            <RegionsManagement />
          </TabsContent>

          {/* Performance Tiers */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceTiersManagement />
          </TabsContent>

          {/* Workflow Management */}
          <TabsContent value="workflow" className="space-y-6">
            <OrderStatusesManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}