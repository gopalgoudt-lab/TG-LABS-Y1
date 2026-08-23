import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const paymentSchema=z.object({
  amount:z.coerce.number().int().positive().max(1000000),
  mode:z.enum(['CASH','UPI','CARD']),
  reference:z.string().trim().max(80).optional().default(''),
});

function parseMeta(value:string|null){
  try{return value?JSON.parse(value) as Record<string,any>:{} }catch{return {}}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const identity=await requireThyrocareRole(request,['ADMIN','STAFF']);
    const {id}=await params;
    const body=paymentSchema.parse(await request.json());
    const booking=await prisma.booking.findFirst({where:{id,createdByAdmin:'THYROCARE_MANUAL'},include:{patient:true}});
    if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});

    const meta=parseMeta(booking.adminNotes);
    const gross=Number(meta.grossAmount??booking.totalAmount??0);
    const discount=Number(meta.discount??0);
    const net=Math.max(0,gross-discount);
    const previousPaid=Number(meta.paidAmount??Math.max(0,net-Number(meta.balance??0)));
    const previousBalance=Math.max(0,net-previousPaid);
    if(previousBalance<=0)return NextResponse.json({error:'This order is already fully paid.'},{status:400});
    if(body.amount>previousBalance)return NextResponse.json({error:`Payment cannot exceed pending balance of ₹${previousBalance}.`},{status:400});

    const now=new Date();
    const newPaid=previousPaid+body.amount;
    const balance=Math.max(0,net-newPaid);
    const history=Array.isArray(meta.paymentHistory)?meta.paymentHistory:[];
    const paymentEntry={
      id:`PAY-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
      amount:body.amount,
      mode:body.mode,
      reference:body.reference||'',
      receivedAt:now.toISOString(),
      receivedByRole:identity.role,
    };
    const nextMeta={
      ...meta,
      paidAmount:newPaid,
      balance,
      paymentMode:balance===0?body.mode:(meta.paymentMode||body.mode),
      paymentModes:[...new Set([...(Array.isArray(meta.paymentModes)?meta.paymentModes:[]),body.mode])],
      paymentHistory:[...history,paymentEntry],
      lastPaymentAt:now.toISOString(),
    };

    await prisma.booking.update({
      where:{id},
      data:{
        paymentStatus:balance===0?'PAID':'PENDING',
        paymentMode:body.mode,
        paidAt:balance===0?(booking.paidAt||now):booking.paidAt,
        status:balance===0?'CONFIRMED':booking.status,
        adminNotes:JSON.stringify(nextMeta),
      }
    });

    await writeAdminAudit(request,{
      action:'THYROCARE_MANUAL_PAYMENT_COLLECTED',
      entityType:'Booking',
      entityId:id,
      summary:`${identity.role} collected ₹${body.amount} for Thyrocare manual order ${id}`,
      metadata:{amount:body.amount,mode:body.mode,reference:body.reference||'',previousPaid,newPaid,balance}
    });

    return NextResponse.json({ok:true,amount:body.amount,mode:body.mode,reference:body.reference||'',paidAmount:newPaid,balance,paymentStatus:balance===0?'PAID':'PENDING',receivedAt:now.toISOString()});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||'Please check payment details.'},{status:400});
    if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message)){
      const e=thyrocareAuthError(error);return NextResponse.json({error:e.error},{status:e.status});
    }
    console.error(error);
    return NextResponse.json({error:'Unable to record payment.'},{status:500});
  }
}
