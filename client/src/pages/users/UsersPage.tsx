import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';

interface UserRole {
  user_id: string;
  org_id: string;
  role_id: string;
  roles: { slug: string; name: string };
  org: { name: string };
}

export function UsersPage() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserRoles();
  }, []);

  async function loadUserRoles() {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/api/v1/users/admin/list');
      if (r.success) {
        setUserRoles(r.data || []);
      } else {
        setError(r.error?.message || 'Failed to load user roles');
      }
    } catch (e) {
      setError('Failed to load user roles');
    } finally {
      setLoading(false);
    }
  }

  const groupedByOrg = userRoles.reduce((acc, userRole) => {
    const orgName = userRole.org?.name || 'Unknown Organization';
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(userRole);
    return acc;
  }, {} as Record<string, UserRole[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" data-testid="button-back" className="text-white hover:text-cyan-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="ml-4 text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            User Roles Management
          </h1>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-2 text-white/60">Loading user roles...</p>
          </div>
        )}

        {error && (
          <GlowCard className="mb-6">
            <div className="text-red-400 text-center py-4">
              <p>{error}</p>
              <button onClick={loadUserRoles} className="mt-2 text-cyan-400 underline">
                Retry
              </button>
            </div>
          </GlowCard>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {Object.keys(groupedByOrg).length === 0 ? (
              <GlowCard>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No User Roles Found</h2>
                  <p className="text-white/60">No user role assignments are currently configured.</p>
                </div>
              </GlowCard>
            ) : (
              Object.entries(groupedByOrg).map(([orgName, roles]) => (
                <GlowCard key={orgName} data-testid={`card-org-${orgName.replace(/\s+/g, '-').toLowerCase()}`}>
                  <h2 className="text-xl font-semibold mb-4 text-cyan-400">{orgName}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-white/80">User ID</th>
                          <th className="text-left py-2 text-white/80">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((userRole, index) => (
                          <tr key={`${userRole.user_id}-${userRole.role_id}`} className={index > 0 ? "border-t border-white/5" : ""} data-testid={`row-user-${userRole.user_id}`}>
                            <td className="py-2 text-white/90 font-mono text-sm">{userRole.user_id}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                userRole.roles.slug === 'admin' ? 'bg-red-500/20 text-red-300' :
                                userRole.roles.slug === 'sales' ? 'bg-green-500/20 text-green-300' :
                                userRole.roles.slug === 'design' ? 'bg-blue-500/20 text-blue-300' :
                                userRole.roles.slug === 'manufacturing' ? 'bg-yellow-500/20 text-yellow-300' :
                                userRole.roles.slug === 'customer' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {userRole.roles.name}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlowCard>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}