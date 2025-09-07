import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, MapPin, Check } from 'lucide-react';
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

  // Load sports and regions on component mount
  useEffect(() => {
    loadSports();
    loadRegionsConfig();
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
      </main>
    </div>
  );
}