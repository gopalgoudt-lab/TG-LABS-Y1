import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const FLOW = [
  'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'TECHNICIAN_ASSIGNED',
  'TECHNICIAN_ACCEPTED', 'ON_THE_WAY', 'REACHED_PATIENT',
  'SAMPLE_COLLECTED', 'SAMPLE_RECEIVED_AT_LAB', 'PROCESSING',
  'REPORT_READY', 'REPORT_DELIVERED',
] as const;

const stamps: Partial<Record<(typeof FLOW)[number], string>> = {
  BOOKING_CONFIRMED: 'bookingConfirmedAt',
  TECHNICIAN_ASSIGNED: 'technicianAssignedAt',
  TECHNICIAN_ACCEPTED: 'technicianAcceptedAt',
  ON_THE_WAY: 'technicianOnTheWayAt',
  REACHED_PATIENT: 'technicianReachedAt',
  SAMPLE_COLLECTED: 'sampleCollectedAt',
  SAMPLE_RECEIVED_AT_LAB: 'sampleReceivedAt',
  PROCESSING: 'processingStartedAt',
  REPORT_READY: 'reportReadyAt',
  REPORT_DELIVERED: 'reportDeliveredAt',
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await params;
    const { workflowStatus } = z.object({ workflowStatus: z.enum(FLOW) }).strict().parse(await request.json());
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) return { error: 'Booking not found.', status: 404 };
      if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED')
        return { error: 'Cancelled or completed bookings cannot be updated.', status: 409 };
      const current = FLOW.indexOf(existing.workflowStatus as (typeof FLOW)[number]);
      const next = FLOW.indexOf(workflowStatus);
      if (current < 0) return { error: 'Unknown current workflow stage. Review booking before advancing.', status: 409 };
      if (next !== current + 1)
        return { error: 'Select exactly the next workflow stage.', status: 409 };
      if (workflowStatus === 'TECHNICIAN_ASSIGNED' && !existing.technician && !existing.technicianId)
        return { error: 'Assign a technician first.', status: 409 };
      if (workflowStatus === 'REPORT_DELIVERED' && existing.paymentStatus === 'PAID') {
        const payment = await tx.paymentTransaction.findFirst({ where: { bookingId: id, status: 'PAID' }, orderBy: { createdAt: 'desc' }, select: { amount: true } });
        const snapshot = existing.paymentReceiptSnapshot;
        const total = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? Number((snapshot as Record<string, unknown>).total) : NaN;
        const frozen = Number.isFinite(total) ? total : payment?.amount;
        if (frozen != null && Number(existing.totalAmount) !== Number(frozen))
          return { error: 'Paid amount mismatch. Resolve before report delivery.', status: 409 };
      }
      const stamp = stamps[workflowStatus];
      const data: Record<string, unknown> = { workflowStatus };
      if (stamp && !existing[stamp as keyof typeof existing]) data[stamp] = new Date();
      if (workflowStatus === 'REPORT_DELIVERED') data.status = 'COMPLETED';
      const booking = await tx.booking.update({
        where: { id, workflowStatus: existing.workflowStatus },
        data,
        select: { id: true, workflowStatus: true, processingStartedAt: true, reportReadyAt: true, reportDeliveredAt: true },
      });
      return { booking };
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    await writeAdminAudit(request, { action: 'BOOKING_WORKFLOW_ADVANCED', entityType: 'Booking', entityId: id, summary: 'Admin advanced booking workflow.', metadata: { to: workflowStatus } });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid workflow stage.' }, { status: 400 });
    const auth = adminAuthError(error);
    if (auth.status !== 401 || (error instanceof Error && error.message.includes('ADMIN')))
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update workflow stage.' }, { status: 500 });
  }
}
