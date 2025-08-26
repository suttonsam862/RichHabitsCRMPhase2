import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GlowCard from '@/components/ui/GlowCard';
import { useParams, useNavigate } from 'react-router-dom';

export default function SetupWizard(){
  const { id } = useParams();
  const nav = useNavigate();
  const [org,setOrg]=useState<any>(); const [sports,setSports]=useState<any[]>([]);
  const [financeEmail,setFinanceEmail]=useState(''); const [brand1,setBrand1]=useState(''); const [brand2,setBrand2]=useState('');
  const [taxKey,setTaxKey]=useState<string|undefined>(); const [err,setErr]=useState<string|undefined>(); const [msg,setMsg]=useState<string|undefined>();

  useEffect(()=>{(async()=>{
    const r = await api.get(`/api/v1/organizations/${id}/setup`);
    if(!r.success){ setErr(r.error.message); return; }
    setOrg(r.data.org); setSports(r.data.sports||[]);
    setFinanceEmail(r.data.org?.finance_email||'');
    setBrand1(r.data.org?.brand_primary||''); setBrand2(r.data.org?.brand_secondary||'');
  })()},[id]);

  async function signAndUploadLogo(file:File){
    const s = await api.post(`/api/v1/organizations/${id}/logo/sign`, { fileName:file.name });
    if(!s.success) { setErr(s.error.message); return; }
    await fetch(s.data.uploadUrl,{ method:'PUT', body:file });
    await api.post(`/api/v1/organizations/${id}/logo/apply`, { key:s.data.key });
  }

  async function signAndUploadTax(file:File){
    const s = await api.post(`/api/v1/organizations/${id}/tax/sign`, { fileName:file.name });
    if(!s.success) { setErr(s.error.message); return; }
    await fetch(s.data.uploadUrl,{ method:'PUT', body:file });
    const a = await api.post(`/api/v1/organizations/${id}/tax/apply`, { key:s.data.key });
    if(!a.success){ setErr(a.error.message); return; }
    setTaxKey(a.data.tax_exempt_doc_key);
  }

  async function save(){
    const payload:any = {
      brand_primary: brand1 || undefined,
      brand_secondary: brand2 || undefined,
      finance_email: financeEmail || undefined,
      complete: true
    };
    const r = await api.post(`/api/v1/organizations/${id}/setup`, payload);
    if(!r.success){ setErr(r.error.message); return; }
    setMsg('Setup saved'); nav(`/organizations/${id}`);
  }

  async function saveAddress(sportId:string, data:any){
    const a = await api.post(`/api/v1/organizations/${id}/sports/${sportId}/address`, data);
    if(!a.success){ setErr(a.error.message); return; }
  }

  if (err) return <div className="text-red-400">{err}</div>;
  if (!org) return <div>Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <GlowCard>
        <h1 className="text-2xl font-semibold mb-4">Complete Organization Setup</h1>

        <div className="space-y-6">
          <section>
            <h2 className="font-semibold">Branding</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-sm">Brand Primary</label>
                <input className="input w-full mt-1" value={brand1} onChange={e=>setBrand1(e.target.value)} placeholder="#123456"/>
              </div>
              <div>
                <label className="text-sm">Brand Secondary</label>
                <input className="input w-full mt-1" value={brand2} onChange={e=>setBrand2(e.target.value)} placeholder="#654321"/>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm block">Logo</label>
              <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) signAndUploadLogo(f); }} />
            </div>
          </section>

          <section>
            <h2 className="font-semibold">Finance & Tax</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-sm">Finance Email (optional)</label>
                <input className="input w-full mt-1" value={financeEmail} onChange={e=>setFinanceEmail(e.target.value)} placeholder="finance@org.com"/>
              </div>
              <div>
                <label className="text-sm block">Tax Exemption (optional)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>{ const f=e.target.files?.[0]; if(f) signAndUploadTax(f); }}/>
                {taxKey && <p className="text-white/60 text-xs mt-1">Uploaded</p>}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold">Per-Sport Shipping</h2>
            <div className="space-y-3 mt-2">
              {sports.map(s => (
                <div key={s.sport_id} className="grid sm:grid-cols-3 gap-3">
                  <input className="input" placeholder="Line 1" onBlur={e=>saveAddress(s.sport_id, { ship_address_line1: e.target.value, ship_city: s.ship_city||'', ship_state: s.ship_state||'', ship_postal_code: s.ship_postal_code||'', ship_country: s.ship_country||'' })}/>
                  <input className="input" placeholder="City" onBlur={e=>saveAddress(s.sport_id, { ship_address_line1: s.ship_address_line1||'', ship_city: e.target.value, ship_state: s.ship_state||'', ship_postal_code: s.ship_postal_code||'', ship_country: s.ship_country||'' })}/>
                  <input className="input" placeholder="State" onBlur={e=>saveAddress(s.sport_id, { ship_address_line1: s.ship_address_line1||'', ship_city: s.ship_city||'', ship_state: e.target.value, ship_postal_code: s.ship_postal_code||'', ship_country: s.ship_country||'' })}/>
                </div>
              ))}
            </div>
          </section>

          {msg && <div className="text-green-400">{msg}</div>}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save}>Complete Setup</button>
            <button className="btn" onClick={()=>nav('/organizations')}>Cancel</button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}