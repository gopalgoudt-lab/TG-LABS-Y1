import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

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
  const admin=await adminFromRequest(request);
  const ipAddress=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null;
  const userAgent=request.headers.get('user-agent')||null;
  const {id}=await params; const body=schema.parse(await request.json());
  const current=await prisma.partnerPayable.findUnique({where:{id}}); if(!current)return NextResponse.json({error:'Partner payable not found.'},{status:404});
  if(body.paidAmount>current.amount)return NextResponse.json({error:'Paid amount cannot exceed payable amount.'},{status:400});
  if(body.status==='PAID'&&body.paidAmount!==current.amount)return NextResponse.json({error:'PAID requires the full payable amount.'},{status:400});
  if(body.status==='PARTIALLY_PAID'&&(body.paidAmount<=0||body.paidAmount>=current.amount))return NextResponse.json({error:'PARTIALLY_PAID requires an amount greater than zero and below the payable amount.'},{status:400});
  const transitions:Record<string,string[]>={PENDING:['INVOICED','DISPUTED','VOID'],INVOICED:['APPROVED','DISPUTED','VOID'],APPROVED:['PARTIALLY_PAID','PAID','DISPUTED','VOID'],PARTIALLY_PAID:['PARTIALLY_PAID','PAID','DISPUTED'],DISPUTED:['PENDING','INVOICED','APPROVED','VOID'],PAID:[],VOID:[]};
  if(body.status!==current.status&&!transitions[current.status]?.includes(body.status))return NextResponse.json({error:`Invalid payable status transition: ${current.status} → ${body.status}.`},{status:400});
  if(['APPROVED','PARTIALLY_PAID','PAID'].includes(body.status)&&!body.invoiceNumber)return NextResponse.json({error:'Invoice number is required before approval or payment.'},{status:400});
  const payable=await prisma.$transaction(async tx=>{
   const updated=await tx.partnerPayable.update({where:{id},data:{status:body.status,invoiceNumber:body.invoiceNumber||null,invoiceDate:body.invoiceDate?new Date(body.invoiceDate):null,paidAmount:body.paidAmount,settledAt:body.status==='PAID'?(body.settledAt?new Date(body.settledAt):new Date()):null,approvedAt:['APPROVED','PARTIALLY_PAID','PAID'].includes(body.status)&&!current.approvedAt?new Date():current.approvedAt,notes:body.notes||null}});
   await tx.adminAuditLog.create({data:{adminPhone:admin.phone,action:'PARTNER_PAYABLE_UPDATE',entityType:'PartnerPayable',entityId:updated.id,summary:`Partner payable updated from ${current.status} to ${updated.status}`,metadata:{fromStatus:current.status,toStatus:updated.status,fromPaidAmount:current.paidAmount,toPaidAmount:updated.paidAmount,fromInvoiceNumber:current.invoiceNumber,toInvoiceNumber:updated.invoiceNumber,fromInvoiceDate:current.invoiceDate?.toISOString()??null,toInvoiceDate:updated.invoiceDate?.toISOString()??null,fromSettledAt:current.settledAt?.toISOString()??null,toSettledAt:updated.settledAt?.toISOString()??null,fromApprovedAt:current.approvedAt?.toISOString()??null,toApprovedAt:updated.approvedAt?.toISOString()??null,actorRole:'ADMIN',actorSource:'TG_LABS_ADMIN'},ipAddress,userAgent}});
   return updated;
  });
  return NextResponse.json({payable});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Please check payable update details.',fields:error.flatten().fieldErrors},{status:400});
  const auth=adminAuthError(error); if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error('Update partner payable failed',error); return NextResponse.json({error:'Unable to update partner payable.'},{status:500});
 }
}
