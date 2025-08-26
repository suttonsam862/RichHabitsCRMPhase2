import { createContext, useContext, useEffect, useState } from 'react';
import { sb, isSupabaseAvailable } from '@/lib/supabase';

type U = { id:string, email?:string|null };
const Ctx = createContext<{ user?:U; loading:boolean; signIn:(e:string,p:string)=>Promise<void>; signUp:(e:string,p:string,fullName?:string)=>Promise<void>; login:(e:string,p:string)=>Promise<void>; logout:()=>Promise<void>; signOut:()=>Promise<void> }>({} as any);

export function AuthProvider({children}:{children:any}){
  const [user,setUser]=useState<U|undefined>();
  const [loading,setLoading]=useState(true); // Start with loading true
  
  useEffect(()=>{ 
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not configured - authentication disabled');
      setLoading(false);
      return;
    }
    
    // Check for existing session on mount
    sb!.auth.getSession().then(({data})=> {
      setUser(data.session?.user ? { id:data.session.user.id, email:data.session.user.email } : undefined);
      setLoading(false); // Done checking session
    });
    
    // Listen for auth state changes
    const { data: sub } = sb!.auth.onAuthStateChange((_e,s)=> {
      setUser(s?.user ? { id:s.user.id, email:s.user.email } : undefined);
      setLoading(false);
    });
    
    return ()=> sub.subscription.unsubscribe();
  },[]);
  
  async function login(email:string,password:string){ 
    if (!isSupabaseAvailable()) {
      throw new Error('Authentication not available - Supabase not configured');
    }
    const { error } = await sb!.auth.signInWithPassword({ email, password }); 
    if(error) throw new Error(error.message); 
  }
  
  async function signUp(email:string,password:string,fullName?:string){ 
    if (!isSupabaseAvailable()) {
      throw new Error('Authentication not available - Supabase not configured');
    }
    const { error } = await sb!.auth.signUp({ 
      email, 
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined
    }); 
    if(error) throw new Error(error.message); 
  }
  
  async function logout(){ 
    if (isSupabaseAvailable()) {
      await sb!.auth.signOut(); 
    }
  }
  
  // Alias methods for compatibility
  const signIn = login;
  const signOut = logout;
  
  return <Ctx.Provider value={{user,loading,signIn,signUp,login,logout,signOut}}>{children}</Ctx.Provider>
}

export const useAuth=()=>useContext(Ctx);