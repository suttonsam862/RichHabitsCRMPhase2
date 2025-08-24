
export const DEBUG_LEVEL = Number(import.meta.env.VITE_DEBUG_LEVEL ?? 1);
export function groupLog(title:string, data:any, danger=false){
  if (DEBUG_LEVEL === 0) return;
  const fn = danger ? console.group : console.groupCollapsed;
  fn(`%c${title}`, `color:${danger?'#ff6b6b':'#9be9a8'};font-weight:600`);
  try { console.log(data); } finally { console.groupEnd(); }
}
