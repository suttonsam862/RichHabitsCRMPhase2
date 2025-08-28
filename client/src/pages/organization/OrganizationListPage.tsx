import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Search, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  type?: string;
  status?: string;
  logoUrl?: string;
  createdAt?: string;
}

export function OrganizationListPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/organizations', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">Organizations</h1>
            </div>
            <Button data-testid="button-add">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Organizations Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No organizations found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org) => (
              <Card 
                key={org.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                data-testid={`card-org-${org.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <CardDescription>
                        {org.type || 'Organization'} • {org.status || 'Active'}
                      </CardDescription>
                    </div>
                    {org.logoUrl && (
                      <img 
                        src={org.logoUrl} 
                        alt={org.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">
                    Created {new Date(org.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}