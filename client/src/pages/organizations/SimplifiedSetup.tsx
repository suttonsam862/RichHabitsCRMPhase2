import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Palette, 
  Upload, 
  MapPin, 
  Save,
  ImageIcon,
  X,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
// Sports available for organizations
const AVAILABLE_SPORTS = [
  { id: "550e8400-e29b-41d4-a716-446655440001", name: "Football" },
  { id: "550e8400-e29b-41d4-a716-446655440002", name: "Basketball" },
  { id: "550e8400-e29b-41d4-a716-446655440003", name: "Soccer" },
  { id: "550e8400-e29b-41d4-a716-446655440004", name: "Baseball" },
  { id: "550e8400-e29b-41d4-a716-446655440005", name: "Track & Field" },
  { id: "550e8400-e29b-41d4-a716-446655440006", name: "Swimming" },
  { id: "550e8400-e29b-41d4-a716-446655440007", name: "Volleyball" },
  { id: "550e8400-e29b-41d4-a716-446655440008", name: "Tennis" },
  { id: "550e8400-e29b-41d4-a716-446655440009", name: "Wrestling" },
  { id: "550e8400-e29b-41d4-a716-446655440010", name: "Golf" },
  { id: "550e8400-e29b-41d4-a716-446655440011", name: "Cross Country" },
  { id: "550e8400-e29b-41d4-a716-446655440012", name: "Lacrosse" },
  { id: "550e8400-e29b-41d4-a716-446655440013", name: "Hockey" },
  { id: "550e8400-e29b-41d4-a716-446655440014", name: "Softball" },
  { id: "550e8400-e29b-41d4-a716-446655440015", name: "Cheerleading" },
];

interface SportContact {
  id: string;
  sportId: string;
  sportName: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
}

export default function SimplifiedSetup() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  
  // Basic org data
  const [org, setOrg] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Essential branding fields
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandPrimary, setBrandPrimary] = useState('#6EE7F9');
  const [brandSecondary, setBrandSecondary] = useState('#A78BFA');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Essential address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  // Sports and contacts
  const [sports, setSports] = useState<SportContact[]>([]);
  const [selectedSportId, setSelectedSportId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Load organization data
  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    (async () => {
      try {
        const r = await api.get(`/api/v1/organizations/${id}/setup`);
        if (!r.success) {
          toast({
            title: "Error",
            description: r.error?.message || 'Failed to load organization data',
            variant: "destructive"
          });
          return;
        }
        
        setOrg(r.data.org);
        setSports(r.data.sports || []);
        
        // Populate existing data
        if (r.data.org?.brand_primary) setBrandPrimary(r.data.org.brand_primary);
        if (r.data.org?.brand_secondary) setBrandSecondary(r.data.org.brand_secondary);
        if (r.data.org?.logo_url) {
          setLogoPreview(r.data.org.logo_url);
        }
        
        // Set existing address info
        if (r.data.org) {
          setAddress(r.data.org.address || '');
          setCity(r.data.org.city || '');
          setState(r.data.org.state || '');
          setZip(r.data.org.zip || '');
        }
        
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || 'Failed to load organization data',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  // Logo upload handlers
  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    // Preview the image immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    setUploadingLogo(true);
    try {
      const uploadResult = await api.post(`/api/v1/organizations/${id}/logo`, {
        method: 'POST',
        body: file
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error?.message || 'Logo upload failed');
      }

      toast({
        title: "Logo uploaded",
        description: "Your organization logo has been uploaded successfully."
      });

    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || 'Failed to upload logo',
        variant: "destructive"
      });
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sports contact management
  const addSportContact = () => {
    const sportName = AVAILABLE_SPORTS.find(s => s.id === selectedSportId)?.name;
    
    if (!selectedSportId || !sportName || !contactName || !contactEmail) {
      toast({
        title: "Missing Information",
        description: "Please select a sport and enter contact name and email.",
        variant: "destructive"
      });
      return;
    }

    const newContact: SportContact = {
      id: Date.now().toString(),
      sportId: selectedSportId,
      sportName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    };

    setSports([...sports, newContact]);
    
    // Reset form
    setSelectedSportId('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
  };

  const removeSportContact = (id: string) => {
    setSports(sports.filter(s => s.id !== id));
  };

  // Save all setup data
  const handleSave = async () => {
    if (!id) return;

    // Validate required fields
    if (!address || !city || !state || !zip) {
      toast({
        title: "Missing Address",
        description: "Please fill in all address fields.",
        variant: "destructive"
      });
      return;
    }

    // Non-business organizations require at least one sport
    if (!org?.is_business && sports.length === 0) {
      toast({
        title: "Sports Required",
        description: "Non-business organizations must have at least one sport with contact.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Update organization with essential fields using setup endpoint
      const updatePayload = {
        address,
        city,
        state,
        zip,
        brand_primary: brandPrimary,
        brand_secondary: brandSecondary,
        complete: true
      };
      
      const updateResult = await api.post(`/api/v1/organizations/${id}/setup`, updatePayload);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error?.message || 'Failed to update organization');
      }

      // Save sports and contacts (this will auto-create users)
      if (sports.length > 0) {
        const sportsResult = await api.post(`/api/v1/organizations/${id}/sports`, {
          sports: sports.map(s => ({
            sport_id: s.sportId,
            contact_name: s.contact_name,
            contact_email: s.contact_email,
            contact_phone: s.contact_phone
          }))
        });

        if (!sportsResult.success) {
          console.warn('Sports save failed:', sportsResult.error);
          // Don't fail the whole setup for this
        }
      }
      
      toast({
        title: "Setup completed!",
        description: "Your organization setup has been completed successfully.",
        duration: 5000
      });
      
      nav(`/organizations/${id}`);
      
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || 'Failed to save organization setup',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white/70">Loading organization setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Organization Setup
            </h1>
          </div>
          <p className="text-white/70 text-lg">
            Complete your organization setup with essential information
          </p>
          {org && (
            <div className="mt-4">
              <h2 className="text-2xl text-white font-semibold">{org.name}</h2>
              <p className="text-white/50">{org.is_business ? 'Business' : 'School'} Organization</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Logo and Branding Section */}
          <div className="glass-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <Palette className="w-6 h-6 text-cyan-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Logo & Brand Colors</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label className="text-white font-medium">Organization Logo</Label>
                
                {logoPreview ? (
                  <div className="relative w-32 h-32 mx-auto">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded-xl border border-white/20 bg-white/5"
                      data-testid="img-logo-preview"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      data-testid="button-remove-logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-full h-32 border-2 border-dashed border-white/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors bg-white/5"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="div-logo-upload-area"
                  >
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-2"></div>
                        <p className="text-white/70 text-sm">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-white/50 mb-2" />
                        <p className="text-white/70 text-sm">Click to upload logo</p>
                        <p className="text-white/50 text-xs mt-1">PNG, JPG, SVG up to 5MB</p>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.svg"
                  onChange={handleLogoFileChange}
                  className="hidden"
                  data-testid="input-logo-file"
                />
              </div>

              {/* Brand Colors */}
              <div className="space-y-4">
                <div>
                  <Label className="text-white font-medium mb-2 block">Primary Brand Color</Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={brandPrimary}
                      onChange={(e) => setBrandPrimary(e.target.value)}
                      className="w-12 h-12 rounded-lg border border-white/20 cursor-pointer"
                      data-testid="input-brand-primary-color"
                    />
                    <Input
                      value={brandPrimary}
                      onChange={(e) => setBrandPrimary(e.target.value)}
                      placeholder="#3B82F6"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                      data-testid="input-brand-primary-text"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white font-medium mb-2 block">Secondary Brand Color</Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={brandSecondary}
                      onChange={(e) => setBrandSecondary(e.target.value)}
                      className="w-12 h-12 rounded-lg border border-white/20 cursor-pointer"
                      data-testid="input-brand-secondary-color"
                    />
                    <Input
                      value={brandSecondary}
                      onChange={(e) => setBrandSecondary(e.target.value)}
                      placeholder="#8B5CF6"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                      data-testid="input-brand-secondary-text"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="glass-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <MapPin className="w-6 h-6 text-cyan-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Address Information</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-white font-medium mb-2 block">Full Address *</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-address"
                  required
                />
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">City *</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Springfield"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-city"
                  required
                />
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">State/Province *</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="IL"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-state"
                  required
                />
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">ZIP/Postal Code *</Label>
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="62701"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-zip"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sports and Contacts Section */}
          <div className="glass-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <Building className="w-6 h-6 text-cyan-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Sports & Contacts</h3>
            </div>

            <p className="text-white/70 mb-6">
              {org?.is_business 
                ? "Add sports and contact information (optional for businesses)"
                : "Add one or more sports with contact information (required for schools)"}
            </p>

            {/* Add Sport Form */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-white font-medium mb-2 block">Sport</Label>
                <select
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:border-cyan-500/50"
                  data-testid="select-sport"
                >
                  <option value="">Select a sport...</option>
                  {AVAILABLE_SPORTS.filter((sport: any) => !sports.some((s: SportContact) => s.sportId === sport.id)).map((sport: any) => (
                    <option key={sport.id} value={sport.id} className="bg-gray-800">
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">Contact Name</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Smith"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-contact-name"
                />
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">Contact Email</Label>
                <Input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@school.edu"
                  type="email"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-contact-email"
                />
              </div>

              <div>
                <Label className="text-white font-medium mb-2 block">Contact Phone (Optional)</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                  data-testid="input-contact-phone"
                />
              </div>
            </div>

            <Button
              onClick={addSportContact}
              disabled={!selectedSportId || !contactName || !contactEmail}
              className="mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              data-testid="button-add-sport"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sport Contact
            </Button>

            {/* Sports List */}
            {sports.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Added Sports & Contacts:</h4>
                {sports.map((sport) => (
                  <div key={sport.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4 border border-white/10">
                    <div>
                      <div className="text-white font-medium">{sport.sportName}</div>
                      <div className="text-white/70 text-sm">{sport.contact_name} - {sport.contact_email}</div>
                      {sport.contact_phone && <div className="text-white/50 text-sm">{sport.contact_phone}</div>}
                    </div>
                    <Button
                      onClick={() => removeSportContact(sport.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                      data-testid={`button-remove-sport-${sport.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
              data-testid="button-save-setup"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-5 h-5 mr-2" />
                  Complete Setup
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}