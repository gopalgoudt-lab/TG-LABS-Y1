import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { canChangeTechnicianAssignment } from '@/lib/phase2d1-workflow';

export const dynamic = 'force-dynamic';

const schema = z.object({ technicianId: z.string().trim().min(1).nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminFromRequest(request);
    const { id } = await params;
    const { technicianId } = schema.parse(await request.json());
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (existing.mode !== 'HOME') return NextResponse.json({ error: 'Technician assignment is only available for home collection bookings.' }, { status: 409 });
    if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') return NextResponse.json({ error: 'Technician assignment is locked for this booking.' }, { status: 409 });
    if (!canChangeTechnicianAssignment(existing.workflowStatus)) return NextResponse.json({ error: 'Technician assignment cannot change after fulfilment has started.' }, { status: 409 });

    const technician = technicianId ? await prisma.technician.findFirst({ where: { id: technicianId, active: true } }) : null;
    if (technicianId && !technician) return NextResponse.json({ error: 'Selected technician is unavailable.' }, { status: 400 });
    if (technician && existing.pincode && technician.pincodes.length && !technician.pincodes.includes(existing.pincode)) {
      return NextResponse.json({ error: 'Selected technician is not configured for this booking pincode.' }, { status: 409 });
    }

    const now = new Date();
    const booking = await prisma.$transaction(async tx => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          technicianId: technician?.id || null,
          technician: technician?.name || null,
          technicianAssignedAt: technician ? now : null,
          workflowStatus: technician ? 'TECHNICIAN_ASSIGNED' : 'BOOKING_CREATED',
          technicianAcceptedAt: null,
          technicianOnTheWayAt: null,
          technicianReachedAt: null,
          sampleCollectedAt: null,
          sampleReceivedAt: null,
        },
        include: { patient: true, assignedTechnician: true, items: { include: { test: true } } },
      });
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: technician ? 'TECHNICIAN_ASSIGNED' : 'TECHNICIAN_UNASSIGNED',
        entityType: 'Booking',
        entityId: id,
        summary: technician ? `Assigned technician to booking ${id}` : `Removed technician from booking ${id}`,
        metadata: {
          actorRole: admin.role,
          actorSource: 'TG_LABS_ADMIN',
          previousTechnicianId: existing.technicianId,
          technicianId: technician?.id || null,
          previousWorkflowStatus: existing.workflowStatus,
          workflowStatus: technician ? 'TECHNICIAN_ASSIGNED' : 'BOOKING_CREATED',
        },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
      return updated;
    });
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_')) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid technician assignment.' }, { status: 400 });
    console.error('Technician assignment failed', error);
    return NextResponse.json({ error: 'Unable to assign technician.' }, { status: 500 });
  }
}
