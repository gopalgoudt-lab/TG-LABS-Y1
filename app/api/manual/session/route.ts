import { NextResponse } from 'next/server';
import { issueThyrocareSession, THYROCARE_SESSION_COOKIE, thyrocareAuthError, thyrocareIdentityFromRequest, thyrocareLoginPhone, type ThyrocareRole } from '@/lib/thyrocare-auth';

export const dynamic='force-dynamic';
const FALLBACK_ADMIN_HASH='a129405ecaa880deff0c9a90d14837295432d2d7b03707cafeee0b5821bb08ad';
const FALLBACK_STAFF_HASH='e57cd20f7c20e9d74d897d2124a8758f0840d5cb7c7644adb466941f5380406a';
function normalizePhone(value:string){const d=String(value||'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}
async function digestHex(value:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function passwordMatches(password:string,role:ThyrocareRole){const configured=role==='ADMIN'?process.env.THYROCARE_ADMIN_PASSWORD||'':process.env.THYROCARE_STAFF_PASSWORD||'';const expected=configured.length>=8?await digestHex(configured):(role==='ADMIN'?FALLBACK_ADMIN_HASH:FALLBACK_STAFF_HASH);return (await digestHex(password))===expected}

export async function POST(request:Request){
 try{
  const body=await request.json();const phone=normalizePhone(body.phone||'');const role=String(body.role||'').toUpperCase() as ThyrocareRole;const password=String(body.password||'');
  if(phone!==thyrocareLoginPhone()||!['ADMIN','STAFF'].includes(role)||!(await passwordMatches(password,role)))return NextResponse.json({error:'Invalid login ID, role or password.'},{status:401});
  const token=await issueThyrocareSession(phone,role);const response=NextResponse.json({ok:true,phone,role});response.cookies.set(THYROCARE_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*10});return response;
 }catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}
export async function GET(request:Request){try{const identity=await thyrocareIdentityFromRequest(request);return NextResponse.json({ok:true,phone:identity.phone,role:identity.role})}catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}}
export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.set(THYROCARE_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}
