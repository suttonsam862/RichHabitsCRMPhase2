import { useState } from 'react';

export default function DevOverlay(){
  const [open,setOpen]=useState(false);
  if (import.meta.env.PROD || (import.meta.env.VITE_DEBUG_LEVEL ?? '1')==='0') return null;
  return (
    <div style={{position:'fixed',bottom:12,right:12,zIndex:9999}}>
      <button onClick={()=>setOpen(!open)} style={{padding:'8px 10px',borderRadius:8,background:'#111',color:'#fff',opacity:.7}}>
        {open?'Hide':'Debug'}
      </button>
      {open && <iframe title="diag" src="/api/v1/admin/diagnostics/logs"
        style={{width:380,height:260,background:'#0A0B0E',border:'1px solid #333',borderRadius:12,marginTop:8}} />}
    </div>
  );
}