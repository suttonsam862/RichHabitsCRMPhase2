
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

export default function DevOverlay(){
  const [open,setOpen]=useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    const handleImageError = (e: Event) => {
      const target = e.target as HTMLImageElement;
      if (target?.tagName === 'IMG') {
        const error = `🖼️ Image failed: ${target.src}`;
        setErrors(prev => [...prev.slice(-9), error]);
      }
    };
    
    document.addEventListener('error', handleImageError, true);
    return () => document.removeEventListener('error', handleImageError, true);
  }, []);
  
  // Hide in production or if debug is disabled or if user is not authenticated
  if (import.meta.env.PROD || (import.meta.env.VITE_DEBUG_LEVEL ?? '1')==='0' || !user) return null;
  return (
    <div style={{position:'fixed',bottom:12,right:12,zIndex:9999}}>
      <button onClick={()=>setOpen(!open)} style={{padding:'8px 10px',borderRadius:8,background:'#111',color:'#fff',opacity:.7}}>
        {open?'Hide':'Debug'}
      </button>
      {open && (
        <div style={{background:'#0A0B0E',border:'1px solid #333',borderRadius:12,marginTop:8,width:380}}>
          {user ? (
            <iframe title="diag" src="/api/v1/admin/diagnostics/logs"
              style={{width:'100%',height:200,background:'transparent',border:'none',borderRadius:12}} />
          ) : (
            <div style={{color:'#666',padding:16,textAlign:'center',height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
              Authentication required for diagnostics
            </div>
          )}
          <div style={{padding:8,borderTop:'1px solid #333',maxHeight:120,overflow:'auto'}}>
            <div style={{color:'#ff6b6b',fontSize:11,fontFamily:'monospace'}}>
              <strong>🖼️ Image Errors:</strong>
              {errors.length === 0 ? (
                <div style={{color:'#666',fontStyle:'italic'}}>No image errors detected</div>
              ) : (
                errors.map((error, i) => (
                  <div key={i} style={{marginTop:4,wordBreak:'break-all'}}>{error}</div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
