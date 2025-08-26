import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { gradientFrom } from '@/features/organizations/gradient';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/auth/guard';
import { Role } from '@/auth/roles';

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

  // Check if user can manage setup (admin or sales role)
  const canManageSetup = useMemo(() => {
    return currentUser?.role === Role.ADMIN || currentUser?.role === Role.SALES;
  }, [currentUser]);

  // For now, allow setup management for admin/sales users on any org
  // In production, this would check per-org permissions
  function canManageOrgSetup(orgId: string): boolean {
    return canManageSetup;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Organizations
            </h1>
            <p className="text-white/60 mt-2">Manage your organizations with style</p>
          </div>
          <Link 
            to="/organizations/create"
            className="btn-primary px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            Create Organization
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
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

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-2 text-white/60">Loading organizations...</p>
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map(org => {
              const g = org.gradient_css || gradientFrom(org.brandPrimary, org.brandSecondary);
              const needsSetup = org.setupComplete === false || org.setupComplete === null || org.setupComplete === undefined;
              return (
                <GlowCard key={org.id} className={`p-0 overflow-hidden ${needsSetup ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''}`} data-testid={`card-organization-${org.id}`}>
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
                      </>
                    )}
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold mb-2">No organizations found</h3>
            <p className="text-white/60 mb-6">
              {q || tag ? 'Try adjusting your search filters' : 'Create your first organization to get started'}
            </p>
            <Link 
              to="/organizations/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300"
            >
              Create Organization
            </Link>
          </div>
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