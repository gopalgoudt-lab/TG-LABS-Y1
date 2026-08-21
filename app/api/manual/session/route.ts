import { NextResponse } from 'next/server';
import { issueThyrocareSession, THYROCARE_SESSION_COOKIE, thyrocareAuthError, thyrocareIdentityFromRequest, thyrocareLoginPhone, type ThyrocareRole } from '@/lib/thyrocare-auth';
import { verifyThyrocarePassword } from '@/lib/thyrocare-password';

export const dynamic='force-dynamic';
function normalizePhone(value:string){const d=String(value||'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}

export async function POST(request:Request){
 try{
  const body=await request.json();const phone=normalizePhone(body.phone||'');const role=String(body.role||'').toUpperCase() as ThyrocareRole;const password=String(body.password||'');
  if(phone!==thyrocareLoginPhone()||!['ADMIN','STAFF'].includes(role)||!(await verifyThyrocarePassword(phone,role,password)))return NextResponse.json({error:'Invalid login ID, role or password.'},{status:401});
  const token=await issueThyrocareSession(phone,role);const response=NextResponse.json({ok:true,phone,role});response.cookies.set(THYROCARE_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*10});return response;
 }catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}
export async function GET(request:Request){try{const identity=await thyrocareIdentityFromRequest(request);return NextResponse.json({ok:true,phone:identity.phone,role:identity.role})}catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}}
export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.set(THYROCARE_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}
