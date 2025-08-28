import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { gradientFrom } from '@/features/organizations/gradient';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/auth/guard';
import { Role } from '@/auth/roles';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Building2, GraduationCap, MapPin, Users, Grid3X3, List } from 'lucide-react';

type Org = { 
  id:string; 
  name:string; 
  logoUrl?:string|null; 
  brandPrimary:string; 
  brandSecondary:string; 
  gradient_css?:string|null; 
  tags:string[]; 
  isBusiness:boolean; 
  isArchived:boolean;
  setupComplete?:boolean;
  financeEmail?:string|null;
  state?:string|null;
  address?:string|null;
  createdAt:string; 
  updatedAt:string 
};

export default function OrganizationsList(){
  const currentUser = useCurrentUser();
  const [rows, setRows] = useState<Org[]>([]);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState(''); 
  const [tag, setTag] = useState(''); 
  const [onlyFav, setOnlyFav] = useState(false); 
  const [sort, setSort] = useState<'name'|'created'|'updated'>('updated'); 
  const [dir, setDir] = useState<'asc'|'desc'>('desc');
  const [limit, setLimit] = useState(24); 
  const [offset, setOffset] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'state'>('type');

  async function load(){ 
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/organizations?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}&onlyFavorites=${onlyFav}&includeArchived=${includeArchived}&sort=${sort}&dir=${dir}&limit=${limit}&offset=${offset}`); 
      if(r.success){ 
        setRows(r.data||[]); 
        setCount(r.count||0); 
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); },[q,tag,onlyFav,includeArchived,sort,dir,limit,offset]);

  async function toggleFavorite(orgId: string) {
    const r = await api.post(`/api/v1/organizations/${orgId}/favorite`, {});
    if (r.success) {
      load(); // Refresh list
    }
  }

  async function deleteOrganization(orgId: string, orgName: string) {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const r = await api.delete(`/api/v1/organizations/${orgId}`);
      if (r.success) {
        load(); // Refresh list
        // Show success message (you could add a toast here)
      } else {
        alert('Failed to delete organization: ' + (r.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to delete organization: ' + error);
    }
  }

  // Check if user can manage setup (admin or sales role)
  const canManageSetup = useMemo(() => {
    return currentUser?.role === Role.ADMIN || currentUser?.role === Role.SALES;
  }, [currentUser]);

  // For now, allow setup management for admin/sales users on any org
  // In production, this would check per-org permissions
  function canManageOrgSetup(orgId: string): boolean {
    return canManageSetup;
  }

  // Group organizations by type and state
  const groupedOrganizations = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: 'All Organizations', organizations: rows, key: 'all' }];
    }

    const grouped = new Map<string, Org[]>();
    
    rows.forEach(org => {
      let key = '';
      let title = '';
      
      if (groupBy === 'type') {
        key = org.isBusiness ? 'business' : 'organization';
        title = org.isBusiness ? 'Businesses' : 'Organizations & Schools';
      } else if (groupBy === 'state') {
        const state = org.state || 'Unknown';
        key = state.toLowerCase();
        title = state === 'Unknown' ? 'Location Not Set' : state;
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(org);
    });

    // Sort groups by priority
    const sortedGroups = Array.from(grouped.entries()).map(([key, orgs]) => {
      let title = '';
      let priority = 999;
      
      if (groupBy === 'type') {
        if (key === 'organization') {
          title = 'Organizations & Schools';
          priority = 1;
        } else {
          title = 'Businesses';
          priority = 2;
        }
      } else if (groupBy === 'state') {
        title = key === 'unknown' ? 'Location Not Set' : orgs[0]?.state || key;
        priority = key === 'unknown' ? 999 : 1;
      }
      
      return {
        key,
        title,
        organizations: orgs.sort((a, b) => a.name.localeCompare(b.name)),
        priority
      };
    });

    return sortedGroups.sort((a, b) => a.priority - b.priority);
  }, [rows, groupBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Organizations
            </h1>
            <p className="text-white/60 mt-2">Manage your organizations with style</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-white/40 text-sm">Total: {count}</span>
              <div className="w-1 h-1 bg-white/20 rounded-full"></div>
              <span className="text-white/40 text-sm">
                {rows.filter(r => r.isBusiness).length} Businesses, {rows.filter(r => !r.isBusiness).length} Organizations
              </span>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to="/organizations/create"
              className="btn-primary px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              Create Organization
            </Link>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm"
        >
          {/* Grouping Controls */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
            <span className="text-white/60 text-sm font-medium">Group by:</span>
            <div className="flex items-center gap-2">
              <Button
                variant={groupBy === 'type' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupBy('type')}
                className={`transition-all duration-200 ${
                  groupBy === 'type' 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25' 
                    : 'border-white/20 text-white/70 hover:bg-white/10 hover:border-cyan-500/50'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Organization Type
              </Button>
              <Button
                variant={groupBy === 'state' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupBy('state')}
                className={`transition-all duration-200 ${
                  groupBy === 'state' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25' 
                    : 'border-white/20 text-white/70 hover:bg-white/10 hover:border-green-500/50'
                }`}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </Button>
              <Button
                variant={groupBy === 'none' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupBy('none')}
                className={`transition-all duration-200 ${
                  groupBy === 'none' 
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/25' 
                    : 'border-white/20 text-white/70 hover:bg-white/10 hover:border-gray-500/50'
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                No Grouping
              </Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <input 
              className="flex-1 min-w-60 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
              value={q} 
              onChange={e=>{setOffset(0);setQ(e.target.value)}} 
              placeholder="Search organizations..."
              data-testid="input-search"
            />
            <input 
              className="w-48 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
              value={tag} 
              onChange={e=>{setOffset(0);setTag(e.target.value)}} 
              placeholder="Filter by tag..."
              data-testid="input-tag-filter"
            />
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={onlyFav} 
                onChange={e=>{setOffset(0);setOnlyFav(e.target.checked)}}
                className="rounded"
                data-testid="checkbox-favorites"
              /> 
              <span>Only favorites</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={includeArchived} 
                onChange={e=>{setOffset(0);setIncludeArchived(e.target.checked)}}
                className="rounded"
                data-testid="checkbox-archived"
              /> 
              <span>Include archived</span>
            </label>
            <select 
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors" 
              value={sort} 
              onChange={e=>setSort(e.target.value as any)}
              data-testid="select-sort"
            >
              <option value="updated">Updated</option>
              <option value="created">Created</option>
              <option value="name">Name</option>
            </select>
            <select 
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors" 
              value={dir} 
              onChange={e=>setDir(e.target.value as any)}
              data-testid="select-direction"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        {/* Organization Groups */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="animate-pulse"
              >
                <div className="h-48 rounded-2xl bg-white/5 border border-white/10"></div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {groupedOrganizations.map((group, groupIndex) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + groupIndex * 0.1 }}
              >
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                        group.key === 'organization' || group.title.includes('Organization') 
                          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
                          : group.key === 'business' || group.title.includes('Business')
                          ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30'
                          : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30'
                      }`}>
                        {group.key === 'organization' || group.title.includes('Organization') ? (
                          <GraduationCap className="h-5 w-5 text-green-400" />
                        ) : group.key === 'business' || group.title.includes('Business') ? (
                          <Building2 className="h-5 w-5 text-blue-400" />
                        ) : (
                          <MapPin className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{group.title}</h2>
                        <p className="text-white/60 text-sm">
                          {group.organizations.length} {group.organizations.length === 1 ? 'organization' : 'organizations'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                  </div>
                )}

                {/* Organization Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.organizations.map((org, index) => {
                    const g = org.gradient_css || gradientFrom(org.brandPrimary, org.brandSecondary);
                    const needsSetup = org.setupComplete === false || org.setupComplete === null || org.setupComplete === undefined;
                    return (
                      <motion.div
                        key={org.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ 
                          delay: 0.3 + (groupIndex * 0.1) + (index * 0.05),
                          duration: 0.2
                        }}
                      >
                        <GlowCard className={`p-0 overflow-hidden cursor-pointer transition-all duration-200 ${needsSetup ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''}`} data-testid={`card-organization-${org.id}`}>
                  {/* Header gradient */}
                  <div className="h-28 relative" style={{ background: g }}>
                    <div className="absolute inset-0 bg-black/20"></div>
                    {org.isArchived && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-red-500/80 text-white text-xs rounded-md">
                        Archived
                      </div>
                    )}
                    {needsSetup && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-500 text-black text-xs rounded-md font-semibold animate-pulse">
                        SETUP NEEDED
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center border border-white/10 relative">
                      {org.logoUrl ? (
                        <img 
                          src={`/storage/app/${org.logoUrl}`} 
                          alt={`${org.name} logo`} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-white/50 text-center">No<br/>Logo</div>
                      )}
                      {/* Setup status indicator */}
                      {needsSetup && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-yellow-300 animate-pulse" title="Setup incomplete"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate" data-testid={`text-name-${org.id}`}>{org.name}</div>
                        {needsSetup && (
                          <span className="px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-xs rounded-md border border-yellow-500/50 animate-pulse font-semibold" title="Setup incomplete">
                            Setup Required
                          </span>
                        )}
                      </div>
                      <div className="text-white/60 text-xs" data-testid={`text-type-${org.id}`}>
                        {org.isBusiness ? 'Business' : 'Organization'}
                        {org.tags?.length > 0 && ` · ${org.tags.slice(0,2).join(' · ')}`}
                        {org.financeEmail && ` · Finance: ${org.financeEmail}`}
                      </div>
                    </div>
                    <button 
                      className="text-white/70 hover:text-yellow-400 transition-colors p-1" 
                      title="Toggle favorite" 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(org.id); }}
                      data-testid={`button-favorite-${org.id}`}
                    >
                      ★
                    </button>
                  </div>
                  
                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    {/* Setup button - prominent for organizations needing setup */}
                    {needsSetup && canManageOrgSetup(org.id) && (
                      <Link 
                        className="flex-1 text-center px-3 py-2 text-sm rounded-xl bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500/70 hover:border-yellow-400 transition-all duration-300 text-yellow-300 hover:text-yellow-200 font-semibold animate-pulse hover:animate-none hover:shadow-lg hover:shadow-yellow-500/30" 
                        to={`/organizations/${org.id}/setup`}
                        data-testid={`link-setup-${org.id}`}
                      >
                        🚀 Complete Setup
                      </Link>
                    )}
                    {/* Show smaller View/Edit buttons if setup is needed */}
                    {needsSetup && canManageOrgSetup(org.id) ? (
                      <>
                        <Link 
                          className="px-2 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 hover:border-cyan-400 transition-colors text-xs"
                          to={`/organizations/${org.id}`}
                          data-testid={`link-view-${org.id}`}
                        >
                          View
                        </Link>
                        <Link 
                          className="px-2 py-2 text-sm rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-xs"
                          to={`/organizations/${org.id}/edit`}
                          data-testid={`link-edit-${org.id}`}
                        >
                          Edit
                        </Link>
                        <button 
                          className="px-2 py-2 text-sm rounded-xl bg-red-500/20 border border-red-500/30 hover:border-red-400 hover:bg-red-500/30 transition-colors text-xs text-red-300 hover:text-red-200"
                          onClick={(e) => { e.stopPropagation(); deleteOrganization(org.id, org.name); }}
                          data-testid={`button-delete-${org.id}`}
                          title="Delete organization"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <Link 
                          className="flex-1 text-center px-3 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 hover:border-cyan-400 transition-colors"
                          to={`/organizations/${org.id}`}
                          data-testid={`link-view-${org.id}`}
                        >
                          View
                        </Link>
                        <Link 
                          className="flex-1 text-center px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                          to={`/organizations/${org.id}/edit`}
                          data-testid={`link-edit-${org.id}`}
                        >
                          Edit
                        </Link>
                        <button 
                          className="px-3 py-2 text-sm rounded-xl bg-red-500/20 border border-red-500/30 hover:border-red-400 hover:bg-red-500/30 transition-colors text-red-300 hover:text-red-200"
                          onClick={(e) => { e.stopPropagation(); deleteOrganization(org.id, org.name); }}
                          data-testid={`button-delete-${org.id}`}
                          title="Delete organization"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                        </GlowCard>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Empty State for Groups */}
                {group.organizations.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + groupIndex * 0.1 }}
                    className="text-center py-12"
                  >
                    <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white/60 mb-2">No organizations found</h3>
                    <p className="text-white/40">No organizations match your current filters in this group.</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Overall Empty State */}
        {!loading && rows.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-20"
          >
            <Building2 className="h-20 w-20 text-white/20 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white/80 mb-3">No Organizations Found</h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              {q || tag ? 'No organizations match your search criteria. Try adjusting your filters.' : 'Get started by creating your first organization.'}
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/organizations/create"
                className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
              >
                Create Your First Organization
              </Link>
            </motion.div>
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && rows.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-white/60 text-sm">
              Showing {Math.min(offset + 1, count)} - {Math.min(offset + rows.length, count)} of {count} organizations
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={offset === 0} 
                onClick={() => setOffset(Math.max(0, offset - limit))}
                data-testid="button-prev"
              >
                Previous
              </button>
              <button 
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={offset + limit >= count} 
                onClick={() => setOffset(offset + limit)}
                data-testid="button-next"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}