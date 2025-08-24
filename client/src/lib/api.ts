import { sb, isSupabaseAvailable } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>>{
  if (!isSupabaseAvailable() || !sb) {
    return {};
  }
  const { data } = await sb.auth.getSession();
  const t = data.session?.access_token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export const api = {
  async get(url:string){
    const h = await authHeaders();
    const r = await fetch(url, { headers: h });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) return { success:false, error:{ code:r.status, message:j?.error?.message || r.statusText }};
    return j;
  },
  async post(url:string, body:any){
    const h = await authHeaders();
    try{
      const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', ...h }, body: JSON.stringify(body) });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok) return { success:false, error:{ code:r.status, message: j?.error?.message || j?.message || r.statusText }};
      return j;
    }catch(e:any){ return { success:false, error:{ code:0, message: e?.message || 'Network error' }}}
  },
  async patch(url:string, body:any){
    const h = await authHeaders();
    try{
      const r = await fetch(url, { method:'PATCH', headers:{ 'Content-Type':'application/json', ...h }, body: JSON.stringify(body) });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok) return { success:false, error:{ code:r.status, message: j?.error?.message || j?.message || r.statusText }};
      return j;
    }catch(e:any){ return { success:false, error:{ code:0, message: e?.message || 'Network error' }}}
  },
  async delete(url:string){
    const h = await authHeaders();
    try{
      const r = await fetch(url, { method:'DELETE', headers:{ ...h } });
      if(!r.ok) {
        const j = await r.json().catch(()=> ({}));
        return { success:false, error:{ code:r.status, message: j?.error?.message || j?.message || r.statusText }};
      }
      return { success:true };
    }catch(e:any){ return { success:false, error:{ code:0, message: e?.message || 'Network error' }}}
  }
}