import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

const schema=z.object({
 status:z.enum(['PENDING','INVOICED','APPROVED','PARTIALLY_PAID','PAID','DISPUTED','VOID']),
 invoiceNumber:z.string().trim().max(160).optional().nullable(),
 invoiceDate:z.string().datetime().optional().nullable(),
 paidAmount:z.coerce.number().int().min(0).max(100000000),
 settledAt:z.string().datetime().optional().nullable(),
 notes:z.string().trim().max(2000).optional().nullable(),
});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await adminFromRequest(request);
  const {id}=await params; const body=schema.parse(await request.json());
  const current=await prisma.partnerPayable.findUnique({where:{id}}); if(!current)return NextResponse.json({error:'Partner payable not found.'},{status:404});
  if(body.paidAmount>current.amount)return NextResponse.json({error:'Paid amount cannot exceed payable amount.'},{status:400});
  if(body.status==='PAID'&&body.paidAmount!==current.amount)return NextResponse.json({error:'PAID requires the full payable amount.'},{status:400});
  if(body.status==='PARTIALLY_PAID'&&(body.paidAmount<=0||body.paidAmount>=current.amount))return NextResponse.json({error:'PARTIALLY_PAID requires an amount greater than zero and below the payable amount.'},{status:400});
  if(body.status==='APPROVED'&&!body.invoiceNumber)return NextResponse.json({error:'Invoice number is required before approval.'},{status:400});
  const payable=await prisma.partnerPayable.update({where:{id},data:{status:body.status,invoiceNumber:body.invoiceNumber||null,invoiceDate:body.invoiceDate?new Date(body.invoiceDate):null,paidAmount:body.paidAmount,settledAt:body.status==='PAID'?(body.settledAt?new Date(body.settledAt):new Date()):null,approvedAt:body.status==='APPROVED'&&!current.approvedAt?new Date():current.approvedAt,notes:body.notes||null}});
  await writeAdminAudit(request,{action:'PARTNER_PAYABLE_UPDATED',entityType:'PartnerPayable',entityId:id,summary:'Partner payable status or settlement evidence updated.',metadata:{fromStatus:current.status,toStatus:body.status,fromPaidAmount:current.paidAmount,toPaidAmount:body.paidAmount}});
  return NextResponse.json({payable});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Please check payable update details.',fields:error.flatten().fieldErrors},{status:400});
  const auth=adminAuthError(error); if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error('Update partner payable failed',error); return NextResponse.json({error:'Unable to update partner payable.'},{status:500});
 }
}
