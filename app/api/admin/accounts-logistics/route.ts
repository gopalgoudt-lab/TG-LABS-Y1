import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic='force-dynamic';
export async function GET(){
 const [bookings,transactions,webhooks]=await Promise.all([
  prisma.booking.findMany({orderBy:{createdAt:'desc'},take:200,include:{patient:{select:{name:true}},assignedTechnician:{select:{name:true}}}}),
  prisma.paymentTransaction.findMany({orderBy:{createdAt:'desc'},take:300}),
  prisma.razorpayWebhookEvent.findMany({orderBy:{receivedAt:'desc'},take:300}),
 ]);
 const txByBooking=new Map<string,typeof transactions>(); for(const tx of transactions){const list=txByBooking.get(tx.bookingId)||[];list.push(tx);txByBooking.set(tx.bookingId,list)}
 const webhookPaymentIds=new Set(webhooks.filter(w=>w.processedAt&&!w.processingError&&w.paymentId).map(w=>w.paymentId as string));
 const exceptions=bookings.flatMap(b=>{
  const txs=txByBooking.get(b.id)||[]; const verified=txs.some(t=>t.status==='PAID'&&t.signatureVerified); const webhookMatched=txs.some(t=>t.paymentId&&webhookPaymentIds.has(t.paymentId));
  const reasons:string[]=[];
  if(b.paymentStatus==='PAID'&&b.paymentMode==='ONLINE'&&!verified&&!webhookMatched)reasons.push('Paid online booking has no verified payment transaction or processed webhook match');
  if(b.paymentStatus!=='PAID'&&txs.some(t=>t.status==='PAID'&&t.signatureVerified))reasons.push('Verified paid transaction exists but booking is not marked paid');
  if(txs.some(t=>t.amount!==b.totalAmount))reasons.push('Payment transaction amount differs from booking total');
  return reasons.length?[{bookingId:b.id,patient:b.patient.name,totalAmount:b.totalAmount,paymentStatus:b.paymentStatus,paymentMode:b.paymentMode,reasons}]:[];
 });
 const logistics=bookings.filter(b=>b.status!=='CANCELLED'&&b.workflowStatus!=='REPORT_DELIVERED').map(b=>({id:b.id,patient:b.patient.name,collectionDate:b.collectionDate,slot:b.slot,mode:b.mode,pincode:b.pincode,paymentStatus:b.paymentStatus,totalAmount:b.totalAmount,workflowStatus:b.workflowStatus,technician:b.assignedTechnician?.name||null,printedReport:b.printedReport}));
 return NextResponse.json({summary:{bookings:bookings.length,paid:bookings.filter(b=>b.paymentStatus==='PAID').length,paidValue:bookings.filter(b=>b.paymentStatus==='PAID').reduce((s,b)=>s+b.totalAmount,0),verifiedTransactions:transactions.filter(t=>t.status==='PAID'&&t.signatureVerified).length,paymentExceptions:exceptions.length,logisticsExceptions:logistics.filter(b=>!b.technician&&b.mode==='HOME'||['SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB'].includes(b.workflowStatus)||b.printedReport&&b.workflowStatus!=='REPORT_DELIVERED').length},exceptions,logistics,partnerSettlementTracking:false});
}