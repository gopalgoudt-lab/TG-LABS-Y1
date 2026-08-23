import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';

type Payload={id:string;type:'report'|'bill';documentId:string|null;exp?:number};
type StoredReport={id:string;fileName:string;fileData:string;reportType:'FULL'|'PARTIAL';uploadedAt:string};
type StoredBill={id?:string;fileName:string;fileData:string;uploadedAt:string};

function parseMeta(value:string|null){try{return value?JSON.parse(value) as Record<string,any>:{} }catch{return {}}}
function reports(meta:Record<string,any>):StoredReport[]{return Array.isArray(meta.reportDocuments)?meta.reportDocuments:[]}
function bills(meta:Record<string,any>):StoredBill[]{if(Array.isArray(meta.originalBills))return meta.originalBills;return meta.originalBill?.fileData?[{...meta.originalBill,id:'legacy'}]:[]}
function verify(payload:string,signature:string){const secret=process.env.THYROCARE_SESSION_SECRET;if(!secret)return false;const expected=createHmac('sha256',secret).update(payload).digest('base64url');const a=Buffer.from(signature);const b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
function pdf(fileName:string,fileData:string){const m=fileData.match(/^data:application\/pdf;base64,(.+)$/s);if(!m)return NextResponse.json({error:'Invalid document.'},{status:500});return new NextResponse(Buffer.from(m[1],'base64'),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${fileName.replace(/"/g,'')}"`,'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}})}

export async function GET(request:Request){
  try{
    const token=new URL(request.url).searchParams.get('token')||'';
    const dot=token.lastIndexOf('.');if(dot<1)return NextResponse.json({error:'Invalid link.'},{status:400});
    const payloadPart=token.slice(0,dot),sig=token.slice(dot+1);if(!verify(payloadPart,sig))return NextResponse.json({error:'Invalid link.'},{status:403});
    const payload=JSON.parse(Buffer.from(payloadPart,'base64url').toString('utf8')) as Payload;
    if(!payload.id||!payload.type)return NextResponse.json({error:'Invalid link.'},{status:400});
    if(payload.exp&&Date.now()>payload.exp)return NextResponse.json({error:'This secure link has expired.'},{status:410});
    const row=await prisma.booking.findFirst({where:{id:payload.id,createdByAdmin:'THYROCARE_MANUAL'},select:{reportName:true,reportData:true,adminNotes:true}});
    if(!row)return NextResponse.json({error:'Document not found.'},{status:404});
    const meta=parseMeta(row.adminNotes);
    if(payload.type==='report'){
      const list=reports(meta);const doc=payload.documentId?list.find(x=>x.id===payload.documentId):list[list.length-1];
      if(doc?.fileData)return pdf(doc.fileName,doc.fileData);
      if(row.reportData)return pdf(row.reportName||'Thyrocare-Report.pdf',row.reportData);
      return NextResponse.json({error:'Report not available.'},{status:404});
    }
    const list=bills(meta);const bill=payload.documentId?list.find(x=>(x.id||'legacy')===payload.documentId):list[list.length-1];
    if(!bill?.fileData)return NextResponse.json({error:'Original bill not available.'},{status:404});
    return pdf(bill.fileName,bill.fileData);
  }catch(error){console.error('GET public Thyrocare document failed',error);return NextResponse.json({error:'Unable to open document.'},{status:500})}
}
