import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const booking=await prisma.booking.findUnique({where:{id},include:{patient:{include:{bookings:{orderBy:{createdAt:'desc'},take:20,include:{items:{include:{test:true}}}}}},items:{include:{test:true}}}});
 if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
 return NextResponse.json({booking});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const{id}=await params,b=schema.parse(await request.json()),existing=await prisma.booking.findUnique({where:{id},include:{patient:true}});
  if(!existing)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(existing.status==='CANCELLED'||existing.status==='COMPLETED')return NextResponse.json({error:'Cancelled or completed bookings cannot be edited here.'},{status:409});
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
  const totalAmount=diagnosticAmount+(existing.printedReportFee||0);

  const booking=await prisma.$transaction(async tx=>{
   let patientId=existing.patientId;const pdata={name:b.name,email:b.email,age:b.age??null,gender:normalizeGender(b.gender)};
   if(existing.patient.phone!==b.phone){const target=await tx.patient.findUnique({where:{phone:b.phone}});if(target){patientId=target.id;await tx.patient.update({where:{id:target.id},data:pdata})}else await tx.patient.update({where:{id:existing.patientId},data:{phone:b.phone,...pdata}})}else await tx.patient.update({where:{id:existing.patientId},data:pdata});
   await tx.bookingItem.deleteMany({where:{bookingId:id}});
   return tx.booking.update({where:{id},data:{patientId,mode:b.mode,address:b.mode==='HOME'?b.address:null,pincode:b.mode==='HOME'?b.pincode:null,collectionDate:new Date(`${b.date}T00:00:00.000Z`),slot:b.slot,totalAmount,adminNotes:b.adminNotes||null,...workflowData,items:{create:[...itemMap.values()].map(t=>({testId:t.id,price:t.price}))}},include:{patient:true,items:{include:{test:true}}}})
  });
  return NextResponse.json({booking,diagnosticAmount,totalAmount});
 }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:'Please check the booking details.',fields:error.flatten().fieldErrors},{status:400});console.error(error);return NextResponse.json({error:'Unable to update booking.'},{status:500})}
}
