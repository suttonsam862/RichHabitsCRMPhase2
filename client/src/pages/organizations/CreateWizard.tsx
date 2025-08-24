import { useState } from 'react'; 
import { api } from '@/lib/api'; 
import GlowCard from '@/components/ui/GlowCard';
import { Link, useNavigate } from 'react-router-dom';

type SportRow = { sportId:string; contactName:string; contactEmail:string };

export default function CreateWizard(){
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(''); 
  const [isBusiness, setIsBusiness] = useState(false);
  const [brandPrimary, setBrandPrimary] = useState('#6EE7F9'); 
  const [brandSecondary, setBrandSecondary] = useState('#A78BFA');
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [emailDomain, setEmailDomain] = useState(''); 
  const [billingEmail, setBillingEmail] = useState('');
  const [tags, setTags] = useState<string>(''); // comma-separated
  const [sports, setSports] = useState<SportRow[]>([]);
  const [msg, setMsg] = useState<string|undefined>(); 
  const [err, setErr] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);

  function addSport(){ 
    setSports([...sports, { sportId:'', contactName:'', contactEmail:'' }]); 
  }
  
  function updateSport(i:number, patch:Partial<SportRow>){ 
    setSports(sports.map((s,idx)=> idx===i ? { ...s, ...patch } : s)); 
  }
  
  function removeSport(i:number) {
    setSports(sports.filter((_, idx) => idx !== i));
  }

  async function submit(){
    setLoading(true);
    setErr(undefined);
    setMsg(undefined);
    
    const payload = {
      name, 
      isBusiness,
      brandPrimary, 
      brandSecondary, 
      colorPalette,
      emailDomain: emailDomain || undefined,
      billingEmail: billingEmail || undefined,
      tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
      sports: isBusiness ? [] : sports.filter(s=>s.sportId && s.contactEmail && s.contactName)
    };
    
    const r = await api.post('/api/v1/organizations', payload);
    setLoading(false);
    
    if(!r.success){ 
      setErr(r.error?.message || 'Failed to create organization'); 
      return; 
    }
    
    setMsg('Organization created successfully!');
    // Navigate to the organization page
    setTimeout(() => {
      navigate(`/organizations/${r.data.id}`);
    }, 1500);
  }

  const previewGradient = `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              to="/organizations" 
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              ← Back to Organizations
            </Link>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Create Organization
          </h1>
          <p className="text-white/60 mt-2">Set up your new organization with custom branding</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2, 3].map(num => (
            <div key={num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= num 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                  : 'bg-white/10 text-white/50'
              }`}>
                {num}
              </div>
              {num < 3 && (
                <div className={`w-12 h-px mx-2 transition-colors ${
                  step > num ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>

        <GlowCard className="p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Organization Name</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                  value={name} 
                  onChange={e=>setName(e.target.value)}
                  placeholder="Enter organization name..."
                  data-testid="input-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Organization Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={`p-4 rounded-xl border-2 transition-all ${
                      !isBusiness 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                    onClick={() => setIsBusiness(false)}
                    data-testid="button-type-organization"
                  >
                    <div className="text-lg font-semibold">Organization</div>
                    <div className="text-sm text-white/60">Schools, clubs, teams</div>
                  </button>
                  <button
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isBusiness 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                    onClick={() => setIsBusiness(true)}
                    data-testid="button-type-business"
                  >
                    <div className="text-lg font-semibold">Business</div>
                    <div className="text-sm text-white/60">Companies, enterprises</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Domain (Optional)</label>
                  <input 
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                    value={emailDomain} 
                    onChange={e=>setEmailDomain(e.target.value)}
                    placeholder="example.com"
                    data-testid="input-email-domain"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Billing Email (Optional)</label>
                  <input 
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                    value={billingEmail} 
                    onChange={e=>setBillingEmail(e.target.value)}
                    placeholder="billing@example.com"
                    data-testid="input-billing-email"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                  data-testid="button-next-step1"
                >
                  Next: Branding
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Brand Colors</h2>
              
              {/* Preview */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="h-32 rounded-xl" style={{ background: previewGradient }}>
                  <div className="h-full flex items-center justify-center text-white font-semibold text-xl">
                    {name || 'Your Organization'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Brand Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      className="w-12 h-12 rounded-lg border-2 border-white/10 bg-transparent cursor-pointer"
                      value={brandPrimary} 
                      onChange={e=>setBrandPrimary(e.target.value)}
                      data-testid="input-brand-primary"
                    />
                    <input 
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                      value={brandPrimary} 
                      onChange={e=>setBrandPrimary(e.target.value)}
                      placeholder="#6EE7F9"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Brand Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      className="w-12 h-12 rounded-lg border-2 border-white/10 bg-transparent cursor-pointer"
                      value={brandSecondary} 
                      onChange={e=>setBrandSecondary(e.target.value)}
                      data-testid="input-brand-secondary"
                    />
                    <input 
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                      value={brandSecondary} 
                      onChange={e=>setBrandSecondary(e.target.value)}
                      placeholder="#A78BFA"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                  value={tags} 
                  onChange={e=>setTags(e.target.value)}
                  placeholder="sports, youth, competitive..."
                  data-testid="input-tags"
                />
              </div>

              <div className="flex justify-between">
                <button 
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                  onClick={() => setStep(1)}
                  data-testid="button-back-step2"
                >
                  Back
                </button>
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl font-semibold transition-all duration-300"
                  onClick={() => setStep(3)}
                  data-testid="button-next-step2"
                >
                  Next: Sports
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Sports (for non-business orgs) */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">
                {isBusiness ? 'Review & Create' : 'Sports Contacts'}
              </h2>
              
              {!isBusiness && (
                <>
                  <p className="text-white/60 mb-4">
                    Add sports and contact information for your organization (optional)
                  </p>
                  
                  {sports.map((sport, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                          value={sport.sportId} 
                          onChange={e=>updateSport(i,{sportId:e.target.value})}
                          placeholder="Sport ID (UUID)"
                          data-testid={`input-sport-id-${i}`}
                        />
                        <input 
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                          value={sport.contactName} 
                          onChange={e=>updateSport(i,{contactName:e.target.value})}
                          placeholder="Contact Name"
                          data-testid={`input-contact-name-${i}`}
                        />
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none transition-colors" 
                            value={sport.contactEmail} 
                            onChange={e=>updateSport(i,{contactEmail:e.target.value})}
                            placeholder="Contact Email"
                            data-testid={`input-contact-email-${i}`}
                          />
                          <button 
                            className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            onClick={() => removeSport(i)}
                            data-testid={`button-remove-sport-${i}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
                    onClick={addSport}
                    data-testid="button-add-sport"
                  >
                    + Add Sport Contact
                  </button>
                </>
              )}

              {/* Summary for business orgs */}
              {isBusiness && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="font-semibold mb-2">Organization Summary</h3>
                    <div className="text-sm space-y-1 text-white/80">
                      <div><strong>Name:</strong> {name}</div>
                      <div><strong>Type:</strong> Business</div>
                      {emailDomain && <div><strong>Email Domain:</strong> {emailDomain}</div>}
                      {billingEmail && <div><strong>Billing Email:</strong> {billingEmail}</div>}
                      {tags && <div><strong>Tags:</strong> {tags}</div>}
                    </div>
                  </div>
                  
                  {/* Preview card */}
                  <div className="h-32 rounded-xl" style={{ background: previewGradient }}>
                    <div className="h-full flex items-center justify-center text-white font-semibold text-xl">
                      {name}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {err && (
                <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400">
                  {err}
                </div>
              )}
              
              {msg && (
                <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400">
                  {msg}
                </div>
              )}

              <div className="flex justify-between">
                <button 
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  data-testid="button-back-step3"
                >
                  Back
                </button>
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
                  onClick={submit}
                  disabled={loading || !name.trim()}
                  data-testid="button-create"
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </div>
          )}
        </GlowCard>
      </div>
    </div>
  );
}