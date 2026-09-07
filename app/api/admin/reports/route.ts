import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { sendWorkflowStatusWhatsApp } from '@/lib/whatsapp';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uploadSchema = z.object({
  bookingId: z.string().min(1),
  fileName: z.string().min(1).max(180),
  fileData: z.string().min(20),
  reportType: z.enum(['PARTIAL', 'FULL']).default('FULL'),
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

// Keep this implementation aligned with the proven Thyrocare Manual report workflow.
// It touches only the small bottom-right footer used for page numbering and leaves
// signatures, stamps, QR codes, borders and diagnostic content unchanged.
async function replaceExistingPageNumbers(dataUrl: string) {
  const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/s);
  if (!match) throw new Error('INVALID_PDF');
  const source = Buffer.from(match[1], 'base64');
  const pdf = await PDFDocument.load(source);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width } = page.getSize();
    const footerWidth = 132;
    const footerHeight = 18;
    const footerRight = 12;
    const footerY = 7;

    page.drawRectangle({
      x: Math.max(0, width - footerWidth - footerRight),
      y: 2,
      width: footerWidth,
      height: footerHeight,
      color: rgb(1, 1, 1),
    });

    const text = `Page: ${i + 1} of ${total}`;
    const size = 9;
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(12, width - footerRight - textWidth),
      y: footerY,
      size,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
  }

  const output = await pdf.save();
  return `data:application/pdf;base64,${Buffer.from(output).toString('base64')}`;
}

function requestsCorrectedPageNumbers(fileName: string) {
  return /TG-Labs-Corrected-Pages-|renumbered/i.test(fileName);
}

export async function POST(request: Request) {
  try {
    const body = uploadSchema.parse(await request.json());
    const baseFileName = safePdfName(body.fileName);
    const fileName = `${body.reportType === 'PARTIAL' ? 'PARTIAL' : 'FULL'} - ${baseFileName}`;

    if (!body.fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF diagnostic reports can be uploaded.' }, { status: 400 });
    }
    if (!isRealPdf(body.fileData)) {
      return NextResponse.json({ error: 'The selected file is not a valid PDF.' }, { status: 400 });
    }

    let finalReportData = body.fileData;
    const pageNumbersReplaced = requestsCorrectedPageNumbers(baseFileName);
    if (pageNumbersReplaced) {
      try {
        finalReportData = await replaceExistingPageNumbers(body.fileData);
      } catch {
        return NextResponse.json({ error: 'Unable to replace page numbers in this PDF. Please check that the PDF is valid and not password-protected.' }, { status: 400 });
      }
    }

    if (estimatedBase64Bytes(finalReportData) > MAX_PDF_BYTES) {
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
    if (body.reportType === 'PARTIAL' && (existing.status === 'COMPLETED' || existing.workflowStatus === 'REPORT_DELIVERED')) {
      return NextResponse.json({ error: 'A partial report cannot replace a completed or delivered final report.' }, { status: 409 });
    }

    const now = new Date();
    const isFull = body.reportType === 'FULL';
    const booking = await prisma.booking.update({
      where: { id: body.bookingId },
      data: {
        reportName: fileName,
        reportData: finalReportData,
        aiReportEn: null,
        aiReportTe: null,
        aiReportHi: null,
        aiReportEnAt: null,
        aiReportTeAt: null,
        aiReportHiAt: null,
        reportReadyAt: isFull ? (existing.reportReadyAt ?? now) : null,
        workflowStatus: isFull
          ? (existing.workflowStatus === 'REPORT_DELIVERED' ? 'REPORT_DELIVERED' : 'REPORT_READY')
          : 'PROCESSING',
        status: isFull
          ? (existing.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED')
          : 'CONFIRMED',
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
      summary: `${existing.reportData ? 'Replaced' : 'Published'} ${body.reportType.toLowerCase()} diagnostic PDF ${fileName}`,
      metadata: {
        fileName,
        reportType: body.reportType,
        fileBytes: estimatedBase64Bytes(finalReportData),
        pageNumbersReplaced,
        previousReportName: existing.reportName || null,
        workflowStatus: booking.workflowStatus,
      },
    });

    if (isFull && existing.workflowStatus !== 'REPORT_READY' && existing.workflowStatus !== 'REPORT_DELIVERED') {
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
      reportType: body.reportType,
      workflowStatus: booking.workflowStatus,
      reportReadyAt: booking.reportReadyAt,
      printedReportPending: isFull && booking.printedReport && !booking.reportDeliveredAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid report upload.' }, { status: 400 });
    console.error('POST /api/admin/reports failed', error);
    return NextResponse.json({ error: 'Unable to publish diagnostic report.' }, { status: 500 });
  }
}
