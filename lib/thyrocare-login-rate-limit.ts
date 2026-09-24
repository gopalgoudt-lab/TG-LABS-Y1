import crypto from 'crypto';

const WINDOW_SECONDS=15*60;
const IDENTITY_LIMIT=5;
const IP_LIMIT=30;
type Bucket={failures:number;expiresAt:number};
const identityBuckets=new Map<string,Bucket>();
const ipBuckets=new Map<string,Bucket>();
const PREFIX='tg:thyrocare-manual-login:v1';

function hash(value:string){return crypto.createHash('sha256').update(value.trim().toLowerCase().slice(0,120)).digest('hex')}
function config(){const url=process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/,'');const token=process.env.UPSTASH_REDIS_REST_TOKEN?.trim();return url&&token?{url,token}:null}
async function pipeline(commands:Array<Array<string|number>>){const c=config();if(!c)return null;const r=await fetch(`${c.url}/pipeline`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify(commands),cache:'no-store'});if(!r.ok)throw new Error(`Rate-limit backend returned ${r.status}`);const p=await r.json() as Array<{result?:unknown;error?:string}>;if(!Array.isArray(p)||p.some(x=>x?.error))throw new Error('Invalid rate-limit response');return p.map(x=>x.result)}
function key(kind:'identity'|'ip',value:string){return `${PREFIX}:${kind}:${hash(value||'unknown')}`}
function n(v:unknown){const x=Number(v??0);return Number.isFinite(x)?x:0}
function memoryCheck(identity:string,ip:string){const now=Date.now();const a=identityBuckets.get(hash(identity));const b=ipBuckets.get(hash(ip||'unknown'));const locked=(a&&a.expiresAt>now&&a.failures>=IDENTITY_LIMIT)||(b&&b.expiresAt>now&&b.failures>=IP_LIMIT);const retry=Math.max(a&&a.expiresAt>now&&a.failures>=IDENTITY_LIMIT?Math.ceil((a.expiresAt-now)/1000):0,b&&b.expiresAt>now&&b.failures>=IP_LIMIT?Math.ceil((b.expiresAt-now)/1000):0);return{allowed:!locked,retryAfterSeconds:Math.max(1,retry)}}
function bump(map:Map<string,Bucket>,k:string){const now=Date.now();const old=map.get(k);const b=!old||old.expiresAt<=now?{failures:0,expiresAt:now+WINDOW_SECONDS*1000}:old;b.failures++;map.set(k,b);return b}
export function clientIpFromRequest(request:Request){return (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')?.trim()||'unknown').slice(0,120)}
export async function checkThyrocareLoginRateLimit(identity:string,ip:string){try{if(config()){const r=await pipeline([['GET',key('identity',identity)],['TTL',key('identity',identity)],['GET',key('ip',ip)],['TTL',key('ip',ip)]]);if(r){const il=n(r[0])>=IDENTITY_LIMIT,pl=n(r[2])>=IP_LIMIT;return{allowed:!il&&!pl,retryAfterSeconds:Math.max(il?Math.max(1,n(r[1])):0,pl?Math.max(1,n(r[3])):0)}}}}catch(e){console.error('Manual login rate-limit check failed; using memory fallback.',e)}return memoryCheck(identity,ip)}
export async function recordThyrocareLoginFailure(identity:string,ip:string){try{if(config()){const r=await pipeline([['INCR',key('identity',identity)],['EXPIRE',key('identity',identity),WINDOW_SECONDS,'NX'],['TTL',key('identity',identity)],['INCR',key('ip',ip)],['EXPIRE',key('ip',ip),WINDOW_SECONDS,'NX'],['TTL',key('ip',ip)]]);if(r){const il=n(r[0])>=IDENTITY_LIMIT,pl=n(r[3])>=IP_LIMIT;return{locked:il||pl,retryAfterSeconds:Math.max(il?Math.max(1,n(r[2])):0,pl?Math.max(1,n(r[5])):0)}}}}catch(e){console.error('Manual login rate-limit update failed; using memory fallback.',e)}const a=bump(identityBuckets,hash(identity)),b=bump(ipBuckets,hash(ip||'unknown')),now=Date.now();const locked=a.failures>=IDENTITY_LIMIT||b.failures>=IP_LIMIT;return{locked,retryAfterSeconds:locked?Math.max(1,Math.ceil((Math.max(a.expiresAt,b.expiresAt)-now)/1000)):0}}
export async function resetThyrocareLoginFailures(identity:string){try{if(config())await pipeline([['DEL',key('identity',identity)]])}catch(e){console.error('Manual login rate-limit reset failed.',e)}identityBuckets.delete(hash(identity))}
