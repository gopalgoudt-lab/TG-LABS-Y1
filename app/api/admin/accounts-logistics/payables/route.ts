import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const createSchema=z.object({
 bookingId:z.string().trim().min(1),
 partnerId:z.string().trim().min(1).max(160),
 partnerName:z.string().trim().min(1).max(160),
 amount:z.coerce.number().int().min(0).max(100000000),
 sourceReference:z.string().trim().max(240).optional().default(''),
 invoiceNumber:z.string().trim().max(160).optional().default(''),
 invoiceDate:z.string().datetime().optional().nullable(),
 notes:z.string().trim().max(2000).optional().default(''),
});

export async function POST(request:Request){
 try{
  await adminFromRequest(request);
  const body=createSchema.parse(await request.json());
  const booking=await prisma.booking.findUnique({where:{id:body.bookingId},select:{id:true,items:{select:{partnerId:true,partnerName:true}},packages:{select:{partnerId:true,partnerName:true}}}});
  if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  const partners=[...booking.items,...booking.packages].filter(x=>x.partnerId);
  if(!partners.some(x=>x.partnerId===body.partnerId))return NextResponse.json({error:'Partner is not recorded on this booking.'},{status:400});
  const payable=await prisma.partnerPayable.create({data:{bookingId:body.bookingId,partnerId:body.partnerId,partnerName:body.partnerName,amount:body.amount,sourceReference:body.sourceReference||null,invoiceNumber:body.invoiceNumber||null,invoiceDate:body.invoiceDate?new Date(body.invoiceDate):null,notes:body.notes||null}});
  await writeAdminAudit(request,{action:'PARTNER_PAYABLE_CREATED',entityType:'PartnerPayable',entityId:payable.id,summary:'Partner payable created from verified invoice/source data.',metadata:{bookingId:body.bookingId,partnerId:body.partnerId,amount:body.amount}});
  return NextResponse.json({payable},{status:201});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Please check payable details.',fields:error.flatten().fieldErrors},{status:400});
  const auth=adminAuthError(error); if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error('Create partner payable failed',error); return NextResponse.json({error:'Unable to create partner payable.'},{status:500});
 }
}
