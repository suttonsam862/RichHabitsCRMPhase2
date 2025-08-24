// tiny in-memory ring buffer for recent server events (dev only)
const N = 200; const buf:any[] = [];
export function pushLog(e:any){ if ((process.env.DEBUG_LEVEL ?? '1') === '0') return; buf.push(e); if (buf.length>N) buf.shift(); }
export function getLogs(){ return buf.slice(-N); }