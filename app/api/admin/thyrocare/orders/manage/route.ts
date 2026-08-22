import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const barcodeSchema=z.string().trim().transform(v=>v.toUpperCase()).refine(v=>/^(?:\d{8}|(?=[A-Z0-9]{8}$)(?=.*[A-Z])(?=.*\d)[A-Z0-9]{8})$/.test(v),{message:'Barcode must be exactly 8 characters: either 8 digits or a combination of letters and numbers.'});
const tubeStatusSchema=z.enum(['BARCODE_ENTERED','SAMPLE_COLLECTED','RECEIVED_AT_LAB','PROCESSING','COMPLETED']);
const sampleBarcodeSchema=z.object({sampleType:z.string().trim().min(1).max(80),barcode:barcodeSchema});
const sampleTrackingSchema=z.object({
 key:z.string().trim().min(1).max(120),sampleType:z.string().trim().min(1).max(80),barcode:barcodeSchema,status:tubeStatusSchema,required:z.boolean().default(true),
 statusUpdatedAt:z.string().datetime().optional(),collectedAt:z.string().datetime().nullable().optional(),receivedAt:z.string().datetime().nullable().optional(),processingAt:z.string().datetime().nullable().optional(),completedAt:z.string().datetime().nullable().optional()
});
const sampleStatusSchema=z.enum(['BARCODE_PENDING','BARCODE_ENTERED','SAMPLE_COLLECTED','RECEIVED_AT_LAB','PROCESSING','REPORT_READY']);
const editSchema=z.object({
 id:z.string().min(1),name:z.string().trim().min(2).max(120),age:z.coerce.number().int().min(0).max(120),gender:z.enum(['Male','Female','Others']),phone:z.string().regex(/^[0-9]{10}$/),doctorName:z.string().trim().max(120).optional().default(''),tests:z.array(z.string().trim().min(1).max(160)).min(1).max(60),totalAmount:z.coerce.number().int().min(0).max(1000000),discount:z.coerce.number().int().min(0).max(1000000).default(0),paidAmount:z.coerce.number().int().min(0).max(1000000).default(0),paymentMode:z.enum(['CASH','UPI','CARD','MULTIPLE']),paymentModes:z.array(z.enum(['CASH','UPI','CARD'])).max(3).optional().default([]),
 sampleBarcodes:z.array(sampleBarcodeSchema).max(20).optional().default([]),extraBarcodes:z.array(barcodeSchema).max(20).optional().default([]),sampleTracking:z.array(sampleTrackingSchema).max(40).optional().default([]),sampleStatus:sampleStatusSchema.optional()
});
function parseMeta(value:string|null){try{return value?JSON.parse(value) as Record<string,any>:{} }catch{return {}}}
function dbPaymentMode(mode:string){return mode==='CASH'?'CASH':mode==='UPI'?'UPI':mode==='CARD'?'CARD':'OTHER'}
const rank={BARCODE_ENTERED:1,SAMPLE_COLLECTED:2,RECEIVED_AT_LAB:3,PROCESSING:4,COMPLETED:5} as const;
function deriveOrderStatus(rows:Array<{status:keyof typeof rank;required:boolean}>){
 const required=rows.filter(x=>x.required);if(!required.length)return 'BARCODE_PENDING';
 const min=Math.min(...required.map(x=>rank[x.status]));
 if(required.every(x=>x.status==='COMPLETED'))return 'REPORT_READY';
 if(min>=4)return 'PROCESSING';if(min>=3)return 'RECEIVED_AT_LAB';if(min>=2)return 'SAMPLE_COLLECTED';return 'BARCODE_ENTERED';
}

export async function PATCH(request:Request){
 try{
  const identity=await requireThyrocareRole(request,['ADMIN','STAFF']);const b=editSchema.parse(await request.json());
  if(b.discount>b.totalAmount)return NextResponse.json({error:'Discount cannot exceed total amount.'},{status:400});
  const net=Math.max(0,b.totalAmount-b.discount);if(b.paidAmount>net)return NextResponse.json({error:'Paid amount cannot exceed net amount.'},{status:400});
  if(b.paymentMode==='MULTIPLE'&&new Set(b.paymentModes).size<2)return NextResponse.json({error:'Select at least two payment methods for Multiple.'},{status:400});
  const allBarcodes=[...b.sampleBarcodes.map(x=>x.barcode),...b.extraBarcodes,...b.sampleTracking.map(x=>x.barcode)];
  if(new Set(allBarcodes).size!==allBarcodes.length&&b.sampleTracking.length===0)return NextResponse.json({error:'Duplicate barcode numbers are not allowed in the same order.'},{status:400});
  if(b.sampleTracking.length){const t=b.sampleTracking.map(x=>x.barcode);if(new Set(t).size!==t.length)return NextResponse.json({error:'Duplicate barcode numbers are not allowed in the same order.'},{status:400});}
  const booking=await prisma.booking.findFirst({where:{id:b.id,createdByAdmin:'THYROCARE_MANUAL'},include:{patient:true}});if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});
  const balance=Math.max(0,net-b.paidAmount);const old=parseMeta(booking.adminNotes);const now=new Date();const nowIso=now.toISOString();
  const previousTracking=Array.isArray(old.sampleTracking)?old.sampleTracking:[];
  const tracking=b.sampleTracking.map(row=>{const prev=previousTracking.find((x:any)=>x.key===row.key||x.barcode===row.barcode);const changed=!prev||prev.status!==row.status;return {...row,statusUpdatedAt:changed?nowIso:(prev?.statusUpdatedAt||row.statusUpdatedAt||nowIso),collectedAt:rank[row.status]>=2?(prev?.collectedAt||row.collectedAt||nowIso):null,receivedAt:rank[row.status]>=3?(prev?.receivedAt||row.receivedAt||nowIso):null,processingAt:rank[row.status]>=4?(prev?.processingAt||row.processingAt||nowIso):null,completedAt:rank[row.status]>=5?(prev?.completedAt||row.completedAt||nowIso):null};});
  const sampleStatus=(tracking.length?deriveOrderStatus(tracking):b.sampleStatus)||(typeof old.sampleStatus==='string'?old.sampleStatus:'BARCODE_PENDING');
  if(b.sampleStatus==='REPORT_READY'&&tracking.some(x=>x.required&&x.status!=='COMPLETED'))return NextResponse.json({error:'Report Ready is blocked until every required sample is completed.'},{status:400});
  const requiredRows=tracking.filter(x=>x.required);const sampleBarcodes=tracking.length?requiredRows.map(x=>({sampleType:x.sampleType,barcode:x.barcode})):b.sampleBarcodes;const extraBarcodes=tracking.length?tracking.filter(x=>!x.required).map(x=>x.barcode):b.extraBarcodes;
  const meta={...old,brand:'THYROCARE',billNumber:String(old.billNumber||''),tests:b.tests,grossAmount:b.totalAmount,discount:b.discount,paidAmount:b.paidAmount,balance,patient:{name:b.name,age:b.age,gender:b.gender,phone:b.phone,doctorName:b.doctorName},doctorName:b.doctorName,paymentMode:b.paymentMode,paymentModes:b.paymentMode==='MULTIPLE'?[...new Set(b.paymentModes)]:[b.paymentMode],sampleBarcodes,extraBarcodes,sampleTracking:tracking,barcodeUpdatedAt:nowIso,sampleStatus,sampleStatusUpdatedAt:nowIso};
  const workflowStatus=sampleStatus==='SAMPLE_COLLECTED'?'SAMPLE_COLLECTED':sampleStatus==='RECEIVED_AT_LAB'?'SAMPLE_RECEIVED_AT_LAB':sampleStatus==='PROCESSING'?'PROCESSING':sampleStatus==='REPORT_READY'?'REPORT_READY':booking.workflowStatus;
  const allRequiredAt=(n:number)=>requiredRows.length>0&&requiredRows.every(x=>rank[x.status]>=n);
  await prisma.booking.update({where:{id:b.id},data:{doctorName:b.doctorName||null,totalAmount:net,paymentStatus:balance===0?'PAID':'PENDING',paymentMode:dbPaymentMode(b.paymentMode),paidAt:balance===0?(booking.paidAt||now):null,workflowStatus,sampleCollectedAt:allRequiredAt(2)?(booking.sampleCollectedAt||now):booking.sampleCollectedAt,sampleReceivedAt:allRequiredAt(3)?(booking.sampleReceivedAt||now):booking.sampleReceivedAt,processingStartedAt:allRequiredAt(4)?(booking.processingStartedAt||now):booking.processingStartedAt,reportReadyAt:sampleStatus==='REPORT_READY'?(booking.reportReadyAt||now):booking.reportReadyAt,adminNotes:JSON.stringify(meta)}});
  await writeAdminAudit(request,{action:'THYROCARE_SAMPLE_TRACKING_UPDATED',entityType:'Booking',entityId:b.id,summary:`${identity.role} updated sample tracking for ${b.id}`,metadata:{role:identity.role,sampleStatus,sampleTracking:tracking}});
  return NextResponse.json({ok:true,sampleStatus,sampleTracking:tracking});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||'Please check the edited order details.'},{status:400});
  const e=thyrocareAuthError(error);if(e.status!==401||error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});console.error(error);return NextResponse.json({error:'Unable to edit order.'},{status:500})
 }
}

export async function DELETE(request:Request){
 try{const identity=await requireThyrocareRole(request,['ADMIN']);const body=await request.json();const id=z.string().min(1).parse(body.id);const booking=await prisma.booking.findFirst({where:{id,createdByAdmin:'THYROCARE_MANUAL'}});if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});await writeAdminAudit(request,{action:'THYROCARE_MANUAL_ORDER_DELETED',entityType:'Booking',entityId:id,summary:`Admin deleted Thyrocare manual order ${id}`,metadata:{role:identity.role}});await prisma.booking.delete({where:{id}});return NextResponse.json({ok:true});
 }catch(error){const e=thyrocareAuthError(error);if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});console.error(error);return NextResponse.json({error:'Unable to delete order.'},{status:500})}
}
