import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

type Sport = {
  id: string;
  name: string;
};

export default function SportsManagement() {
  const { toast } = useToast();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [editingSport, setEditingSport] = useState<Sport | null>(null);

  useEffect(() => {
    loadSports();
  }, []);

  async function loadSports() {
    setLoading(true);
    const result = await api.get('/api/v1/sports');
    if (result.success) {
      setSports(result.data || []);
    }
    setLoading(false);
  }

  async function addSport() {
    if (!newSportName.trim()) return;
    
    const result = await api.post('/api/v1/sports', { name: newSportName.trim() });
    if (result.success) {
      toast({ title: "Success", description: "Sport added successfully" });
      setNewSportName('');
      loadSports();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          value={newSportName}
          onChange={(e) => setNewSportName(e.target.value)}
          placeholder="Enter sport name..."
          className="bg-white/5 border-white/10 text-white"
          onKeyPress={(e) => e.key === 'Enter' && addSport()}
        />
        <Button
          onClick={addSport}
          disabled={!newSportName.trim() || loading}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Sport
        </Button>
      </div>

      <div className="space-y-2">
        {sports.map((sport) => (
          <div 
            key={sport.id} 
            className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
          >
            <span className="text-white font-medium">{sport.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}