import { NextRequest, NextResponse } from 'next/server';

const COOKIE='tg_admin_session';

function b64urlToBytes(value:string){const s=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function b64urlToJson(value:string){return JSON.parse(new TextDecoder().decode(b64urlToBytes(value)))}
function normalizePhone(phone:string){const d=phone.replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}
async function validSession(token:string){
 const secret=process.env.ADMIN_SESSION_SECRET||'';if(secret.length<32)return false;
 const parts=token.split('.');if(parts.length!==3)return false;
 const [header,payload,signature]=parts;const h=b64urlToJson(header),p=b64urlToJson(payload);if(h.alg!=='HS256'||p.iss!=='tg-labs-admin'||p.aud!=='tg-labs-admin-web'||p.role!=='ADMIN')return false;
 if(typeof p.exp!=='number'||p.exp*1000<Date.now())return false;
 const allowed=(process.env.ADMIN_PHONE_NUMBERS||'').split(',').map(normalizePhone).filter(Boolean);if(!allowed.length||!allowed.includes(normalizePhone(String(p.phone||''))))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,b64urlToBytes(signature),new TextEncoder().encode(`${header}.${payload}`));
}

export async function middleware(request:NextRequest){
 const {pathname,search}=request.nextUrl;
 if(pathname==='/admin/login'||pathname==='/api/admin/session')return NextResponse.next();
 const protectedPath=pathname==='/manual'||pathname.startsWith('/manual/')||pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/');
 if(!protectedPath)return NextResponse.next();
 try{const token=request.cookies.get(COOKIE)?.value||'';if(!token||!(await validSession(token)))throw new Error('UNAUTHENTICATED');return NextResponse.next()}catch{
  if(pathname.startsWith('/api/'))return NextResponse.json({error:'Admin authentication required.'},{status:401});
  const login=new URL('/admin/login',request.url);login.searchParams.set('next',`${pathname}${search}`);return NextResponse.redirect(login);
 }
}
export const config={matcher:['/admin/:path*','/manual/:path*','/api/admin/:path*']};
