import { NextResponse } from 'next/server';
import { issueThyrocareSession, THYROCARE_SESSION_COOKIE, thyrocareAuthError, thyrocareIdentityFromRequest, thyrocareLoginPhone, type ThyrocareRole } from '@/lib/thyrocare-auth';

export const dynamic='force-dynamic';

function normalizePhone(value:string){const d=String(value||'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}
async function digest(value:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function sameSecret(a:string,b:string){const [x,y]=await Promise.all([digest(a),digest(b)]);if(x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}

export async function POST(request:Request){
 try{
  const body=await request.json();const phone=normalizePhone(body.phone||'');const role=String(body.role||'').toUpperCase() as ThyrocareRole;const password=String(body.password||'');
  if(phone!==thyrocareLoginPhone()||!['ADMIN','STAFF'].includes(role))return NextResponse.json({error:'Invalid login ID, role or password.'},{status:401});
  const configured=role==='ADMIN'?process.env.THYROCARE_ADMIN_PASSWORD||'':process.env.THYROCARE_STAFF_PASSWORD||'';
  if(configured.length<8)return NextResponse.json({error:`${role==='ADMIN'?'Admin':'Staff'} password is not configured in Vercel yet.`},{status:503});
  if(!(await sameSecret(password,configured)))return NextResponse.json({error:'Invalid login ID, role or password.'},{status:401});
  const token=await issueThyrocareSession(phone,role);const response=NextResponse.json({ok:true,phone,role});
  response.cookies.set(THYROCARE_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*10});return response;
 }catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function GET(request:Request){
 try{const identity=await thyrocareIdentityFromRequest(request);return NextResponse.json({ok:true,phone:identity.phone,role:identity.role})}catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.set(THYROCARE_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}
