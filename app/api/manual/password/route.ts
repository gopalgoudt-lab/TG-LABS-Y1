import { NextResponse } from 'next/server';
import { thyrocareAuthError, thyrocareIdentityFromRequest } from '@/lib/thyrocare-auth';
import { saveThyrocarePassword, verifyThyrocarePassword } from '@/lib/thyrocare-password';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  const identity=await thyrocareIdentityFromRequest(request);
  const body=await request.json();const currentPassword=String(body.currentPassword||'');const newPassword=String(body.newPassword||'');
  if(newPassword.length<10)return NextResponse.json({error:'New password must be at least 10 characters.'},{status:400});
  if(newPassword.length>128)return NextResponse.json({error:'New password is too long.'},{status:400});
  if(!(await verifyThyrocarePassword(identity.phone,identity.role,currentPassword)))return NextResponse.json({error:'Current password is incorrect.'},{status:401});
  if(currentPassword===newPassword)return NextResponse.json({error:'New password must be different from the current password.'},{status:400});
  await saveThyrocarePassword(identity.phone,identity.role,newPassword);
  try{await prisma.adminAuditLog.create({data:{adminPhone:identity.phone,action:'THYROCARE_PASSWORD_CHANGED',entityType:'THYROCARE_SESSION',summary:`${identity.role} changed Thyrocare dashboard password.`,ipAddress:(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null,userAgent:request.headers.get('user-agent')||null}})}catch{}
  return NextResponse.json({ok:true,role:identity.role});
 }catch(error){const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}
