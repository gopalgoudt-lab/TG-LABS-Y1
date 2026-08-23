import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic='force-dynamic';

function parseMeta(value:string|null){
  try{return value?JSON.parse(value) as Record<string,any>:{};}catch{return {};}
}

export async function GET(request:Request){
  try{
    await requireThyrocareRole(request,['ADMIN','STAFF']);
    const rows=await prisma.booking.findMany({
      where:{createdByAdmin:'THYROCARE_MANUAL'},
      select:{id:true,adminNotes:true,printedReport:true},
      orderBy:{createdAt:'desc'},
      take:250,
    });
    return NextResponse.json({items:rows.map(row=>{
      const meta=parseMeta(row.adminNotes);
      return {
        id:row.id,
        printed:row.printedReport===true,
        printedAt:meta.reportPrintedAt||null,
        printedByRole:meta.reportPrintedByRole||null,
        delivered:meta.reportDelivered===true,
        deliveredAt:meta.reportDeliveredAt||null,
        deliveredByRole:meta.reportDeliveredByRole||null,
      };
    })});
  }catch(error){
    const e=thyrocareAuthError(error);
    return NextResponse.json({error:e.error},{status:e.status});
  }
}

const patchSchema=z.object({
  id:z.string().min(1),
  printed:z.boolean().optional(),
  delivered:z.boolean().optional(),
}).refine(v=>typeof v.printed==='boolean'||typeof v.delivered==='boolean',{message:'Select a report status to update.'});

export async function PATCH(request:Request){
  try{
    const identity=await requireThyrocareRole(request,['ADMIN','STAFF']);
    const body=patchSchema.parse(await request.json());
    const booking=await prisma.booking.findFirst({where:{id:body.id,createdByAdmin:'THYROCARE_MANUAL'}});
    if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});
    const meta=parseMeta(booking.adminNotes);
    const now=new Date().toISOString();
    const printed=typeof body.printed==='boolean'?body.printed:booking.printedReport;
    const delivered=typeof body.delivered==='boolean'?body.delivered:meta.reportDelivered===true;
    const updated={
      ...meta,
      reportPrintedAt:typeof body.printed==='boolean'?(body.printed?now:null):(meta.reportPrintedAt||null),
      reportPrintedByRole:typeof body.printed==='boolean'?(body.printed?identity.role:null):(meta.reportPrintedByRole||null),
      reportDelivered:delivered,
      reportDeliveredAt:typeof body.delivered==='boolean'?(body.delivered?now:null):(meta.reportDeliveredAt||null),
      reportDeliveredByRole:typeof body.delivered==='boolean'?(body.delivered?identity.role:null):(meta.reportDeliveredByRole||null),
    };
    await prisma.booking.update({where:{id:booking.id},data:{printedReport:printed,adminNotes:JSON.stringify(updated)}});
    await writeAdminAudit(request,{
      action:'THYROCARE_REPORT_STATUS_UPDATED',
      entityType:'Booking',
      entityId:booking.id,
      summary:`${identity.role} updated report status for ${booking.id}`,
      metadata:{role:identity.role,reportPrinted:printed,reportDelivered:delivered,reportPrintedAt:updated.reportPrintedAt,reportDeliveredAt:updated.reportDeliveredAt},
    });
    return NextResponse.json({ok:true,id:booking.id,printed,printedAt:updated.reportPrintedAt,delivered,deliveredAt:updated.reportDeliveredAt});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||'Invalid report status value.'},{status:400});
    const e=thyrocareAuthError(error);
    if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});
    console.error('PATCH /api/admin/thyrocare/report-delivery failed',error);
    return NextResponse.json({error:'Unable to update report status.'},{status:500});
  }
}
