import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({ technicianId: z.string().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { technicianId } = schema.parse(await request.json());
    const technician = technicianId ? await prisma.technician.findFirst({ where: { id: technicianId, active: true } }) : null;
    if (technicianId && !technician) return NextResponse.json({ error: 'Selected technician is unavailable.' }, { status: 400 });

    const now = new Date();
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        technicianId: technician?.id || null,
        technician: technician?.name || null,
        technicianAssignedAt: technician ? now : null,
        workflowStatus: technician ? 'TECHNICIAN_ASSIGNED' : undefined,
      },
      include: { patient: true, assignedTechnician: true, items: { include: { test: true } } },
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid technician assignment.' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to assign technician.' }, { status: 500 });
  }
}
