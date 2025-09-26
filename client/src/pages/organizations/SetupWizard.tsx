import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Palette, 
  Mail, 
  FileText, 
  MapPin, 
  Phone, 
  Globe,
  CreditCard,
  Truck,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  Sparkles,
  ImageIcon,
  X
} from 'lucide-react';

export default function SetupWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  
  // Basic org data
  const [org, setOrg] = useState<any>();
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Branding
  const [brandPrimary, setBrandPrimary] = useState('#6EE7F9');
  const [brandSecondary, setBrandSecondary] = useState('#A78BFA');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Organization Details
  const [orgDetails, setOrgDetails] = useState({
    website: '',
    description: '',
    foundedYear: '',
    employeeCount: '',
    industry: '',
    timezone: 'America/New_York'
  });
  
  // Contact & Address
  const [contactInfo, setContactInfo] = useState({
    mainPhone: '',
    mainEmail: '',
    supportEmail: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  
  // Finance & Legal
  const [financeInfo, setFinanceInfo] = useState({
    financeEmail: '',
    accountingEmail: '',
    taxId: '',
    businessLicense: '',
    isNonProfit: false,
    hasTaxExemption: false
  });
  
  // Tax exemption file
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [taxFileKey, setTaxFileKey] = useState<string>('');
  const [uploadingTax, setUploadingTax] = useState(false);
  
  // Social & Marketing
  const [socialInfo, setSocialInfo] = useState({
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    youtubeUrl: '',
    marketingEmail: ''
  });
  
  // Setup completion tracking
  const [completedSections, setCompletedSections] = useState({
    branding: false,
    details: false,
    contact: false,
    finance: false,
    social: false
  });

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
          // Convert relative storage path to proper URL if needed
          const logoUrl = r.data.org.logo_url;
          if (logoUrl && !logoUrl.startsWith('http')) {
            // For now use a placeholder, will be fixed when storage URLs are resolved
            setLogoPreview(`https://via.placeholder.com/128x128/6EE7F9/ffffff?text=LOGO`);
          } else {
            setLogoPreview(logoUrl);
          }
        }
        
        // Set existing contact info from org data
        if (r.data.org) {
          setContactInfo(prev => ({
            ...prev,
            mainPhone: r.data.org.phone || '',
            mainEmail: r.data.org.email || '',
            address: r.data.org.address || ''
          }));
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
    
    setUploadingLogo(true);
    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      
      // Upload to server
      const signResponse = await api.post(`/api/v1/organizations/${id}/logo/sign`, { 
        fileName: file.name 
      });
      
      if (!signResponse.success) {
        throw new Error(signResponse.error?.message || 'Failed to get upload URL');
      }
      
      await fetch(signResponse.data.uploadUrl, { 
        method: 'PUT', 
        body: file 
      });
      
      await api.post(`/api/v1/organizations/${id}/logo/apply`, { 
        key: signResponse.data.key 
      });
      
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

  // Tax file upload handlers
  const handleTaxFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    
    setTaxFile(file);
    setUploadingTax(true);
    
    try {
      const signResponse = await api.post(`/api/v1/organizations/${id}/tax/sign`, { 
        fileName: file.name 
      });
      
      if (!signResponse.success) {
        throw new Error(signResponse.error?.message || 'Failed to get upload URL');
      }
      
      await fetch(signResponse.data.uploadUrl, { 
        method: 'PUT', 
        body: file 
      });
      
      const applyResponse = await api.post(`/api/v1/organizations/${id}/tax/apply`, { 
        key: signResponse.data.key 
      });
      
      if (applyResponse.success) {
        setTaxFileKey(signResponse.data.key);
        toast({
          title: "Tax document uploaded",
          description: "Your tax exemption document has been uploaded successfully."
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || 'Failed to upload tax document',
        variant: "destructive"
      });
      setTaxFile(null);
    } finally {
      setUploadingTax(false);
    }
  };

  // Save all setup data
  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      // Save branding and comprehensive setup data
      const setupPayload = {
        brand_primary: brandPrimary,
        brand_secondary: brandSecondary,
        finance_email: financeInfo.financeEmail || undefined,
        address: contactInfo.address || undefined,
        city: contactInfo.city || undefined,
        state: contactInfo.state || undefined,
        zip: contactInfo.zipCode || undefined,
        complete: true,
        setup_complete: true,
        setup_completed_at: new Date().toISOString()
      };
      
      const setupResult = await api.post(`/api/v1/organizations/${id}/setup`, setupPayload);
      
      if (!setupResult.success) {
        throw new Error(setupResult.error?.message || 'Failed to save setup');
      }
      
      // Update organization with comprehensive details using PATCH
      const updatePayload = {
        phone: contactInfo.mainPhone || undefined,
        email: contactInfo.mainEmail || undefined,
        website: orgDetails.website || undefined,
        notes: [
          orgDetails.description && `Description: ${orgDetails.description}`,
          orgDetails.foundedYear && `Founded: ${orgDetails.foundedYear}`,
          orgDetails.employeeCount && `Employees: ${orgDetails.employeeCount}`,
          orgDetails.industry && `Industry: ${orgDetails.industry}`,
          orgDetails.timezone && `Timezone: ${orgDetails.timezone}`,
          contactInfo.supportEmail && `Support Email: ${contactInfo.supportEmail}`,
          contactInfo.country && `Country: ${contactInfo.country}`,
          financeInfo.accountingEmail && `Accounting Email: ${financeInfo.accountingEmail}`,
          financeInfo.taxId && `Tax ID: ${financeInfo.taxId}`,
          financeInfo.businessLicense && `Business License: ${financeInfo.businessLicense}`,
          financeInfo.isNonProfit && `Non-Profit: Yes`,
          financeInfo.hasTaxExemption && `Tax Exemption: Yes`,
          socialInfo.facebookUrl && `Facebook: ${socialInfo.facebookUrl}`,
          socialInfo.twitterUrl && `Twitter: ${socialInfo.twitterUrl}`,
          socialInfo.instagramUrl && `Instagram: ${socialInfo.instagramUrl}`,
          socialInfo.linkedinUrl && `LinkedIn: ${socialInfo.linkedinUrl}`,
          socialInfo.youtubeUrl && `YouTube: ${socialInfo.youtubeUrl}`,
          socialInfo.marketingEmail && `Marketing Email: ${socialInfo.marketingEmail}`
        ].filter(Boolean).join('\n') || undefined
      };
      
      // Remove undefined values
      Object.keys(updatePayload).forEach(key => 
        updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
      );
      
      console.log('Update payload:', updatePayload);
      
      const updateResult = await api.patch(`/api/v1/organizations/${id}`, updatePayload);
      
      if (!updateResult.success) {
        console.error('Update failed:', updateResult);
        throw new Error(updateResult.error?.message || 'Failed to update organization details');
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

  if (!org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/70">Failed to load organization data</p>
          <Button 
            onClick={() => nav('/organizations')} 
            variant="ghost" 
            className="mt-4 text-cyan-400 hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => nav(`/organizations/${id}`)} 
              variant="ghost" 
              className="text-white hover:text-cyan-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Complete Setup
              </h1>
              <p className="text-white/70 mt-1">{org.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <span className="text-white/60">Comprehensive Setup</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Branding Section */}
            <GlowCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <Palette className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Branding & Identity</h2>
                  <p className="text-white/60 text-sm">Define your organization's visual identity</p>
                </div>
              </div>

              <div className="space-y-6">
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-white font-medium">Primary Brand Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        className="w-16 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                        data-testid="input-brand-primary-color"
                      />
                      <Input
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        placeholder="#6EE7F9"
                        className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-cyan-500/50"
                        data-testid="input-brand-primary-hex"
                      />
                    </div>
                    <div 
                      className="w-full h-8 rounded-lg border border-white/20"
                      style={{ backgroundColor: brandPrimary }}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white font-medium">Secondary Brand Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        className="w-16 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                        data-testid="input-brand-secondary-color"
                      />
                      <Input
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        placeholder="#A78BFA"
                        className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-purple-500/50"
                        data-testid="input-brand-secondary-hex"
                      />
                    </div>
                    <div 
                      className="w-full h-8 rounded-lg border border-white/20"
                      style={{ backgroundColor: brandSecondary }}
                    />
                  </div>
                </div>

                {/* Brand Preview */}
                <div className="space-y-3">
                  <Label className="text-white font-medium">Brand Preview</Label>
                  <div 
                    className="w-full h-16 rounded-xl border border-white/20 flex items-center justify-center text-white font-semibold"
                    style={{ 
                      background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)` 
                    }}
                  >
                    {org.name}
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Organization Details */}
            <GlowCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                  <Building className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Organization Details</h2>
                  <p className="text-white/60 text-sm">Provide comprehensive information about your organization</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-white font-medium">Website URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="url"
                      value={orgDetails.website}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-blue-500/50 pl-10"
                      data-testid="input-website"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Industry</Label>
                  <Input
                    value={orgDetails.industry}
                    onChange={(e) => setOrgDetails(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Education, Healthcare, Technology"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-blue-500/50"
                    data-testid="input-industry"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Founded Year</Label>
                  <Input
                    type="number"
                    value={orgDetails.foundedYear}
                    onChange={(e) => setOrgDetails(prev => ({ ...prev, foundedYear: e.target.value }))}
                    placeholder="2020"
                    min="1800"
                    max="2024"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-blue-500/50"
                    data-testid="input-founded-year"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Employee Count</Label>
                  <Input
                    value={orgDetails.employeeCount}
                    onChange={(e) => setOrgDetails(prev => ({ ...prev, employeeCount: e.target.value }))}
                    placeholder="e.g., 1-10, 50-100, 500+"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-blue-500/50"
                    data-testid="input-employee-count"
                  />
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <Label className="text-white font-medium">Organization Description</Label>
                <Textarea
                  value={orgDetails.description}
                  onChange={(e) => setOrgDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a brief description of your organization's mission, services, and goals..."
                  rows={4}
                  className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-blue-500/50"
                  data-testid="textarea-description"
                />
              </div>
            </GlowCard>

            {/* Contact Information */}
            <GlowCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <Phone className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Contact & Address</h2>
                  <p className="text-white/60 text-sm">Primary contact information and location details</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-white font-medium">Main Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="tel"
                      value={contactInfo.mainPhone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, mainPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50 pl-10"
                      data-testid="input-main-phone"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Main Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="email"
                      value={contactInfo.mainEmail}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, mainEmail: e.target.value }))}
                      placeholder="info@yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50 pl-10"
                      data-testid="input-main-email"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Support Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="email"
                      value={contactInfo.supportEmail}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, supportEmail: e.target.value }))}
                      placeholder="support@yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50 pl-10"
                      data-testid="input-support-email"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">City</Label>
                  <Input
                    value={contactInfo.city}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="New York"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50"
                    data-testid="input-city"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">State/Province</Label>
                  <Input
                    value={contactInfo.state || ''}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="NY"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50"
                    data-testid="input-state"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">ZIP/Postal Code</Label>
                  <Input
                    value={contactInfo.zipCode}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="10001"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50"
                    data-testid="input-zip"
                  />
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <Label className="text-white font-medium">Full Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Textarea
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main Street, Suite 100"
                    rows={3}
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-green-500/50 pl-10"
                    data-testid="textarea-address"
                  />
                </div>
              </div>
            </GlowCard>

            {/* Finance & Legal */}
            <GlowCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                  <CreditCard className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Finance & Legal Information</h2>
                  <p className="text-white/60 text-sm">Financial contacts and legal documentation</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-white font-medium">Finance Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="email"
                      value={financeInfo.financeEmail}
                      onChange={(e) => setFinanceInfo(prev => ({ ...prev, financeEmail: e.target.value }))}
                      placeholder="finance@yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-yellow-500/50 pl-10"
                      data-testid="input-finance-email"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Accounting Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="email"
                      value={financeInfo.accountingEmail}
                      onChange={(e) => setFinanceInfo(prev => ({ ...prev, accountingEmail: e.target.value }))}
                      placeholder="accounting@yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-yellow-500/50 pl-10"
                      data-testid="input-accounting-email"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Tax ID / EIN</Label>
                  <Input
                    value={financeInfo.taxId}
                    onChange={(e) => setFinanceInfo(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="12-3456789"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-yellow-500/50"
                    data-testid="input-tax-id"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Business License #</Label>
                  <Input
                    value={financeInfo.businessLicense}
                    onChange={(e) => setFinanceInfo(prev => ({ ...prev, businessLicense: e.target.value }))}
                    placeholder="BL-123456789"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-yellow-500/50"
                    data-testid="input-business-license"
                  />
                </div>
              </div>

              {/* Organization Type Switches */}
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5">
                  <div>
                    <Label className="text-white font-medium">Non-Profit Organization</Label>
                    <p className="text-white/60 text-sm">Is this a registered non-profit?</p>
                  </div>
                  <Switch
                    checked={financeInfo.isNonProfit}
                    onCheckedChange={(checked) => setFinanceInfo(prev => ({ ...prev, isNonProfit: checked }))}
                    data-testid="switch-nonprofit"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5">
                  <div>
                    <Label className="text-white font-medium">Tax Exemption</Label>
                    <p className="text-white/60 text-sm">Do you have tax exemption status?</p>
                  </div>
                  <Switch
                    checked={financeInfo.hasTaxExemption}
                    onCheckedChange={(checked) => setFinanceInfo(prev => ({ ...prev, hasTaxExemption: checked }))}
                    data-testid="switch-tax-exemption"
                  />
                </div>
              </div>

              {/* Tax Exemption Document Upload */}
              {financeInfo.hasTaxExemption && (
                <div className="space-y-3 mt-6">
                  <Label className="text-white font-medium">Tax Exemption Document</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      onClick={() => document.getElementById('tax-file-input')?.click()}
                      disabled={uploadingTax}
                      data-testid="button-upload-tax-doc"
                    >
                      {uploadingTax ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </Button>
                    {taxFile && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-white/70 text-sm">{taxFile.name}</span>
                      </div>
                    )}
                    {taxFileKey && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        Uploaded
                      </Badge>
                    )}
                  </div>
                  <input
                    id="tax-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleTaxFileChange}
                    className="hidden"
                    data-testid="input-tax-file"
                  />
                </div>
              )}
            </GlowCard>

            {/* Social Media & Marketing */}
            <GlowCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                  <Globe className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Social Media & Marketing</h2>
                  <p className="text-white/60 text-sm">Connect your social media presence and marketing channels</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-white font-medium">Facebook URL</Label>
                  <Input
                    type="url"
                    value={socialInfo.facebookUrl}
                    onChange={(e) => setSocialInfo(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    placeholder="https://facebook.com/yourorg"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50"
                    data-testid="input-facebook"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Twitter/X URL</Label>
                  <Input
                    type="url"
                    value={socialInfo.twitterUrl}
                    onChange={(e) => setSocialInfo(prev => ({ ...prev, twitterUrl: e.target.value }))}
                    placeholder="https://twitter.com/yourorg"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50"
                    data-testid="input-twitter"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Instagram URL</Label>
                  <Input
                    type="url"
                    value={socialInfo.instagramUrl}
                    onChange={(e) => setSocialInfo(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    placeholder="https://instagram.com/yourorg"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50"
                    data-testid="input-instagram"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">LinkedIn URL</Label>
                  <Input
                    type="url"
                    value={socialInfo.linkedinUrl}
                    onChange={(e) => setSocialInfo(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/company/yourorg"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50"
                    data-testid="input-linkedin"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">YouTube URL</Label>
                  <Input
                    type="url"
                    value={socialInfo.youtubeUrl}
                    onChange={(e) => setSocialInfo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/@yourorg"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50"
                    data-testid="input-youtube"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-medium">Marketing Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="email"
                      value={socialInfo.marketingEmail}
                      onChange={(e) => setSocialInfo(prev => ({ ...prev, marketingEmail: e.target.value }))}
                      placeholder="marketing@yourorganization.com"
                      className="bg-white/5 border-white/20 text-white placeholder-white/40 focus:border-pink-500/50 pl-10"
                      data-testid="input-marketing-email"
                    />
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Sidebar - Progress & Actions */}
          <div className="space-y-6">
            {/* Progress Summary */}
            <GlowCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <h3 className="font-semibold">Setup Progress</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Branding & Identity</span>
                  <Badge variant={brandPrimary && brandSecondary ? "default" : "secondary"}>
                    {brandPrimary && brandSecondary ? "Complete" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Contact Information</span>
                  <Badge variant={contactInfo.mainEmail && contactInfo.mainPhone ? "default" : "secondary"}>
                    {contactInfo.mainEmail && contactInfo.mainPhone ? "Complete" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Organization Details</span>
                  <Badge variant={orgDetails.description ? "default" : "secondary"}>
                    {orgDetails.description ? "Complete" : "Optional"}
                  </Badge>
                </div>
              </div>
            </GlowCard>

            {/* Quick Actions */}
            <GlowCard className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                  onClick={() => nav(`/organizations/${id}`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  View Organization
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.print()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Print Setup Summary
                </Button>
              </div>
            </GlowCard>

            {/* Sports Information */}
            {sports.length > 0 && (
              <GlowCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold">Associated Sports</h3>
                </div>
                <div className="space-y-2">
                  {sports.map((sport, idx) => (
                    <div key={idx} className="text-white/70 text-sm">
                      • {sport.name || `Sport ${idx + 1}`}
                    </div>
                  ))}
                </div>
              </GlowCard>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => nav('/organizations')}
            className="text-white/70 hover:text-white"
          >
            Cancel Setup
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={saving || !brandPrimary || !brandSecondary}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
            data-testid="button-complete-setup"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving Setup...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Complete Setup
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}