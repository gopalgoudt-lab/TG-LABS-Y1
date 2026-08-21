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
  tests:z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  totalAmount:z.coerce.number().int().min(0).max(1000000),
  discount:z.coerce.number().int().min(0).max(1000000).default(0),
  balance:z.coerce.number().int().min(0).max(1000000).default(0),
  billNumber:z.string().trim().max(30).optional().default(''),
});

type ManualMeta={brand:'THYROCARE';billNumber:string;tests:string[];grossAmount:number;discount:number;balance:number};
function parseMeta(value:string|null):ManualMeta|null{try{return value?JSON.parse(value) as ManualMeta:null}catch{return null}}
function orderId(){const d=new Date();const date=`${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;return `THY-${date}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}

export async function GET(){
 const rows=await prisma.booking.findMany({where:{createdByAdmin:'THYROCARE_MANUAL'},include:{patient:true},orderBy:{createdAt:'desc'},take:250});
 return NextResponse.json({orders:rows.map(b=>{const m=parseMeta(b.adminNotes);return {id:b.id,orderId:b.id,billNumber:m?.billNumber||'',createdAt:b.createdAt,patient:{name:b.patient.name,age:b.patient.age,gender:b.patient.gender,phone:b.patient.phone},tests:m?.tests||[],totalAmount:m?.grossAmount??b.totalAmount,discount:m?.discount||0,balance:m?.balance||0,netAmount:Math.max(0,(m?.grossAmount??b.totalAmount)-(m?.discount||0)),paymentStatus:b.paymentStatus,reportName:b.reportName,reportReady:!!b.reportData,reportReadyAt:b.reportReadyAt}})});
}

export async function POST(request:Request){
 try{
  const b=createSchema.parse(await request.json());
  const net=Math.max(0,b.totalAmount-b.discount);
  if(b.discount>b.totalAmount)return NextResponse.json({error:'Discount cannot exceed total amount.'},{status:400});
  if(b.balance>net)return NextResponse.json({error:'Balance cannot exceed amount after discount.'},{status:400});
  const patient=await prisma.patient.upsert({where:{phone:b.phone},update:{name:b.name,age:b.age,gender:b.gender},create:{name:b.name,phone:b.phone,age:b.age,gender:b.gender}});
  const id=orderId();const bill=b.billNumber||`OP${String(Date.now()).slice(-6)}`;
  const meta:ManualMeta={brand:'THYROCARE',billNumber:bill,tests:b.tests,grossAmount:b.totalAmount,discount:b.discount,balance:b.balance};
  const now=new Date();
  const booking=await prisma.booking.create({data:{id,patientId:patient.id,mode:'CENTRE',source:'ADMIN',collectionDate:now,slot:'Manual order',status:b.balance===0?'CONFIRMED':'PENDING',paymentStatus:b.balance===0?'PAID':'PENDING',paymentMode:'OTHER',totalAmount:net,workflowStatus:'SAMPLE_RECEIVED_AT_LAB',sampleReceivedAt:now,adminNotes:JSON.stringify(meta),createdByAdmin:'THYROCARE_MANUAL',paidAt:b.balance===0?now:null},include:{patient:true}});
  await writeAdminAudit(request,{action:'THYROCARE_MANUAL_ORDER_CREATED',entityType:'Booking',entityId:booking.id,summary:`Created Thyrocare manual order ${booking.id}`,metadata:{billNumber:bill,tests:b.tests,totalAmount:b.totalAmount,discount:b.discount,balance:b.balance}});
  return NextResponse.json({ok:true,id:booking.id,billNumber:bill},{status:201});
 }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:'Please check the manual order details.',fields:error.flatten().fieldErrors},{status:400});console.error('POST /api/admin/thyrocare/orders failed',error);return NextResponse.json({error:'Unable to create Thyrocare manual order.'},{status:500})}
}
