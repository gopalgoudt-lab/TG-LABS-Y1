import { prisma } from '@/lib/prisma';
import type { ThyrocareRole } from '@/lib/thyrocare-auth';

const ITERATIONS=210000;
function b64(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function fromB64(value:string){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function derive(password:string,salt:Uint8Array,iterations=ITERATIONS){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,256))}
function sameBytes(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}

export async function verifyThyrocarePassword(phone:string,role:ThyrocareRole,password:string){
 const saved=await prisma.thyrocareCredential.findUnique({where:{phone_role:{phone,role}}});
 if(saved){const actual=await derive(password,fromB64(saved.passwordSalt),saved.iterations);return sameBytes(actual,fromB64(saved.passwordHash))}
 const configured=role==='ADMIN'?process.env.THYROCARE_ADMIN_PASSWORD||'':process.env.THYROCARE_STAFF_PASSWORD||'';
 if(!configured)return false;
 const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
 const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(configured));
 return sameBytes(new Uint8Array(a),new Uint8Array(b));
}

export async function saveThyrocarePassword(phone:string,role:ThyrocareRole,password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await derive(password,salt,ITERATIONS);
 return prisma.thyrocareCredential.upsert({
  where:{phone_role:{phone,role}},
  update:{passwordHash:b64(hash),passwordSalt:b64(salt),iterations:ITERATIONS},
  create:{phone,role,passwordHash:b64(hash),passwordSalt:b64(salt),iterations:ITERATIONS},
 });
}
