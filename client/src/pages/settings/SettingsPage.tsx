import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, MapPin, Check, Award, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { US_STATES } from '@/constants/us-states';
import { Badge } from '@/components/ui/badge';

type Sport = {
  id: string;
  name: string;
};

type RegionConfig = {
  stateCode: string;
  enabled: boolean;
};

export function SettingsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Regions management state
  const [enabledRegions, setEnabledRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);

  // Performance Tiers management state
  const [performanceTiers, setPerformanceTiers] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [newTierName, setNewTierName] = useState('');
  const [editingTier, setEditingTier] = useState<{id: string, label: string, value: string} | null>(null);
  const [tiersLoading, setTiersLoading] = useState(false);

  // Order Status management state
  const [orderStatuses, setOrderStatuses] = useState<Array<{id: string, label: string, value: string, color: string}>>([]);
  const [newStatusData, setNewStatusData] = useState({name: '', color: '#3B82F6'});
  const [editingStatus, setEditingStatus] = useState<{id: string, label: string, value: string, color: string} | null>(null);
  const [statusesLoading, setStatusesLoading] = useState(false);

  // User Roles management state  
  const [userRoles, setUserRoles] = useState<Array<{id: string, name: string, slug: string, description: string}>>([]);
  const [newRoleData, setNewRoleData] = useState({name: '', slug: '', description: ''});
  const [editingRole, setEditingRole] = useState<{id: string, name: string, slug: string, description: string} | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Load all configurations on component mount
  useEffect(() => {
    loadSports();
    loadRegionsConfig();
    loadPerformanceTiers();
    loadOrderStatuses();
    loadUserRoles();
  }, []);

  async function loadSports() {
    setLoading(true);
    const result = await api.get('/api/v1/sports');
    if (result.success) {
      setSports(result.data || []);
    } else {
      setError('Failed to load sports');
    }
    setLoading(false);
  }

  async function addSport() {
    if (!newSportName.trim()) return;
    
    const result = await api.post('/api/v1/sports', { name: newSportName.trim() });
    if (result.success) {
      setSuccess('Sport added successfully');
      setNewSportName('');
      loadSports();
    } else {
      setError(result.error?.message || 'Failed to add sport');
    }
  }

  async function updateSport() {
    if (!editingSport || !editingSport.name.trim()) return;
    
    const result = await api.patch(`/api/v1/sports/${editingSport.id}`, { name: editingSport.name.trim() });
    if (result.success) {
      setSuccess('Sport updated successfully');
      setEditingSport(null);
      loadSports();
    } else {
      setError(result.error?.message || 'Failed to update sport');
    }
  }

  async function deleteSport(sportId: string) {
    if (!confirm('Are you sure you want to delete this sport?')) return;
    
    const result = await api.delete(`/api/v1/sports/${sportId}`);
    if (result.success) {
      setSuccess('Sport deleted successfully');
      loadSports();
    } else {
      setError(result.error?.message || 'Failed to delete sport');
    }
  }

  // Regions management functions
  async function loadRegionsConfig() {
    setRegionsLoading(true);
    try {
      // For now, we'll use localStorage to store enabled regions
      // In a real app, this would come from a backend API
      const savedRegions = localStorage.getItem('enabled-regions');
      if (savedRegions) {
        setEnabledRegions(JSON.parse(savedRegions));
      } else {
        // Default to all US states enabled
        const allStates = US_STATES.map(state => state.value);
        setEnabledRegions(allStates);
        localStorage.setItem('enabled-regions', JSON.stringify(allStates));
      }
    } catch (error) {
      setError('Failed to load regions configuration');
    }
    setRegionsLoading(false);
  }

  function toggleRegion(stateCode: string) {
    const newEnabledRegions = enabledRegions.includes(stateCode)
      ? enabledRegions.filter(code => code !== stateCode)
      : [...enabledRegions, stateCode];
    
    setEnabledRegions(newEnabledRegions);
    localStorage.setItem('enabled-regions', JSON.stringify(newEnabledRegions));
    setSuccess(`${US_STATES.find(s => s.value === stateCode)?.label} ${enabledRegions.includes(stateCode) ? 'disabled' : 'enabled'} for selection`);
  }

  function enableAllRegions() {
    const allStates = US_STATES.map(state => state.value);
    setEnabledRegions(allStates);
    localStorage.setItem('enabled-regions', JSON.stringify(allStates));
    setSuccess('All regions enabled for selection');
  }

  function disableAllRegions() {
    setEnabledRegions([]);
    localStorage.setItem('enabled-regions', JSON.stringify([]));
    setSuccess('All regions disabled for selection');
  }

  // Performance Tiers management functions
  async function loadPerformanceTiers() {
    setTiersLoading(true);
    try {
      const savedTiers = localStorage.getItem('performance-tiers');
      if (savedTiers) {
        setPerformanceTiers(JSON.parse(savedTiers));
      } else {
        const defaultTiers = [
          {id: '1', label: 'Standard', value: 'standard'},
          {id: '2', label: 'Bronze', value: 'bronze'},
          {id: '3', label: 'Silver', value: 'silver'},
          {id: '4', label: 'Gold', value: 'gold'},
          {id: '5', label: 'Platinum', value: 'platinum'}
        ];
        setPerformanceTiers(defaultTiers);
        localStorage.setItem('performance-tiers', JSON.stringify(defaultTiers));
      }
    } catch (error) {
      setError('Failed to load performance tiers');
    }
    setTiersLoading(false);
  }

  function addPerformanceTier() {
    if (!newTierName.trim()) return;
    
    const newTier = {
      id: Date.now().toString(),
      label: newTierName.trim(),
      value: newTierName.trim().toLowerCase().replace(/\s+/g, '_')
    };
    
    const updatedTiers = [...performanceTiers, newTier];
    setPerformanceTiers(updatedTiers);
    localStorage.setItem('performance-tiers', JSON.stringify(updatedTiers));
    setNewTierName('');
    setSuccess('Performance tier added successfully');
  }

  function updatePerformanceTier() {
    if (!editingTier || !editingTier.label.trim()) return;
    
    const updatedTiers = performanceTiers.map(tier => 
      tier.id === editingTier.id 
        ? {...tier, label: editingTier.label.trim(), value: editingTier.label.trim().toLowerCase().replace(/\s+/g, '_')}
        : tier
    );
    
    setPerformanceTiers(updatedTiers);
    localStorage.setItem('performance-tiers', JSON.stringify(updatedTiers));
    setEditingTier(null);
    setSuccess('Performance tier updated successfully');
  }

  function deletePerformanceTier(tierId: string) {
    if (!confirm('Are you sure you want to delete this performance tier?')) return;
    
    const updatedTiers = performanceTiers.filter(tier => tier.id !== tierId);
    setPerformanceTiers(updatedTiers);
    localStorage.setItem('performance-tiers', JSON.stringify(updatedTiers));
    setSuccess('Performance tier deleted successfully');
  }

  // Order Status management functions
  async function loadOrderStatuses() {
    setStatusesLoading(true);
    try {
      const savedStatuses = localStorage.getItem('order-statuses');
      if (savedStatuses) {
        setOrderStatuses(JSON.parse(savedStatuses));
      } else {
        const defaultStatuses = [
          {id: '1', label: 'Pending', value: 'pending', color: '#F59E0B'},
          {id: '2', label: 'In Production', value: 'in_production', color: '#3B82F6'},
          {id: '3', label: 'Completed', value: 'completed', color: '#10B981'},
          {id: '4', label: 'Cancelled', value: 'cancelled', color: '#EF4444'}
        ];
        setOrderStatuses(defaultStatuses);
        localStorage.setItem('order-statuses', JSON.stringify(defaultStatuses));
      }
    } catch (error) {
      setError('Failed to load order statuses');
    }
    setStatusesLoading(false);
  }

  function addOrderStatus() {
    if (!newStatusData.name.trim()) return;
    
    const newStatus = {
      id: Date.now().toString(),
      label: newStatusData.name.trim(),
      value: newStatusData.name.trim().toLowerCase().replace(/\s+/g, '_'),
      color: newStatusData.color
    };
    
    const updatedStatuses = [...orderStatuses, newStatus];
    setOrderStatuses(updatedStatuses);
    localStorage.setItem('order-statuses', JSON.stringify(updatedStatuses));
    setNewStatusData({name: '', color: '#3B82F6'});
    setSuccess('Order status added successfully');
  }

  // User Roles management functions
  async function loadUserRoles() {
    setRolesLoading(true);
    try {
      const savedRoles = localStorage.getItem('user-roles');
      if (savedRoles) {
        setUserRoles(JSON.parse(savedRoles));
      } else {
        const defaultRoles = [
          {id: '1', name: 'Admin', slug: 'admin', description: 'Full system access'},
          {id: '2', name: 'Sales', slug: 'sales', description: 'Sales team member'},
          {id: '3', name: 'Designer', slug: 'designer', description: 'Design team member'},
          {id: '4', name: 'Manufacturing', slug: 'manufacturing', description: 'Production team member'},
          {id: '5', name: 'Customer', slug: 'customer', description: 'External customer'}
        ];
        setUserRoles(defaultRoles);
        localStorage.setItem('user-roles', JSON.stringify(defaultRoles));
      }
    } catch (error) {
      setError('Failed to load user roles');
    }
    setRolesLoading(false);
  }

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-8">
          <h2 className="text-xl font-semibold mb-6 text-white">Sports Management</h2>
          <p className="text-white/60 mb-6">Manage sports available for organization selection</p>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400">
              {success}
            </div>
          )}

          {/* Add new sport */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-medium mb-4">Add New Sport</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                placeholder="Enter sport name..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                data-testid="input-new-sport"
                onKeyPress={(e) => e.key === 'Enter' && addSport()}
              />
              <Button
                onClick={addSport}
                disabled={!newSportName.trim() || loading}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                data-testid="button-add-sport"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sport
              </Button>
            </div>
          </div>

          {/* Sports list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-white/60">Loading sports...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sports.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  No sports found. Add your first sport above.
                </div>
              ) : (
                sports.map((sport) => (
                  <div 
                    key={sport.id} 
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    data-testid={`sport-item-${sport.id}`}
                  >
                    {editingSport?.id === sport.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={editingSport.name}
                          onChange={(e) => setEditingSport({ ...editingSport, name: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                          data-testid={`input-edit-sport-${sport.id}`}
                          onKeyPress={(e) => e.key === 'Enter' && updateSport()}
                        />
                        <Button
                          onClick={updateSport}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          data-testid={`button-save-sport-${sport.id}`}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingSport(null)}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white/70 hover:bg-white/10"
                          data-testid={`button-cancel-sport-${sport.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium" data-testid={`text-sport-name-${sport.id}`}>
                          {sport.name}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingSport(sport)}
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white/70 hover:bg-white/10"
                            data-testid={`button-edit-sport-${sport.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteSport(sport.id)}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            data-testid={`button-delete-sport-${sport.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Regions Management */}
        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
            <MapPin className="h-6 w-6" />
            Regions Management
          </h2>
          <p className="text-white/60 mb-6">Configure which US states are available for salesperson region selection</p>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400">
              {success}
            </div>
          )}

          {/* Bulk Actions */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-medium mb-4 text-white">Bulk Actions</h3>
            <div className="flex gap-3">
              <Button
                onClick={enableAllRegions}
                disabled={regionsLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                data-testid="button-enable-all-regions"
              >
                <Check className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button
                onClick={disableAllRegions}
                disabled={regionsLoading}
                variant="outline"
                className="px-4 py-2 border-red-500/50 text-red-400 hover:bg-red-500/20 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                data-testid="button-disable-all-regions"
              >
                <X className="h-4 w-4 mr-2" />
                Disable All
              </Button>
            </div>
            <p className="text-sm text-white/50 mt-2">
              {enabledRegions.length} of {US_STATES.length} regions enabled
            </p>
          </div>

          {/* Regions Grid */}
          {regionsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-white/60">Loading regions...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {US_STATES.map((state) => {
                const isEnabled = enabledRegions.includes(state.value);
                return (
                  <div
                    key={state.value}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                      isEnabled
                        ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => toggleRegion(state.value)}
                    data-testid={`region-item-${state.value}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white text-sm">{state.label}</h4>
                        <p className="text-xs text-white/60">{state.value}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isEnabled
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/30'
                      }`}>
                        {isEnabled && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance Tiers Management */}
        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
            <Award className="h-6 w-6" />
            Performance Tiers Management
          </h2>
          <p className="text-white/60 mb-6">Manage salesperson performance tier options</p>

          {/* Add new tier */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-medium mb-4">Add New Performance Tier</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                placeholder="Enter tier name..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                data-testid="input-new-tier"
                onKeyPress={(e) => e.key === 'Enter' && addPerformanceTier()}
              />
              <Button
                onClick={addPerformanceTier}
                disabled={!newTierName.trim() || tiersLoading}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                data-testid="button-add-tier"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </div>
          </div>

          {/* Tiers list */}
          {tiersLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-white/60">Loading performance tiers...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {performanceTiers.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  No performance tiers found. Add your first tier above.
                </div>
              ) : (
                performanceTiers.map((tier) => (
                  <div 
                    key={tier.id} 
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    data-testid={`tier-item-${tier.id}`}
                  >
                    {editingTier?.id === tier.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={editingTier.label}
                          onChange={(e) => setEditingTier({ ...editingTier, label: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                          data-testid={`input-edit-tier-${tier.id}`}
                          onKeyPress={(e) => e.key === 'Enter' && updatePerformanceTier()}
                        />
                        <Button
                          onClick={updatePerformanceTier}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          data-testid={`button-save-tier-${tier.id}`}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingTier(null)}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white/70 hover:bg-white/10"
                          data-testid={`button-cancel-tier-${tier.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium" data-testid={`text-tier-name-${tier.id}`}>
                            {tier.label}
                          </span>
                          <p className="text-white/50 text-sm">Value: {tier.value}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setEditingTier(tier)}
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white/70 hover:bg-white/10"
                            data-testid={`button-edit-tier-${tier.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deletePerformanceTier(tier.id)}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            data-testid={`button-delete-tier-${tier.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Order Status Management */}
        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            Order Status Management
          </h2>
          <p className="text-white/60 mb-6">Configure order status options and their color coding</p>

          {/* Add new status */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-medium mb-4">Add New Order Status</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newStatusData.name}
                onChange={(e) => setNewStatusData({...newStatusData, name: e.target.value})}
                placeholder="Enter status name..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors"
                data-testid="input-new-status"
              />
              <input
                type="color"
                value={newStatusData.color}
                onChange={(e) => setNewStatusData({...newStatusData, color: e.target.value})}
                className="w-12 h-10 rounded border border-white/20 bg-transparent cursor-pointer"
                data-testid="input-status-color"
              />
              <Button
                onClick={addOrderStatus}
                disabled={!newStatusData.name.trim() || statusesLoading}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                data-testid="button-add-status"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </div>
          </div>

          {/* Status list */}
          {statusesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-white/60">Loading order statuses...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderStatuses.map((status) => (
                <div 
                  key={status.id} 
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                  data-testid={`status-item-${status.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{backgroundColor: status.color}}
                      ></div>
                      <div>
                        <span className="text-white font-medium">{status.label}</span>
                        <p className="text-white/50 text-sm">Value: {status.value}</p>
                      </div>
                    </div>
                    <Badge 
                      className="text-white border-white/20"
                      style={{backgroundColor: status.color + '40', borderColor: status.color}}
                    >
                      {status.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;