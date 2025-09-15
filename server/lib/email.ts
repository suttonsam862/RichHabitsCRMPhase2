import sg from '@sendgrid/mail';

const KEY  = process.env.SENDGRID_API_KEY;
const FROM = process.env.SENDGRID_FROM;
const NAME = process.env.SENDGRID_FROM_NAME || 'Rich Habits App';
const APP  = (process.env.APP_PUBLIC_URL || '').replace(/\/$/,'');

if (KEY) sg.setApiKey(KEY);

export function isEmailConfigured(){ return !!KEY && !!FROM && !!APP; }

export function emailConfigIssues(){
  const out:string[]=[]; 
  if(!KEY) out.push('SENDGRID_API_KEY'); 
  if(!FROM) out.push('SENDGRID_FROM'); 
  if(!APP) out.push('APP_PUBLIC_URL'); 
  return out;
}

export async function sendBrandedEmail(to:string, subject:string, html:string){
  if (!isEmailConfigured()) throw new Error('Email not configured: missing '+emailConfigIssues().join(', '));
  await sg.send({ to, from:{ email: FROM!, name: NAME }, subject, html });
}

export function supabaseEmailShell(title:string, bodyHtml:string){
  return `
    <div style="background:#0A0B0E;color:#fff;padding:32px;font-family:Inter,system-ui,-apple-system,sans-serif">
      <div style="max-width:560px;margin:auto;border-radius:18px;padding:24px;background:rgba(255,255,255,0.04);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04),0 8px 40px rgba(0,0,0,.45)">
        <h1 style="margin:0 0 8px;font-size:22px">${title}</h1>
        ${bodyHtml}
        <p style="opacity:.6;font-size:12px;margin-top:28px">© ${new Date().getFullYear()} Rich Habits</p>
      </div>
    </div>`;
}

export function actionButton(href:string,label='Open'){
  return `<p style="margin:24px 0">
    <a href="${href}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fff;color:#000;
       text-decoration:none;font-weight:600">${label}</a></p>`;
}