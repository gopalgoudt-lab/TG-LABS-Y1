import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession } from '@/lib/technician-auth';
import { canTechnicianTransition, technicianTimestamp } from '@/lib/phase2d1-workflow';

const allowed = ['TECHNICIAN_ACCEPTED','ON_THE_WAY','REACHED_PATIENT','SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB'] as const;
const schema = z.object({ status: z.enum(allowed), notes: z.string().trim().max(1000).optional().or(z.literal('')) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getTechnicianSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const existing = await prisma.booking.findFirst({ where: { id, technicianId: session.technicianId } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (existing.mode !== 'HOME' || existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'This booking is not eligible for technician fulfilment updates.' }, { status: 409 });
    }
    if (!canTechnicianTransition(existing.workflowStatus, body.status)) {
      return NextResponse.json({ error: `Invalid workflow transition from ${existing.workflowStatus} to ${body.status}.` }, { status: 409 });
    }

    const now = new Date();
    const booking = await prisma.$transaction(async tx => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          workflowStatus: body.status,
          technicianNotes: body.notes || existing.technicianNotes,
          ...technicianTimestamp(body.status, now),
        },
        include: {
          patient: true,
          assignedTechnician: { select: { name: true } },
          items: { include: { test: true } },
        },
      });
      if (body.status !== existing.workflowStatus) {
        await tx.adminAuditLog.create({ data: {
          adminPhone: session.technician.phone,
          action: 'TECHNICIAN_WORKFLOW_UPDATED',
          entityType: 'Booking',
          entityId: id,
          summary: `Technician workflow advanced to ${body.status}`,
          metadata: {
            actorRole: 'TECHNICIAN',
            actorSource: 'TECHNICIAN_PORTAL',
            technicianId: session.technicianId,
            previousWorkflowStatus: existing.workflowStatus,
            workflowStatus: body.status,
          },
          ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
          userAgent: request.headers.get('user-agent') || null,
        } });
      }
      return updated;
    });

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid workflow update.' }, { status: 400 });
    console.error('Technician workflow update failed', error);
    return NextResponse.json({ error: 'Unable to update job.' }, { status: 500 });
  }
}
