import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession } from '@/lib/technician-auth';
import { sendWorkflowStatusWhatsApp } from '@/lib/whatsapp';

const allowed = ['TECHNICIAN_ACCEPTED','ON_THE_WAY','REACHED_PATIENT','SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB'] as const;
const schema = z.object({ status: z.enum(allowed), notes: z.string().trim().max(1000).optional().or(z.literal('')) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getTechnicianSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const existing = await prisma.booking.findFirst({ where: { id, technicianId: session.technicianId, status: { not: 'CANCELLED' } } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    const now = new Date();
    const timestamp: Record<(typeof allowed)[number], Record<string, Date>> = {
      TECHNICIAN_ACCEPTED: { technicianAcceptedAt: now },
      ON_THE_WAY: { technicianOnTheWayAt: now },
      REACHED_PATIENT: { technicianReachedAt: now },
      SAMPLE_COLLECTED: { sampleCollectedAt: now },
      SAMPLE_RECEIVED_AT_LAB: { sampleReceivedAt: now },
    };
    const booking = await prisma.booking.update({
      where: { id },
      data: { workflowStatus: body.status, technicianNotes: body.notes || existing.technicianNotes, ...timestamp[body.status] },
      include: {
        patient: true,
        assignedTechnician: { select: { name: true } },
        items: { include: { test: true } },
      },
    });
    if (booking.workflowStatus !== existing.workflowStatus) {
      try { await sendWorkflowStatusWhatsApp(booking); } catch (notificationError) { console.error('Technician status updated but WhatsApp notification failed', notificationError); }
    }
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid workflow update.' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update job.' }, { status: 500 });
  }
}
