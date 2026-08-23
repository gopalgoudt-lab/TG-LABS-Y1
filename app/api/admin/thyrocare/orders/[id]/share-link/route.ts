import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';

export const dynamic='force-dynamic';

const bodySchema=z.object({type:z.enum(['report','bill']),documentId:z.string().optional()});

function sign(payload:string){
  const secret=process.env.THYROCARE_SESSION_SECRET;
  if(!secret)throw new Error('THYROCARE_AUTH_NOT_CONFIGURED');
  return createHmac('sha256',secret).update(payload).digest('base64url');
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireThyrocareRole(request,['ADMIN','STAFF']);
    const {id}=await params;
    const body=bodySchema.parse(await request.json());
    const exists=await prisma.booking.findFirst({where:{id,createdByAdmin:'THYROCARE_MANUAL'},select:{id:true}});
    if(!exists)return NextResponse.json({error:'Manual order not found.'},{status:404});
    const payload=Buffer.from(JSON.stringify({id,type:body.type,documentId:body.documentId||null})).toString('base64url');
    const token=`${payload}.${sign(payload)}`;
    const origin=new URL(request.url).origin;
    return NextResponse.json({ok:true,url:`${origin}/api/public/thyrocare/document?token=${encodeURIComponent(token)}`,expires:false});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({error:'Invalid share request.'},{status:400});
    const e=thyrocareAuthError(error);
    if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});
    console.error('POST share-link failed',error);
    return NextResponse.json({error:'Unable to create secure share link.'},{status:500});
  }
}
