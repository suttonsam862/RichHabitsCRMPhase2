import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  Sparkles,
  Search,
  User
} from 'lucide-react';
import { ObjectUploader } from "@/components/ObjectUploader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Sports data will be fetched dynamically from API

interface SportContact {
  id: string;
  sport_id: string;
  sportName: string;
  teamName: string; // Team name field
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  user_id?: string; // For existing users
  assigned_salesperson_id?: string; // For salesperson assignment
}

type SportRow = { sportId:string; contactName:string; contactEmail:string; contactPhone:string; teamName:string; assignedSalespersonId?:string; saved:boolean };

const contactSchema = z.object({
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().optional(),
  team_name: z.string().min(1, "Team name is required"),
  assigned_salesperson_id: z.string().optional(),
});

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
  // File upload now handled by ObjectUploader component

  // Essential address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Sports and contacts
  const [sports, setSports] = useState<SportContact[]>([]);
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(''); // For selecting existing users
  const [contactMode, setContactMode] = useState<'new' | 'existing'>('new');
  const [userSearch, setUserSearch] = useState("");

  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      team_name: "Main Team",
      assigned_salesperson_id: "",
    },
  });

  // Fetch existing users for selection (filter by contact role)
  const { data: existingUsersData = {}, isLoading: usersLoading } = useQuery({
    queryKey: ['users-contacts'],
    queryFn: () => api.get('/api/v1/users/enhanced?type=customers&pageSize=100'),
  });

  const existingUsers = existingUsersData?.data?.users || existingUsersData?.data || [];

  // Fetch staff/sales users for salesperson assignment
  const { data: salespeopleData = {}, isLoading: salespeopleLoading } = useQuery({
    queryKey: ['users-salespeople'],
    queryFn: () => api.get('/api/v1/users/enhanced?type=staff&pageSize=100'),
  });

  const salespeople = salespeopleData?.data?.users || salespeopleData?.data || [];

  // Fetch available sports from API
  const {
    data: sportsData,
    isLoading: sportsLoading,
    error: sportsError
  } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/v1/sports');
        // Ensure response.data is an array, if not, default to empty array
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.warn('Failed to fetch sports:', error);
        return [];
      }
    },
  });

  // Use the fetched sports data, ensuring it's an array
  const availableSports = Array.isArray(sportsData) ? sportsData : [];

  // Filter out sports that have already been added
  const filteredSports = availableSports.filter(
    (sport: any) => !sports.some((s) => s.sport_id === sport.id)
  );

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

  // Logo upload handler
  const handleLogoUpload = (logoUrl: string) => {
    if (logoUrl) {
      setLogoPreview(logoUrl);
      toast({
        title: "Logo uploaded",
        description: "Your organization logo has been uploaded successfully."
      });
    } else {
      toast({
        title: "Upload failed",
        description: 'Failed to upload logo',
        variant: "destructive"
      });
      setLogoPreview(null);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
  };

  // Sports contact management
  const addSportContact = () => {
    const formValues = form.getValues();

    let contactData;

    if (contactMode === 'new') {
      if (!formValues.contact_name || !formValues.contact_email || !formValues.team_name) {
        toast({
          title: "Missing information",
          description: "Please fill in all required contact fields including team name.",
          variant: "destructive",
        });
        return;
      }
      contactData = {
        contact_name: formValues.contact_name,
        contact_email: formValues.contact_email,
        contact_phone: formValues.contact_phone || "",
        team_name: formValues.team_name,
        assigned_salesperson_id: formValues.assigned_salesperson_id || null
      };
    } else {
      const selectedUser = existingUsers.find((u: any) => u.id === selectedUserId);
      if (!selectedUser || !formValues.team_name) {
        toast({
          title: "Missing information",
          description: "Please select an existing user and provide team name.",
          variant: "destructive",
        });
        return;
      }
      contactData = {
        contact_name: selectedUser.fullName || selectedUser.name || 'Unknown User',
        contact_email: selectedUser.email,
        contact_phone: selectedUser.phone || "",
        userId: selectedUser.id,
        team_name: formValues.team_name,
        assigned_salesperson_id: formValues.assigned_salesperson_id || null
      };
    }

    const sportName = availableSports.find((s: any) => s.id === selectedSportId)?.name;

    const newContact: SportContact = {
      id: Math.random().toString(36).substring(7), // Temporary unique ID
      sport_id: selectedSportId,
      sportName: sportName || 'Unknown Sport',
      ...contactData
    };

    setSports([...sports, newContact]);

    // Reset form and selection
    form.reset({
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      team_name: "Main Team",
      assigned_salesperson_id: "",
    });
    setSelectedSportId("");
    setSelectedUserId("");
    setContactMode('new'); // Reset to new contact mode
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
        variant: "destructive",
      });
      return;
    }

    // Non-business organizations require at least one sport
    if (!org?.is_business && sports.length === 0) {
      toast({
        title: "Sports Required",
        description: "Non-business organizations must have at least one sport with contact.",
        variant: "destructive",
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
        logo_url: logoPreview, // Save the uploaded logo URL
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
            sport_id: s.sport_id,
            team_name: s.teamName || 'Main Team', // Include team_name field
            contact_name: s.contact_name,
            contact_email: s.contact_email,
            contact_phone: s.contact_phone,
            assigned_salesperson_id: s.assigned_salesperson_id || null, // Include salesperson ID
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
                  <div className="flex justify-center">
                    <ObjectUploader
                      onUploadComplete={handleLogoUpload}
                      organizationId={id}
                      className="w-full max-w-xs"
                    />
                  </div>
                )}
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
            <div className="space-y-6 mb-6">
              {/* Sport Selection */}
              <div>
                <Label className="text-white font-medium mb-2 block">Sport</Label>
                <select
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:border-cyan-500/50"
                  data-testid="select-sport"
                  disabled={sportsLoading}
                >
                  <option value="">
                    {sportsLoading ? "Loading sports..." : sportsError ? "Error loading sports" : "Select a sport..."}
                  </option>
                  {(filteredSports || []).map((sport: any) => (
                    <option key={sport.id} value={sport.id} className="bg-gray-800">
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Form Tabs */}
              <Tabs defaultValue={contactMode} onValueChange={(value: any) => setContactMode(value)}>
                <TabsList className="grid w-full grid-cols-2 bg-white/10 mb-4">
                  <TabsTrigger value="new" className="text-white">Add New Contact</TabsTrigger>
                  <TabsTrigger value="existing" className="text-white">Select Existing User</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Contact Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter contact name"
                                className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                                data-testid="input-contact-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>

                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Contact Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email address"
                                className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                                data-testid="input-contact-email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="team_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Team Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter team name"
                                className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                                data-testid="input-team-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>

                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Contact Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="Enter phone number"
                                className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                                data-testid="input-contact-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  </div>

                  <div className="mt-4">
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="assigned_salesperson_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Assign Salesperson (Optional)</FormLabel>
                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400" data-testid="select-salesperson">
                                  <SelectValue placeholder="Select salesperson" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-gray-800 border-white/20">
                                <SelectItem value="" className="text-white focus:bg-white/10">No assignment</SelectItem>
                                {salespeopleLoading ? (
                                  <div className="p-2 text-white/60 text-sm">Loading salespeople...</div>
                                ) : salespeople.length === 0 ? (
                                  <div className="p-2 text-white/60 text-sm">No salespeople available</div>
                                ) : (
                                  salespeople.map((person: any) => (
                                    <SelectItem key={person.id} value={person.id} className="text-white focus:bg-white/10">
                                      {person.fullName || person.name || 'Unknown User'} ({person.email})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  </div>
                </TabsContent>

                <TabsContent value="existing" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-white text-sm font-medium">Select User</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400 mt-2" data-testid="select-existing-user">
                          <SelectValue placeholder="Choose an existing user" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-white/20">
                          {usersLoading ? (
                            <div className="p-2 text-white/60 text-sm">Loading users...</div>
                          ) : existingUsers.length === 0 ? (
                            <div className="p-2 text-white/60 text-sm">No users available</div>
                          ) : (
                            existingUsers.map((user: any) => (
                              <SelectItem key={user.id} value={user.id} className="text-white focus:bg-white/10">
                                {user.fullName || user.name || 'Unknown User'} ({user.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form {...form}>
                        <FormField
                          control={form.control}
                          name="team_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Team Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter team name"
                                  className="bg-white/5 text-white border-white/20 focus:border-cyan-400"
                                  data-testid="input-team-name-existing"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Form>

                      <Form {...form}>
                        <FormField
                          control={form.control}
                          name="assigned_salesperson_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Assign Salesperson (Optional)</FormLabel>
                              <Select value={field.value || undefined} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="bg-white/5 text-white border-white/20 focus:border-cyan-400" data-testid="select-salesperson-existing">
                                    <SelectValue placeholder="Select salesperson" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-gray-800 border-white/20">
                                  <SelectItem value="" className="text-white focus:bg-white/10">No assignment</SelectItem>
                                  {salespeopleLoading ? (
                                    <div className="p-2 text-white/60 text-sm">Loading salespeople...</div>
                                  ) : salespeople.length === 0 ? (
                                    <div className="p-2 text-white/60 text-sm">No salespeople available</div>
                                  ) : (
                                    salespeople.map((person: any) => (
                                      <SelectItem key={person.id} value={person.id} className="text-white focus:bg-white/10">
                                        {person.fullName || person.name || 'Unknown User'} ({person.email})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Form>
                    </div>

                    {selectedUserId && (
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-medium mb-2">Selected User Details</h4>
                        {(() => {
                          const user = existingUsers.find((u: any) => u.id === selectedUserId);
                          return user ? (
                            <div className="space-y-1 text-sm text-white/80">
                              <p><strong>Name:</strong> {user.fullName || user.name || 'Unknown User'}</p>
                              <p><strong>Email:</strong> {user.email}</p>
                              {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

            </div>

            <Button
              onClick={addSportContact}
              disabled={!selectedSportId || filteredSports.length === 0 || !form.watch("team_name") || (contactMode === 'new' ? (!form.watch("contact_name") || !form.watch("contact_email")) : !selectedUserId)}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 mt-4"
              data-testid="button-add-sport"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sport to List
            </Button>

            {/* Sports List */}
            {sports.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="text-white font-medium">Added Sports & Contacts:</h4>
                {sports.map((sport) => (
                  <div key={sport.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4 border border-white/10">
                    <div>
                      <h4 className="font-semibold text-white">{sport.sportName}</h4>
                      <div className="text-white/70 text-sm">
                        <div><strong>Team:</strong> {sport.teamName}</div>
                        <div><strong>Contact:</strong> {sport.contact_name} • {sport.contact_email}
                        {sport.contact_phone && ` • ${sport.contact_phone}`}</div>
                        {sport.assigned_salesperson_id && (
                          <div><strong>Salesperson:</strong> {(() => {
                            const sp = salespeople.find((p: any) => p.id === sport.assigned_salesperson_id);
                            return sp ? (sp.fullName || sp.name || 'Unknown') : 'Unknown';
                          })()}</div>
                        )}
                      </div>
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