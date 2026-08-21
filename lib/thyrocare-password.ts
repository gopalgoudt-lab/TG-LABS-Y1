import { prisma } from '@/lib/prisma';
import type { ThyrocareRole } from '@/lib/thyrocare-auth';

const ITERATIONS=210000;
const FALLBACK_ADMIN_HASH='a129405ecaa880deff0c9a90d14837295432d2d7b03707cafeee0b5821bb08ad';
const FALLBACK_STAFF_HASH='e57cd20f7c20e9d74d897d2124a8758f0840d5cb7c7644adb466941f5380406a';
function b64(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function fromB64(value:string){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function derive(password:string,salt:Uint8Array,iterations=ITERATIONS){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,256))}
function sameBytes(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}
async function digestHex(value:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}

export async function verifyThyrocarePassword(phone:string,role:ThyrocareRole,password:string){
 const saved=await prisma.thyrocareCredential.findUnique({where:{phone_role:{phone,role}}});
 if(saved){const actual=await derive(password,fromB64(saved.passwordSalt),saved.iterations);return sameBytes(actual,fromB64(saved.passwordHash))}
 const configured=role==='ADMIN'?process.env.THYROCARE_ADMIN_PASSWORD||'':process.env.THYROCARE_STAFF_PASSWORD||'';
 if(configured){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(configured));return sameBytes(new Uint8Array(a),new Uint8Array(b))}
 return (await digestHex(password))===(role==='ADMIN'?FALLBACK_ADMIN_HASH:FALLBACK_STAFF_HASH);
}

export async function saveThyrocarePassword(phone:string,role:ThyrocareRole,password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await derive(password,salt,ITERATIONS);
 return prisma.thyrocareCredential.upsert({
  where:{phone_role:{phone,role}},
  update:{passwordHash:b64(hash),passwordSalt:b64(salt),iterations:ITERATIONS},
  create:{phone,role,passwordHash:b64(hash),passwordSalt:b64(salt),iterations:ITERATIONS},
 });
}
