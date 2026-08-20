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
function secure(response:NextResponse,admin=false){
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(self)');
 response.headers.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');
 response.headers.set('X-Permitted-Cross-Domain-Policies','none');
 if(process.env.NODE_ENV==='production')response.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 if(admin){response.headers.set('Cache-Control','no-store, max-age=0');response.headers.set('Pragma','no-cache')}
 return response;
}

export async function middleware(request:NextRequest){
 const {pathname,search}=request.nextUrl;
 const adminSurface=pathname==='/manual'||pathname.startsWith('/manual/')||pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/');
 if(pathname==='/admin/login'||pathname==='/api/admin/session')return secure(NextResponse.next(),true);
 if(!adminSurface)return secure(NextResponse.next(),false);
 try{const token=request.cookies.get(COOKIE)?.value||'';if(!token||!(await validSession(token)))throw new Error('UNAUTHENTICATED');return secure(NextResponse.next(),true)}catch{
  if(pathname.startsWith('/api/'))return secure(NextResponse.json({error:'Admin authentication required.'},{status:401}),true);
  const login=new URL('/admin/login',request.url);login.searchParams.set('next',`${pathname}${search}`);return secure(NextResponse.redirect(login),true);
 }
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
