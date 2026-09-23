import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const schema=z.object({mode:z.enum(['CASH','UPI','CARD']).default('CASH')});

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const admin=await adminFromRequest(request);
  const {id}=await params;
  const body=schema.parse(await request.json().catch(()=>({})));
  const existing=await prisma.booking.findUnique({where:{id},select:{id:true,totalAmount:true,paymentStatus:true,paymentMode:true,paidAt:true}});
  if(!existing)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(existing.paymentStatus==='PAID')return NextResponse.json({booking:existing,alreadyPaid:true});
  if(existing.paymentStatus==='REFUNDED')return NextResponse.json({error:'Refunded bookings cannot be marked paid from this screen.'},{status:409});
  if(existing.totalAmount<=0)return NextResponse.json({error:'Booking total must be positive before payment can be recorded.'},{status:409});

  const now=new Date();
  const ipAddress=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null;
  const userAgent=request.headers.get('user-agent')||null;
  const result=await prisma.$transaction(async tx=>{
   const claimed=await tx.booking.updateMany({
    where:{id,paymentStatus:existing.paymentStatus,paidAt:null},
    data:{paymentStatus:'PAID',paymentMode:body.mode,paidAt:now}
   });
   if(claimed.count!==1){
    const current=await tx.booking.findUnique({where:{id},select:{id:true,totalAmount:true,paymentStatus:true,paymentMode:true,paidAt:true}});
    return {booking:current,alreadyPaid:current?.paymentStatus==='PAID'};
   }
   await tx.paymentTransaction.create({data:{
    bookingId:id,provider:'COLLECTION',orderId:`collection:${id}:${now.getTime()}`,status:'PAID',amount:existing.totalAmount,
    currency:'INR',signatureVerified:false,source:'ADMIN_COLLECTION'
   }});
   await tx.adminAuditLog.create({data:{
    adminPhone:admin.phone,action:'BOOKING_PAYMENT_RECORDED',entityType:'Booking',entityId:id,
    summary:'Pay-at-collection payment recorded',
    metadata:{amount:existing.totalAmount,mode:body.mode,fromStatus:existing.paymentStatus,toStatus:'PAID',actorRole:'ADMIN',actorSource:'TG_LABS_ADMIN'},
    ipAddress,userAgent
   }});
   const booking=await tx.booking.findUnique({where:{id},select:{id:true,totalAmount:true,paymentStatus:true,paymentMode:true,paidAt:true}});
   return {booking,alreadyPaid:false};
  });
  if(!result.booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(!result.alreadyPaid&&result.booking.paymentStatus!=='PAID')return NextResponse.json({error:'Payment state changed. Refresh and try again.'},{status:409});
  return NextResponse.json(result);
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Choose a valid payment mode.'},{status:400});
  const auth=adminAuthError(error);if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error('Record collection payment failed',error);
  return NextResponse.json({error:'Unable to record payment.'},{status:500});
 }
}
