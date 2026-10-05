import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  reason: z.string().trim().min(10).max(500),
  confirm: z.literal('QUARANTINE_REPORT'),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await params;
    const body = schema.parse(await request.json());
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (!existing.reportData || !existing.reportName) return NextResponse.json({ error: 'No report is attached to this booking.' }, { status: 409 });
    if (existing.workflowStatus === 'REPORT_DELIVERED' || existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Delivered/completed reports require a separate incident-review process and cannot be quarantined here.' }, { status: 409 });
    }

    const previousReportName = existing.reportName;
    const previousWorkflowStatus = existing.workflowStatus;
    const now = new Date();
    const booking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          reportName: null,
          reportData: null,
          reportReadyAt: null,
          workflowStatus: 'PROCESSING',
          processingStartedAt: existing.processingStartedAt ?? now,
          aiReportEn: null,
          aiReportTe: null,
          aiReportHi: null,
          aiReportEnAt: null,
          aiReportTeAt: null,
          aiReportHiAt: null,
        },
        select: { id: true, workflowStatus: true, reportName: true, reportReadyAt: true },
      });
      await tx.reportObservation.deleteMany({ where: { bookingId: id } });
      return updated;
    });

    await writeAdminAudit(request, {
      action: 'REPORT_QUARANTINED',
      entityType: 'Booking',
      entityId: id,
      summary: 'Quarantined an incorrectly attached diagnostic report',
      metadata: {
        reason: body.reason,
        previousReportName,
        previousWorkflowStatus,
        resultingWorkflowStatus: booking.workflowStatus,
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    const auth = adminAuthError(error);
    if (auth.status !== 401 || error instanceof Error && error.message.includes('ADMIN')) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Provide a clear quarantine reason and explicit confirmation.' }, { status: 400 });
    console.error('POST report quarantine failed', error);
    return NextResponse.json({ error: 'Unable to quarantine report.' }, { status: 500 });
  }
}
