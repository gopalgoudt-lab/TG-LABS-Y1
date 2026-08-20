import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, adminAuthError, issueAdminSession, verifyAdminRequest, verifyAdminSessionToken } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';

function clientIp(request:Request){return (request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'unknown'}
async function tooManyAttempts(ip:string){
 const since=new Date(Date.now()-15*60*1000);
 const [all,failed]=await Promise.all([
  prisma.adminAuditLog.count({where:{ipAddress:ip,createdAt:{gte:since},action:{in:['ADMIN_LOGIN_SUCCESS','ADMIN_LOGIN_FAILED']}}}),
  prisma.adminAuditLog.count({where:{ipAddress:ip,createdAt:{gte:since},action:'ADMIN_LOGIN_FAILED'}}),
 ]);
 return all>=20||failed>=8;
}
async function auditLogin(request:Request,action:'ADMIN_LOGIN_SUCCESS'|'ADMIN_LOGIN_FAILED',phone:string,summary:string){
 try{await prisma.adminAuditLog.create({data:{adminPhone:phone||'UNKNOWN',action,entityType:'ADMIN_SESSION',summary,ipAddress:clientIp(request),userAgent:request.headers.get('user-agent')||null}})}catch(error){console.error('Admin login audit failed',error)}
}

export async function POST(request:Request){
 const ip=clientIp(request);
 try{
  if(await tooManyAttempts(ip))return NextResponse.json({error:'Too many admin sign-in attempts. Please wait 15 minutes and try again.'},{status:429,headers:{'Retry-After':'900'}});
  const identity=await verifyAdminRequest(request);
  const token=await issueAdminSession(identity);
  await auditLogin(request,'ADMIN_LOGIN_SUCCESS',identity.phone,'Admin OTP login succeeded.');
  const response=NextResponse.json({ok:true,phone:identity.phone,role:identity.role});
  response.cookies.set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*8});
  return response;
 }catch(error){
  const e=adminAuthError(error);
  await auditLogin(request,'ADMIN_LOGIN_FAILED','UNKNOWN',`Admin sign-in rejected: ${e.error}`);
  return NextResponse.json({error:e.error},{status:e.status});
 }
}

export async function GET(request:Request){
 try{
  const token=request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1]||'';
  if(!token)throw new Error('UNAUTHENTICATED');
  const identity=await verifyAdminSessionToken(decodeURIComponent(token));
  return NextResponse.json({ok:true,phone:identity.phone,role:identity.role});
 }catch(error){const e=adminAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function DELETE(request:Request){
 try{
  const token=request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1]||'';
  if(token){const identity=await verifyAdminSessionToken(decodeURIComponent(token));await prisma.adminAuditLog.create({data:{adminPhone:identity.phone,action:'ADMIN_LOGOUT',entityType:'ADMIN_SESSION',summary:'Admin signed out.',ipAddress:clientIp(request),userAgent:request.headers.get('user-agent')||null}})}
 }catch{}
 const response=NextResponse.json({ok:true});
 response.cookies.set(ADMIN_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 return response;
}
