import { NextResponse } from 'next/server';
import { issueThyrocareSession, THYROCARE_SESSION_COOKIE, thyrocareAuthError, thyrocareIdentityFromRequest, thyrocareLoginPhone, type ThyrocareRole } from '@/lib/thyrocare-auth';
import { verifyThyrocarePassword } from '@/lib/thyrocare-password';
import { prisma } from '@/lib/prisma';
import { normalizeIndianDatabasePhone } from '@/lib/firebase-server';

export const dynamic='force-dynamic';
function ip(request:Request){return (request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null}
async function logSession(request:Request,phone:string,role:ThyrocareRole,action:string,summary:string){try{await prisma.adminAuditLog.create({data:{adminPhone:phone,action,entityType:'THYROCARE_SESSION',summary,metadata:{actorRole:role,actorSource:'THYROCARE_MANUAL'},ipAddress:ip(request),userAgent:request.headers.get('user-agent')||null}})}catch(error){console.error('Thyrocare session audit failed',error)}}

export async function POST(request:Request){
 try{
  const body=await request.json();const phone=normalizeIndianDatabasePhone(String(body.phone||''));const role=String(body.role||'').toUpperCase() as ThyrocareRole;const password=String(body.password||'');
  if(phone!==thyrocareLoginPhone()||!['ADMIN','STAFF'].includes(role)||!(await verifyThyrocarePassword(phone,role,password)))return NextResponse.json({error:'Invalid login ID, role or password.'},{status:401});
  const token=await issueThyrocareSession(phone,role);const response=NextResponse.json({ok:true,phone,role});response.cookies.set(THYROCARE_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*10});await logSession(request,phone,role,'THYROCARE_LOGIN',`${role} signed in to the Thyrocare dashboard.`);return response;
 }catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}
export async function GET(request:Request){try{const identity=await thyrocareIdentityFromRequest(request);return NextResponse.json({ok:true,phone:identity.phone,role:identity.role})}catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}}
export async function DELETE(request:Request){try{const identity=await thyrocareIdentityFromRequest(request);await logSession(request,identity.phone,identity.role,'THYROCARE_LOGOUT',`${identity.role} signed out of the Thyrocare dashboard.`)}catch{}const response=NextResponse.json({ok:true});response.cookies.set(THYROCARE_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}
