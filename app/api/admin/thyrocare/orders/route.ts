import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

const createSchema=z.object({
  name:z.string().trim().min(2).max(120),
  age:z.coerce.number().int().min(0).max(120),
  gender:z.enum(['Male','Female','Others']),
  phone:z.string().regex(/^[0-9]{10}$/),
  email:z.string().trim().email().max(180).optional().or(z.literal('')).default(''),
  doctorName:z.string().trim().max(120).optional().default(''),
  tests:z.array(z.string().trim().min(1).max(160)).min(1).max(40),
  totalAmount:z.coerce.number().int().min(0).max(1000000),
  homeCollectionCharge:z.coerce.number().int().min(0).max(100000).optional().default(0),
  discount:z.coerce.number().int().min(0).max(1000000).default(0),
  paidAmount:z.coerce.number().int().min(0).max(1000000).default(0),
  billNumber:z.string().trim().max(30).optional().default(''),
  paymentMode:z.enum(['CASH','UPI','CARD','MULTIPLE']).optional().default('CASH'),
  paymentModes:z.array(z.enum(['CASH','UPI','CARD'])).max(3).optional().default([]),
});

type PatientSnapshot={name:string;age:number|null;gender:string|null;phone:string;email?:string;doctorName?:string};
type SampleBarcode={sampleType:string;barcode:string};
type SampleTracking={key:string;sampleType:string;barcode:string;status:string;required:boolean;statusUpdatedAt?:string;collectedAt?:string|null;receivedAt?:string|null;processingAt?:string|null;completedAt?:string|null};
type ManualMeta={
  brand:'THYROCARE';billNumber:string;tests:string[];grossAmount:number;testAmount?:number;homeCollectionCharge?:number;discount:number;paidAmount?:number;balance:number;
  patient?:PatientSnapshot;email?:string;doctorName?:string;sampleEntryAt?:string;paymentMode?:'CASH'|'UPI'|'CARD'|'MULTIPLE';paymentModes?:string[];
  sampleBarcodes?:SampleBarcode[];extraBarcodes?:string[];sampleTracking?:SampleTracking[];barcodeUpdatedAt?:string;sampleStatus?:string;sampleStatusUpdatedAt?:string;reportType?:'FULL'|'PARTIAL';
};
function parseMeta(value:string|null):ManualMeta|null{try{return value?JSON.parse(value) as ManualMeta:null}catch{return null}}
function orderId(){const d=new Date();const date=`${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;return `THY-${date}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function patientFrom(b:{patient:{name:string;age:number|null;gender:string|null;phone:string};doctorName:string|null;adminNotes:string|null}){const m=parseMeta(b.adminNotes);return m?.patient||{name:b.patient.name,age:b.patient.age,gender:b.patient.gender,phone:b.patient.phone,email:m?.email||'',doctorName:m?.doctorName||b.doctorName||''}}

export async function GET(request:Request){
 const url=new URL(request.url);const phone=(url.searchParams.get('phone')||'').replace(/\D/g,'').slice(-10);
 const rows=await prisma.booking.findMany({where:{createdByAdmin:'THYROCARE_MANUAL',...(phone?{patient:{phone}}:{})},include:{patient:true},orderBy:{createdAt:'desc'},take:250});
 if(phone){
  const seen=new Map<string,PatientSnapshot>();
  for(const b of rows){const p=patientFrom(b);const key=`${p.name.toLowerCase()}|${p.age??''}|${p.gender??''}`;if(!seen.has(key))seen.set(key,{...p,phone});}
  const current=await prisma.patient.findUnique({where:{phone}});
  if(current){const key=`${current.name.toLowerCase()}|${current.age??''}|${current.gender??''}`;if(!seen.has(key))seen.set(key,{name:current.name,age:current.age,gender:current.gender,phone,email:''});}
  return NextResponse.json({familyMembers:[...seen.values()]});
 }
 return NextResponse.json({orders:rows.map(b=>{
   const m=parseMeta(b.adminNotes);const p=patientFrom(b);const charge=m?.homeCollectionCharge||0;const total=m?.grossAmount??b.totalAmount;const testAmount=m?.testAmount??Math.max(0,total-charge);const discount=m?.discount||0;const net=Math.max(0,total-discount);const balance=m?.balance||0;const paidAmount=m?.paidAmount??Math.max(0,net-balance);const sampleEntryAt=b.sampleReceivedAt||m?.sampleEntryAt||b.createdAt;
   const storedMode=m?.paymentMode||(b.paymentMode==='CASH'||b.paymentMode==='UPI'||b.paymentMode==='CARD'?b.paymentMode:'OTHER');
   const sampleStatus=m?.sampleStatus||(m?.sampleTracking?.length||m?.sampleBarcodes?.length||m?.extraBarcodes?.length?'BARCODE_ENTERED':'BARCODE_PENDING');
   const reportType=m?.reportType||'FULL';const hasReport=!!b.reportData;
   return {id:b.id,orderId:b.id,billNumber:m?.billNumber||'',createdAt:sampleEntryAt,sampleEntryAt,patient:{name:p.name,age:p.age,gender:p.gender,phone:p.phone,email:p.email||m?.email||''},email:p.email||m?.email||'',doctorName:m?.doctorName||b.doctorName||'',tests:m?.tests||[],testAmount,homeCollectionCharge:charge,totalAmount:total,discount,paidAmount,balance,netAmount:net,paymentStatus:b.paymentStatus,paymentMode:storedMode,paymentModes:m?.paymentModes||[],sampleBarcodes:m?.sampleBarcodes||[],extraBarcodes:m?.extraBarcodes||[],sampleTracking:m?.sampleTracking||[],barcodeUpdatedAt:m?.barcodeUpdatedAt||null,sampleStatus,sampleStatusUpdatedAt:m?.sampleStatusUpdatedAt||null,sampleCollectedAt:b.sampleCollectedAt,sampleReceivedAt:b.sampleReceivedAt,processingStartedAt:b.processingStartedAt,reportName:b.reportName,reportType,reportAvailable:hasReport,reportReady:hasReport&&reportType==='FULL',reportReadyAt:b.reportReadyAt};
 })});
}

export async function POST(request:Request){
 try{
  const b=createSchema.parse(await request.json());const gross=b.totalAmount+b.homeCollectionCharge;
  const net=Math.max(0,gross-b.discount);
  if(b.discount>gross)return NextResponse.json({error:'Discount cannot exceed total amount including home collection charges.'},{status:400});
  if(b.paidAmount>net)return NextResponse.json({error:'Paid amount cannot exceed net amount.'},{status:400});
  if(b.paymentMode==='MULTIPLE'&&new Set(b.paymentModes).size<2)return NextResponse.json({error:'Select at least two payment methods for Multiple payment mode.'},{status:400});
  const balance=Math.max(0,net-b.paidAmount);
  const patient=await prisma.patient.upsert({where:{phone:b.phone},update:{name:b.name,age:b.age,gender:b.gender},create:{name:b.name,phone:b.phone,age:b.age,gender:b.gender}});
  const id=orderId();const bill=b.billNumber||`OP${String(Date.now()).slice(-6)}`;
  const snapshot:PatientSnapshot={name:b.name,age:b.age,gender:b.gender,phone:b.phone,email:b.email,doctorName:b.doctorName};
  const now=new Date();const paymentModes=b.paymentMode==='MULTIPLE'?[...new Set(b.paymentModes)]:[b.paymentMode];
  const meta:ManualMeta={brand:'THYROCARE',billNumber:bill,tests:b.tests,grossAmount:gross,testAmount:b.totalAmount,homeCollectionCharge:b.homeCollectionCharge,discount:b.discount,paidAmount:b.paidAmount,balance,patient:snapshot,email:b.email,doctorName:b.doctorName,sampleEntryAt:now.toISOString(),paymentMode:b.paymentMode,paymentModes,sampleBarcodes:[],extraBarcodes:[],sampleTracking:[],sampleStatus:'BARCODE_PENDING',sampleStatusUpdatedAt:now.toISOString(),reportType:'FULL'};
  const dbPaymentMode=b.paymentMode==='MULTIPLE'?'OTHER':b.paymentMode;
  const booking=await prisma.booking.create({data:{id,patientId:patient.id,doctorName:b.doctorName||null,mode:'CENTRE',source:'ADMIN',collectionDate:now,slot:'Manual order',status:balance===0?'CONFIRMED':'PENDING',paymentStatus:balance===0?'PAID':'PENDING',paymentMode:dbPaymentMode,totalAmount:net,workflowStatus:'BOOKING_CREATED',adminNotes:JSON.stringify(meta),createdByAdmin:'THYROCARE_MANUAL',paidAt:balance===0?now:null},include:{patient:true}});
  await writeAdminAudit(request,{action:'THYROCARE_MANUAL_ORDER_CREATED',entityType:'Booking',entityId:booking.id,summary:`Created Thyrocare manual order ${booking.id}`,metadata:{billNumber:bill,tests:b.tests,testAmount:b.totalAmount,homeCollectionCharge:b.homeCollectionCharge,totalAmount:gross,discount:b.discount,paidAmount:b.paidAmount,balance,email:b.email,doctorName:b.doctorName,sampleEntryAt:now.toISOString(),paymentMode:b.paymentMode,paymentModes,sampleStatus:'BARCODE_PENDING'}});
  return NextResponse.json({ok:true,id:booking.id,billNumber:bill,balance,totalAmount:gross,homeCollectionCharge:b.homeCollectionCharge,sampleEntryAt:now.toISOString(),paymentMode:b.paymentMode,paymentModes},{status:201});
 }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:'Please check the manual order details.',fields:error.flatten().fieldErrors},{status:400});console.error('POST /api/admin/thyrocare/orders failed',error);return NextResponse.json({error:'Unable to create Thyrocare manual order.'},{status:500})}
}
