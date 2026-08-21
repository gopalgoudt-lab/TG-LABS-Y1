export const THYROCARE_SESSION_COOKIE='tg_thyrocare_session';
export type ThyrocareRole='ADMIN'|'STAFF';
export type ThyrocareIdentity={phone:string;role:ThyrocareRole;exp:number};

function normalizePhone(value:string){const d=String(value||'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}
function bytesToB64url(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function textToB64url(value:string){return bytesToB64url(new TextEncoder().encode(value))}
function b64urlToBytes(value:string){const s=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function b64urlToJson<T>(value:string){return JSON.parse(new TextDecoder().decode(b64urlToBytes(value))) as T}
function sessionSecret(){const secret=process.env.THYROCARE_SESSION_SECRET||process.env.ADMIN_SESSION_SECRET||'';if(secret.length<32)throw new Error('THYROCARE_AUTH_NOT_CONFIGURED');return secret}
async function hmac(message:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(sessionSecret()),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)))}

export function thyrocareLoginPhone(){return normalizePhone(process.env.THYROCARE_LOGIN_MOBILE||'9701162302')}

export async function issueThyrocareSession(phone:string,role:ThyrocareRole){
 const now=Math.floor(Date.now()/1000);const header=textToB64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
 const payload=textToB64url(JSON.stringify({iss:'tg-labs-thyrocare',aud:'tg-labs-thyrocare-manual',phone:normalizePhone(phone),role,iat:now,exp:now+60*60*10}));
 const signature=bytesToB64url(await hmac(`${header}.${payload}`));return `${header}.${payload}.${signature}`;
}

export async function verifyThyrocareSessionToken(token:string):Promise<ThyrocareIdentity>{
 const parts=token.split('.');if(parts.length!==3)throw new Error('UNAUTHENTICATED');const [header,payload,signature]=parts;
 const h=b64urlToJson<{alg?:string}>(header),p=b64urlToJson<ThyrocareIdentity & {iss?:string;aud?:string}>(payload);
 if(h.alg!=='HS256'||p.iss!=='tg-labs-thyrocare'||p.aud!=='tg-labs-thyrocare-manual'||!['ADMIN','STAFF'].includes(p.role))throw new Error('UNAUTHENTICATED');
 if(typeof p.exp!=='number'||p.exp*1000<Date.now()||normalizePhone(p.phone)!==thyrocareLoginPhone())throw new Error('UNAUTHENTICATED');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(sessionSecret()),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const ok=await crypto.subtle.verify('HMAC',key,b64urlToBytes(signature),new TextEncoder().encode(`${header}.${payload}`));if(!ok)throw new Error('UNAUTHENTICATED');
 return {phone:normalizePhone(p.phone),role:p.role,exp:p.exp};
}

export async function thyrocareIdentityFromRequest(request:Request){
 const raw=request.headers.get('cookie')?.match(new RegExp(`${THYROCARE_SESSION_COOKIE}=([^;]+)`))?.[1]||'';if(!raw)throw new Error('UNAUTHENTICATED');return verifyThyrocareSessionToken(decodeURIComponent(raw));
}

export async function requireThyrocareRole(request:Request,roles:ThyrocareRole[]=['ADMIN','STAFF']){
 const identity=await thyrocareIdentityFromRequest(request);if(!roles.includes(identity.role))throw new Error('FORBIDDEN');return identity;
}

export function thyrocareAuthError(error:unknown){const code=error instanceof Error?error.message:'';if(code==='FORBIDDEN')return {status:403,error:'Admin access is required for this action.'};if(code==='THYROCARE_AUTH_NOT_CONFIGURED')return {status:503,error:'Thyrocare password login is not configured yet.'};return {status:401,error:'Please sign in to the Thyrocare dashboard.'}}
