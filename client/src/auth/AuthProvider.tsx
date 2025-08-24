import { createContext, useContext, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

type U = { id:string, email?:string|null };
const Ctx = createContext<{ user?:U; login:(e:string,p:string)=>Promise<void>; logout:()=>Promise<void> }>({} as any);

export function AuthProvider({children}:{children:any}){
  const [user,setUser]=useState<U|undefined>();
  useEffect(()=>{ 
    sb.auth.getSession().then(({data})=> setUser(data.session?.user ? { id:data.session.user.id, email:data.session.user.email } : undefined));
    const { data: sub } = sb.auth.onAuthStateChange((_e,s)=> setUser(s?.user ? { id:s.user.id, email:s.user.email } : undefined));
    return ()=> sub.subscription.unsubscribe();
  },[]);
  async function login(email:string,password:string){ 
    const { error } = await sb.auth.signInWithPassword({ email, password }); 
    if(error) throw new Error(error.message); 
  }
  async function logout(){ await sb.auth.signOut(); }
  return <Ctx.Provider value={{user,login,logout}}>{children}</Ctx.Provider>
}

export const useAuth=()=>useContext(Ctx);