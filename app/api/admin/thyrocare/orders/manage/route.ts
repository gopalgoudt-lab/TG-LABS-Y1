import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const barcodeSchema=z.string().trim().transform(v=>v.toUpperCase()).refine(v=>/^(?:\d{8}|(?=[A-Z0-9]{8}$)(?=.*[A-Z])(?=.*\d)[A-Z0-9]{8})$/.test(v),{message:'Barcode must be exactly 8 characters: either 8 digits or a combination of letters and numbers.'});
const sampleBarcodeSchema=z.object({sampleType:z.string().trim().min(1).max(80),barcode:barcodeSchema});
const editSchema=z.object({
 id:z.string().min(1),name:z.string().trim().min(2).max(120),age:z.coerce.number().int().min(0).max(120),gender:z.enum(['Male','Female','Others']),phone:z.string().regex(/^[0-9]{10}$/),doctorName:z.string().trim().max(120).optional().default(''),tests:z.array(z.string().trim().min(1).max(160)).min(1).max(60),totalAmount:z.coerce.number().int().min(0).max(1000000),discount:z.coerce.number().int().min(0).max(1000000).default(0),paidAmount:z.coerce.number().int().min(0).max(1000000).default(0),paymentMode:z.enum(['CASH','UPI','CARD','MULTIPLE']),paymentModes:z.array(z.enum(['CASH','UPI','CARD'])).max(3).optional().default([]),
 sampleBarcodes:z.array(sampleBarcodeSchema).max(20).optional().default([]),extraBarcodes:z.array(barcodeSchema).max(20).optional().default([])
});
function parseMeta(value:string|null){try{return value?JSON.parse(value) as Record<string,unknown>:{} }catch{return {}}}
function dbPaymentMode(mode:string){return mode==='CASH'?'CASH':mode==='UPI'?'UPI':mode==='CARD'?'CARD':'OTHER'}

export async function PATCH(request:Request){
 try{
  const identity=await requireThyrocareRole(request,['ADMIN','STAFF']);const b=editSchema.parse(await request.json());
  if(b.discount>b.totalAmount)return NextResponse.json({error:'Discount cannot exceed total amount.'},{status:400});
  const net=Math.max(0,b.totalAmount-b.discount);if(b.paidAmount>net)return NextResponse.json({error:'Paid amount cannot exceed net amount.'},{status:400});
  if(b.paymentMode==='MULTIPLE'&&new Set(b.paymentModes).size<2)return NextResponse.json({error:'Select at least two payment methods for Multiple.'},{status:400});
  const allBarcodes=[...b.sampleBarcodes.map(x=>x.barcode),...b.extraBarcodes];if(new Set(allBarcodes).size!==allBarcodes.length)return NextResponse.json({error:'Duplicate barcode numbers are not allowed in the same order.'},{status:400});
  const booking=await prisma.booking.findFirst({where:{id:b.id,createdByAdmin:'THYROCARE_MANUAL'},include:{patient:true}});if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});
  const balance=Math.max(0,net-b.paidAmount);const old=parseMeta(booking.adminNotes);
  const meta={...old,brand:'THYROCARE',billNumber:String(old.billNumber||''),tests:b.tests,grossAmount:b.totalAmount,discount:b.discount,paidAmount:b.paidAmount,balance,patient:{name:b.name,age:b.age,gender:b.gender,phone:b.phone,doctorName:b.doctorName},doctorName:b.doctorName,paymentMode:b.paymentMode,paymentModes:b.paymentMode==='MULTIPLE'?[...new Set(b.paymentModes)]:[b.paymentMode],sampleBarcodes:b.sampleBarcodes,extraBarcodes:b.extraBarcodes,barcodeUpdatedAt:new Date().toISOString()};
  await prisma.booking.update({where:{id:b.id},data:{doctorName:b.doctorName||null,totalAmount:net,paymentStatus:balance===0?'PAID':'PENDING',paymentMode:dbPaymentMode(b.paymentMode),paidAt:balance===0?(booking.paidAt||new Date()):null,adminNotes:JSON.stringify(meta)}});
  await writeAdminAudit(request,{action:'THYROCARE_MANUAL_ORDER_UPDATED',entityType:'Booking',entityId:b.id,summary:`${identity.role} updated Thyrocare manual order ${b.id}`,metadata:{role:identity.role,totalAmount:b.totalAmount,discount:b.discount,paidAmount:b.paidAmount,balance,sampleBarcodes:b.sampleBarcodes,extraBarcodes:b.extraBarcodes}});
  return NextResponse.json({ok:true});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||'Please check the edited order details.'},{status:400});
  const e=thyrocareAuthError(error);if(e.status!==401||error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});console.error(error);return NextResponse.json({error:'Unable to edit order.'},{status:500})
 }
}

export async function DELETE(request:Request){
 try{const identity=await requireThyrocareRole(request,['ADMIN']);const body=await request.json();const id=z.string().min(1).parse(body.id);const booking=await prisma.booking.findFirst({where:{id,createdByAdmin:'THYROCARE_MANUAL'}});if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});await writeAdminAudit(request,{action:'THYROCARE_MANUAL_ORDER_DELETED',entityType:'Booking',entityId:id,summary:`Admin deleted Thyrocare manual order ${id}`,metadata:{role:identity.role}});await prisma.booking.delete({where:{id}});return NextResponse.json({ok:true});
 }catch(error){const e=thyrocareAuthError(error);if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});console.error(error);return NextResponse.json({error:'Unable to delete order.'},{status:500})}
}
