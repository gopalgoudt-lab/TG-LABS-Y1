import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';

export async function GET(){
  const setting=await prisma.appSetting.findUnique({where:{key:'PAYMENT_QR_DATA'}});
  return NextResponse.json({available:Boolean(setting?.value),qrData:setting?.value||null,updatedAt:setting?.updatedAt?.toISOString()||null});
}
