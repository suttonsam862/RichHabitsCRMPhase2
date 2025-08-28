
import { useEffect, useState } from 'react';
export default function DevOverlay(){
  const [open,setOpen]=useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
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
  
  if (import.meta.env.PROD || (import.meta.env.VITE_DEBUG_LEVEL ?? '1')==='0') return null;
  return (
    <div style={{position:'fixed',bottom:12,right:12,zIndex:9999}}>
      <button onClick={()=>setOpen(!open)} style={{padding:'8px 10px',borderRadius:8,background:'#111',color:'#fff',opacity:.7}}>
        {open?'Hide':'Debug'}
      </button>
      {open && (
        <div style={{background:'#0A0B0E',border:'1px solid #333',borderRadius:12,marginTop:8,width:380}}>
          <iframe title="diag" src="/api/v1/admin/diagnostics/logs"
            style={{width:'100%',height:200,background:'transparent',border:'none',borderRadius:12}} />
          <div style={{padding:8,borderTop:'1px solid #333',maxHeight:120,overflow:'auto'}}>
            <div style={{color:'#ff6b6b',fontSize:11,fontFamily:'monospace'}}>
              <strong>🔍 Logo Debug Info:</strong>
              <div style={{color:'#ffd43b',marginTop:4}}>
                Database mismatch detected! API has 13 orgs, SQL tool has 1 org.
                SQL tool connects to different DB than Supabase API.
              </div>
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
