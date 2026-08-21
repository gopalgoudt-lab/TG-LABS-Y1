import { NextResponse } from 'next/server';
import { saveThyrocarePassword } from '@/lib/thyrocare-password';
import { thyrocareLoginPhone, type ThyrocareRole } from '@/lib/thyrocare-auth';
import { verifyFirebasePhoneIdToken } from '@/lib/firebase-id-token';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  const body=await request.json();const idToken=String(body.idToken||'');const role=String(body.role||'').toUpperCase() as ThyrocareRole;const newPassword=String(body.newPassword||'');
  if(!['ADMIN','STAFF'].includes(role))return NextResponse.json({error:'Choose Admin or Staff.'},{status:400});
  if(newPassword.length<10)return NextResponse.json({error:'New password must be at least 10 characters.'},{status:400});
  if(newPassword.length>128)return NextResponse.json({error:'New password is too long.'},{status:400});
  if(!idToken)return NextResponse.json({error:'OTP verification is required.'},{status:401});
  const verified=await verifyFirebasePhoneIdToken(idToken);
  if(verified.phone!==thyrocareLoginPhone())return NextResponse.json({error:'This mobile number is not authorized to reset Thyrocare passwords.'},{status:403});
  await saveThyrocarePassword(verified.phone,role,newPassword);
  try{await prisma.adminAuditLog.create({data:{adminPhone:verified.phone,action:'THYROCARE_PASSWORD_RESET_OTP',entityType:'THYROCARE_SESSION',summary:`${role} Thyrocare password reset after Firebase OTP verification.`,ipAddress:(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null,userAgent:request.headers.get('user-agent')||null}})}catch{}
  return NextResponse.json({ok:true,role});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(message==='FIREBASE_PROJECT_NOT_CONFIGURED')return NextResponse.json({error:'Firebase OTP recovery is not configured.'},{status:503});
  return NextResponse.json({error:'OTP verification failed or expired. Please request a new OTP.'},{status:401});
 }
}
