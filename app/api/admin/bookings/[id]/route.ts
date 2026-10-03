import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const FLOW=['BOOKING_CREATED','BOOKING_CONFIRMED','TECHNICIAN_ASSIGNED','SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB','PROCESSING','REPORT_READY','REPORT_DELIVERED'] as const;
type WorkflowStage=(typeof FLOW)[number];
const GENDER_VALUES=['Male','Female','Others','MALE','FEMALE','OTHERS'] as const;

const schema=z.object({
 name:z.string().trim().min(2).max(120),phone:z.string().regex(/^[0-9]{10}$/),email:z.string().trim().email().max(200),age:z.coerce.number().int().min(0).max(120).nullable().optional(),gender:z.enum(GENDER_VALUES).nullable().optional(),mode:z.enum(['HOME','CENTRE']),address:z.string().trim().max(500).optional().default(''),pincode:z.string().regex(/^[1-9][0-9]{5}$/).optional().default(''),date:z.string().date(),slot:z.string().trim().min(3).max(60),testIds:z.array(z.string()).default([]),packageIds:z.array(z.string()).default([]),adminNotes:z.string().trim().max(1000).optional().default(''),technician:z.string().trim().max(120).optional().default(''),workflowStatus:z.enum(FLOW).optional()
}).refine(v=>v.testIds.length+v.packageIds.length>0,{message:'Select at least one test or package.'}).refine(v=>v.mode!=='HOME'||Boolean(v.address&&v.pincode),{message:'Address and 6-digit pincode are required for home collection.'});

function normalizeGender(value:(typeof GENDER_VALUES)[number]|null|undefined){
 if(!value)return null;
 if(value==='MALE')return 'Male';
 if(value==='FEMALE')return 'Female';
 if(value==='OTHERS')return 'Others';
 return value;
}

function workflowUpdate(existing:any,target:WorkflowStage|undefined,technician:string){
 if(!target)return {};
 const current=(FLOW.includes(existing.workflowStatus as WorkflowStage)?existing.workflowStatus:'BOOKING_CREATED') as WorkflowStage;
 const currentIndex=FLOW.indexOf(current),targetIndex=FLOW.indexOf(target);
 if(targetIndex<currentIndex)throw new Error('WORKFLOW_BACKWARD');
 if(targetIndex>currentIndex+1)throw new Error('WORKFLOW_SKIP');
 if(target==='TECHNICIAN_ASSIGNED'&&!technician&&!existing.technician)throw new Error('TECHNICIAN_REQUIRED');
 if(target===current)return technician!==existing.technician?{technician:technician||null}:{};
 const now=new Date();
 const data:any={workflowStatus:target,technician:technician||existing.technician||null};
 if(target==='BOOKING_CONFIRMED'&&!existing.bookingConfirmedAt)data.bookingConfirmedAt=now;
 if(target==='TECHNICIAN_ASSIGNED'&&!existing.technicianAssignedAt)data.technicianAssignedAt=now;
 if(target==='SAMPLE_COLLECTED'&&!existing.sampleCollectedAt)data.sampleCollectedAt=now;
 if(target==='SAMPLE_RECEIVED_AT_LAB'&&!existing.sampleReceivedAt)data.sampleReceivedAt=now;
 if(target==='PROCESSING'&&!existing.processingStartedAt)data.processingStartedAt=now;
 if(target==='REPORT_READY'&&!existing.reportReadyAt)data.reportReadyAt=now;
 if(target==='REPORT_DELIVERED'&&!existing.reportDeliveredAt){data.reportDeliveredAt=now;data.status='COMPLETED';}
 return data;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await adminFromRequest(request)}catch(error){const auth=adminAuthError(error);return NextResponse.json({error:auth.error},{status:auth.status})}
 const{id}=await params;
 const booking=await prisma.booking.findUnique({where:{id},include:{patient:{include:{bookings:{orderBy:{createdAt:'desc'},take:20,include:{items:{include:{test:true}}}}}},items:{include:{test:true}},payments:{where:{status:'PAID'},orderBy:{createdAt:'desc'},take:1}}});
 if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
 const snapshotTotal=booking.paymentReceiptSnapshot&&typeof booking.paymentReceiptSnapshot==='object'&&!Array.isArray(booking.paymentReceiptSnapshot)?Number((booking.paymentReceiptSnapshot as Record<string,unknown>).total):NaN;
 const paidTransactionAmount=booking.payments[0]?.amount;
 const authoritativePaidAmount=Number.isFinite(snapshotTotal)?snapshotTotal:(typeof paidTransactionAmount==='number'?paidTransactionAmount:null);
 const commercialIntegrity=booking.paymentStatus==='PAID'&&authoritativePaidAmount!==null&&Number(booking.totalAmount)!==Number(authoritativePaidAmount)
  ?{status:'MISMATCH',bookingTotal:booking.totalAmount,paidAmount:authoritativePaidAmount,message:'Paid booking amount differs from the frozen payment record. Commercial fields are locked; review before further financial changes.'}
  :{status:'OK'};
 const {payments:_,...safeBooking}=booking;
 return NextResponse.json({booking:safeBooking,commercialIntegrity});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await adminFromRequest(request);
  const{id}=await params,b=schema.parse(await request.json()),existing=await prisma.booking.findUnique({where:{id},include:{patient:true}});
  if(!existing)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(existing.status==='CANCELLED'||existing.status==='COMPLETED')return NextResponse.json({error:'Cancelled or completed bookings cannot be edited here.'},{status:409});
  // Do not allow final report delivery while a paid booking's current total
  // disagrees with its immutable payment evidence. This is a release-safety
  // gate only; it never rewrites historical financial records.
  if(b.workflowStatus==='REPORT_DELIVERED'&&existing.paymentStatus==='PAID'){
   const paidTx=await prisma.paymentTransaction.findFirst({where:{bookingId:id,status:'PAID'},orderBy:{createdAt:'desc'},select:{amount:true}});
   const snapshot=existing.paymentReceiptSnapshot;
   const snapshotTotal=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?Number((snapshot as Record<string,unknown>).total):NaN;
   const authoritativePaidAmount=Number.isFinite(snapshotTotal)?snapshotTotal:(paidTx?.amount??null);
   if(authoritativePaidAmount!==null&&Number(existing.totalAmount)!==Number(authoritativePaidAmount)){
    return NextResponse.json({error:'Report delivery is blocked because this paid booking has an unresolved amount mismatch. Review the payment integrity warning before delivery.'},{status:409});
   }
  }

  let workflowData:any={};
  try{workflowData=workflowUpdate(existing,b.workflowStatus,b.technician)}catch(error){
   if(error instanceof Error&&error.message==='WORKFLOW_BACKWARD')return NextResponse.json({error:'Workflow stages cannot be moved backwards from this screen.'},{status:409});
   if(error instanceof Error&&error.message==='WORKFLOW_SKIP')return NextResponse.json({error:'Advance the workflow one stage at a time.'},{status:409});
   if(error instanceof Error&&error.message==='TECHNICIAN_REQUIRED')return NextResponse.json({error:'Assign a technician before marking Technician Assigned.'},{status:409});
   throw error;
  }
  const tests=await prisma.diagnosticTest.findMany({where:{id:{in:b.testIds},active:true}}),packages=await prisma.diagnosticPackage.findMany({where:{id:{in:b.packageIds},active:true},include:{tests:{include:{test:true}}}});
  if(tests.length!==b.testIds.length||packages.length!==b.packageIds.length)return NextResponse.json({error:'One or more selected tests/packages are unavailable.'},{status:400});

  const covered=new Set<string>();for(const p of packages)for(const item of p.tests)covered.add(item.test.id);
  const itemMap=new Map<string,{id:string;price:number}>();
  for(const t of tests)if(!covered.has(t.id))itemMap.set(t.id,{id:t.id,price:t.price});
  for(const p of packages)for(const item of p.tests)if(!itemMap.has(item.test.id))itemMap.set(item.test.id,{id:item.test.id,price:0});
  const diagnosticAmount=packages.reduce((sum,p)=>sum+p.price,0)+tests.filter(t=>!covered.has(t.id)).reduce((sum,t)=>sum+t.price,0);
  const totalAmount=diagnosticAmount+(existing.homeCollectionCharge||0)+(existing.printedReportFee||0);

  // A paid booking is a financial record. Its charged amount and diagnostic
  // composition must not be rewritten by the general Admin edit form.
  // For a workflow-only transition, validate the immutable paid evidence and
  // preserve the existing commercial rows instead of reconstructing them from
  // the edit form (which can omit package selections).
  let paidWorkflowOnly=false;
  if(existing.paymentStatus==='PAID'){
   const [existingItems,existingPackages]=await Promise.all([
    prisma.bookingItem.findMany({where:{bookingId:id},select:{testId:true,price:true}}),
    prisma.bookingPackage.findMany({where:{bookingId:id},select:{packageId:true,price:true}})
   ]);
   const requestedItems=[...itemMap.values()];
   const normalize=(items:{id?:string;testId?:string;price:number}[])=>items.map(item=>({id:item.id??item.testId!,price:Number(item.price)})).sort((a,b)=>a.id.localeCompare(b.id)||a.price-b.price);
   const requestedPackages=packages.map(p=>({packageId:p.id,price:Number(p.price)})).sort((a,b)=>a.packageId.localeCompare(b.packageId)||a.price-b.price);
   const currentPackages=existingPackages.map(p=>({packageId:p.packageId,price:Number(p.price)})).sort((a,b)=>a.packageId.localeCompare(b.packageId)||a.price-b.price);
   const itemsMatch=JSON.stringify(normalize(existingItems))===JSON.stringify(normalize(requestedItems));
   const packagesMatch=JSON.stringify(currentPackages)===JSON.stringify(requestedPackages);
   const commercialMatch=itemsMatch&&packagesMatch&&Number(totalAmount)===Number(existing.totalAmount);
   const snapshot=existing.paymentReceiptSnapshot;
   const snapshotTotal=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?Number((snapshot as Record<string,unknown>).total):NaN;
   const frozenTotalMatches=Number.isFinite(snapshotTotal)&&Number(existing.totalAmount)===snapshotTotal;
   paidWorkflowOnly=Boolean(b.workflowStatus&&b.workflowStatus!==existing.workflowStatus&&frozenTotalMatches);
   if(!commercialMatch&&!paidWorkflowOnly){
    return NextResponse.json({error:'Paid booking tests, packages and amount are locked. Create an approved adjustment instead of editing the paid booking.'},{status:409});
   }
  }

  const booking=await prisma.$transaction(async tx=>{
   if(paidWorkflowOnly){
    return tx.booking.update({where:{id},data:{adminNotes:b.adminNotes||null,...workflowData},include:{patient:true,items:{include:{test:true}}}})
   }
   let patientId=existing.patientId;const pdata={name:b.name,email:b.email,age:b.age??null,gender:normalizeGender(b.gender)};
   if(existing.patient.phone!==b.phone){const target=await tx.patient.findUnique({where:{phone:b.phone}});if(target){patientId=target.id;await tx.patient.update({where:{id:target.id},data:pdata})}else await tx.patient.update({where:{id:existing.patientId},data:{phone:b.phone,...pdata}})}else await tx.patient.update({where:{id:existing.patientId},data:pdata});
   await tx.bookingItem.deleteMany({where:{bookingId:id}});
   return tx.booking.update({where:{id},data:{patientId,mode:b.mode,address:b.mode==='HOME'?b.address:null,pincode:b.mode==='HOME'?b.pincode:null,collectionDate:new Date(`${b.date}T00:00:00.000Z`),slot:b.slot,totalAmount,adminNotes:b.adminNotes||null,...workflowData,items:{create:[...itemMap.values()].map(t=>({testId:t.id,price:t.price}))}},include:{patient:true,items:{include:{test:true}}}})
  });
  return NextResponse.json({booking,diagnosticAmount,totalAmount});
 }catch(error){const auth=adminAuthError(error);if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});if(error instanceof z.ZodError)return NextResponse.json({error:'Please check the booking details.',fields:error.flatten().fieldErrors},{status:400});console.error(error);return NextResponse.json({error:'Unable to update booking.'},{status:500})}
}


export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await adminFromRequest(request);
  const {id}=await params;
  const body=z.object({
   action:z.enum(['CANCEL']),
   reason:z.string().trim().min(10).max(500),
   confirm:z.literal('CANCEL_BOOKING')
  }).parse(await request.json());
  const existing=await prisma.booking.findUnique({where:{id},select:{id:true,status:true,paymentStatus:true,reportName:true}});
  if(!existing)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(existing.status==='COMPLETED')return NextResponse.json({error:'Completed bookings cannot be cancelled.'},{status:409});
  if(existing.status==='CANCELLED')return NextResponse.json({booking:existing,unchanged:true});
  if(existing.paymentStatus==='PAID')return NextResponse.json({error:'Paid bookings require an approved refund/cancellation workflow and cannot be cancelled here.'},{status:409});
  if(existing.reportName)return NextResponse.json({error:'Bookings with a published report cannot be cancelled here.'},{status:409});
  const booking=await prisma.booking.update({where:{id},data:{status:'CANCELLED',adminNotes:body.reason}});
  await writeAdminAudit(request,{action:'BOOKING_CANCELLED',entityType:'Booking',entityId:id,summary:'Admin cancelled an unpaid booking.',metadata:{reason:body.reason}});
  return NextResponse.json({booking});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'A cancellation reason of at least 10 characters is required.'},{status:400});
  const auth=adminAuthError(error);
  if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error(error);return NextResponse.json({error:'Unable to cancel booking.'},{status:500});
 }
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await adminFromRequest(request);
  const {id}=await params;
  const body=z.object({
   reason:z.string().trim().min(10).max(500),
   confirm:z.literal('DELETE_TEST_BOOKING')
  }).parse(await request.json());
  const existing=await prisma.booking.findUnique({
   where:{id},
   include:{patient:{select:{name:true}},payments:{select:{status:true}},partnerPayables:{select:{id:true}}}
  });
  if(!existing)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(existing.paymentStatus==='PAID'||existing.payments.some(p=>p.status==='PAID'))
   return NextResponse.json({error:'Paid bookings cannot be deleted. Preserve the financial record and use the approved cancellation/refund workflow.'},{status:409});
  if(existing.reportName||existing.reportDeliveredAt||existing.status==='COMPLETED')
   return NextResponse.json({error:'Completed or reported bookings cannot be deleted.'},{status:409});
  if(existing.partnerPayables.length)
   return NextResponse.json({error:'Bookings with partner payable records cannot be deleted.'},{status:409});
  const marker=[existing.patient.name,existing.address,existing.adminNotes].filter(Boolean).join(' ').toUpperCase();
  if(!/(^|\W)(TEST|UAT|DEMO)(\W|$)|DO NOT PROCESS/.test(marker))
   return NextResponse.json({error:'Hard delete is restricted to clearly marked TEST/UAT/DEMO bookings. Use Cancel Booking for genuine patient bookings.'},{status:409});
  await prisma.booking.delete({where:{id}});
  await writeAdminAudit(request,{action:'TEST_BOOKING_DELETED',entityType:'Booking',entityId:id,summary:'Admin permanently deleted a clearly marked unpaid test/demo booking.',metadata:{reason:body.reason,patientName:existing.patient.name}});
  return NextResponse.json({deleted:true,id});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Deletion requires a reason of at least 10 characters and explicit confirmation.'},{status:400});
  const auth=adminAuthError(error);
  if(auth.status!==401||error instanceof Error&&error.message.includes('ADMIN'))return NextResponse.json({error:auth.error},{status:auth.status});
  console.error(error);return NextResponse.json({error:'Unable to delete test booking.'},{status:500});
 }
}
