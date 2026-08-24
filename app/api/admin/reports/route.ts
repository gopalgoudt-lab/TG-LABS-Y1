import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendWorkflowStatusWhatsApp } from '@/lib/whatsapp';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uploadSchema = z.object({
  bookingId: z.string().min(1),
  fileName: z.string().min(1).max(180),
  fileData: z.string().min(20),
});
const MAX_PDF_BYTES = 3 * 1024 * 1024;

function estimatedBase64Bytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function safePdfName(value: string) {
  const cleaned = value.replace(/[\r\n\0]/g, '').replace(/[^a-zA-Z0-9._ ()-]/g, '_').trim();
  const base = cleaned || 'diagnostic-report.pdf';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function isRealPdf(dataUrl: string) {
  try {
    const prefix = 'data:application/pdf;base64,';
    if (!dataUrl.startsWith(prefix)) return false;
    const bytes = Buffer.from(dataUrl.slice(prefix.length), 'base64');
    return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = uploadSchema.parse(await request.json());
    const fileName = safePdfName(body.fileName);

    if (!body.fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF diagnostic reports can be uploaded.' }, { status: 400 });
    }
    if (!isRealPdf(body.fileData)) {
      return NextResponse.json({ error: 'The selected file is not a valid PDF.' }, { status: 400 });
    }
    if (estimatedBase64Bytes(body.fileData) > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF is too large. Please upload a PDF smaller than 3 MB.' }, { status: 413 });
    }

    const existing = await prisma.booking.findUnique({ where: { id: body.bookingId } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'A report cannot be published for a cancelled booking.' }, { status: 409 });
    }
    if (!['SAMPLE_RECEIVED_AT_LAB', 'PROCESSING', 'REPORT_READY', 'REPORT_DELIVERED'].includes(existing.workflowStatus)) {
      return NextResponse.json({ error: 'Mark the sample as received at the lab before publishing a report.' }, { status: 409 });
    }

    const now = new Date();
    const booking = await prisma.booking.update({
      where: { id: body.bookingId },
      data: {
        reportName: fileName,
        reportData: body.fileData,
        aiReportEn: null,
        aiReportTe: null,
        aiReportHi: null,
        aiReportEnAt: null,
        aiReportTeAt: null,
        aiReportHiAt: null,
        reportReadyAt: existing.reportReadyAt ?? now,
        workflowStatus: existing.workflowStatus === 'REPORT_DELIVERED' ? 'REPORT_DELIVERED' : 'REPORT_READY',
        status: existing.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
      },
      include: {
        patient: true,
        assignedTechnician: { select: { id: true, name: true, phone: true, employeeCode: true } },
        items: { include: { test: true } },
      },
    });

    await writeAdminAudit(request, {
      action: existing.reportData ? 'REPORT_REPLACED' : 'REPORT_PUBLISHED',
      entityType: 'Booking',
      entityId: booking.id,
      summary: `${existing.reportData ? 'Replaced' : 'Published'} diagnostic PDF ${fileName}`,
      metadata: {
        fileName,
        fileBytes: estimatedBase64Bytes(body.fileData),
        previousReportName: existing.reportName || null,
        workflowStatus: booking.workflowStatus,
      },
    });

    if (existing.workflowStatus !== 'REPORT_READY' && existing.workflowStatus !== 'REPORT_DELIVERED') {
      try {
        await sendWorkflowStatusWhatsApp(booking);
      } catch (notificationError) {
        console.error('Report published but WhatsApp notification failed', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      reportName: booking.reportName,
      workflowStatus: booking.workflowStatus,
      reportReadyAt: booking.reportReadyAt,
      printedReportPending: booking.printedReport && !booking.reportDeliveredAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid report upload.' }, { status: 400 });
    console.error('POST /api/admin/reports failed', error);
    return NextResponse.json({ error: 'Unable to publish diagnostic report.' }, { status: 500 });
  }
}
