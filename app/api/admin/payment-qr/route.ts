import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, adminAuthError, verifyAdminSessionToken } from '@/lib/admin-auth';

export const dynamic='force-dynamic';

async function requireAdmin(request:Request){
 const token=request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1]||'';
 if(!token)throw new Error('UNAUTHENTICATED');
 return verifyAdminSessionToken(decodeURIComponent(token));
}

export async function GET(request:Request){
 try{await requireAdmin(request);const setting=await prisma.appSetting.findUnique({where:{key:'PAYMENT_QR_DATA'}});return NextResponse.json({available:Boolean(setting?.value),qrData:setting?.value||null,updatedAt:setting?.updatedAt?.toISOString()||null})}
 catch(error){const e=adminAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function POST(request:Request){
 try{
  const identity=await requireAdmin(request);
  const body=await request.json();
  const qrData=String(body.qrData||'');
  if(!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(qrData))return NextResponse.json({error:'Upload a PNG, JPG or WEBP QR code image.'},{status:400});
  if(qrData.length>2_500_000)return NextResponse.json({error:'QR image is too large. Please use an image under about 1.8 MB.'},{status:413});
  const setting=await prisma.appSetting.upsert({where:{key:'PAYMENT_QR_DATA'},update:{value:qrData},create:{key:'PAYMENT_QR_DATA',value:qrData}});
  await prisma.adminAuditLog.create({data:{adminPhone:identity.phone,action:'PAYMENT_QR_UPDATED',entityType:'APP_SETTING',entityId:'PAYMENT_QR_DATA',summary:'Payment QR code updated.'}}).catch(()=>{});
  return NextResponse.json({ok:true,updatedAt:setting.updatedAt.toISOString()});
 }catch(error){const e=adminAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}
