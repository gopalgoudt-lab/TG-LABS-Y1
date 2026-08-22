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
      select:{id:true,adminNotes:true},
      orderBy:{createdAt:'desc'},
      take:250,
    });
    return NextResponse.json({items:rows.map(row=>{
      const meta=parseMeta(row.adminNotes);
      return {
        id:row.id,
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

const patchSchema=z.object({id:z.string().min(1),delivered:z.boolean()});

export async function PATCH(request:Request){
  try{
    const identity=await requireThyrocareRole(request,['ADMIN','STAFF']);
    const body=patchSchema.parse(await request.json());
    const booking=await prisma.booking.findFirst({where:{id:body.id,createdByAdmin:'THYROCARE_MANUAL'}});
    if(!booking)return NextResponse.json({error:'Order not found.'},{status:404});
    const meta=parseMeta(booking.adminNotes);
    const now=new Date().toISOString();
    const updated={
      ...meta,
      reportDelivered:body.delivered,
      reportDeliveredAt:body.delivered?now:null,
      reportDeliveredByRole:body.delivered?identity.role:null,
    };
    await prisma.booking.update({where:{id:booking.id},data:{adminNotes:JSON.stringify(updated)}});
    await writeAdminAudit(request,{
      action:'THYROCARE_REPORT_DELIVERY_UPDATED',
      entityType:'Booking',
      entityId:booking.id,
      summary:`${identity.role} marked report delivered ${body.delivered?'Yes':'No'} for ${booking.id}`,
      metadata:{role:identity.role,reportDelivered:body.delivered,reportDeliveredAt:body.delivered?now:null},
    });
    return NextResponse.json({ok:true,id:booking.id,delivered:body.delivered,deliveredAt:body.delivered?now:null});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({error:'Invalid report delivery value.'},{status:400});
    const e=thyrocareAuthError(error);
    if(error instanceof Error&&['FORBIDDEN','UNAUTHENTICATED','THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message))return NextResponse.json({error:e.error},{status:e.status});
    console.error('PATCH /api/admin/thyrocare/report-delivery failed',error);
    return NextResponse.json({error:'Unable to update report delivery status.'},{status:500});
  }
}
