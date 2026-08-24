import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';

function safePdfName(value: string | null) {
  const cleaned = (value || 'diagnostic-report.pdf')
    .replace(/[\r\n\0]/g, '')
    .replace(/[^a-zA-Z0-9._ ()-]/g, '_')
    .trim();
  const base = cleaned || 'diagnostic-report.pdf';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function hasPdfSignature(bytes: Uint8Array) {
  return bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-';
}

function pdfResponse(bytes: BodyInit, fileName: string) {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = patientPhoneFromFirebase(identity.phone);
    const { id } = await params;

    const booking = await prisma.booking.findFirst({
      where: { id, patient: { phone } },
      select: { reportName: true, reportData: true },
    });

    if (!booking?.reportData) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    const fileName = safePdfName(booking.reportName);

    if (booking.reportData.startsWith('data:application/pdf;base64,')) {
      const base64 = booking.reportData.slice('data:application/pdf;base64,'.length);
      const bytes = Buffer.from(base64, 'base64');
      if (!hasPdfSignature(bytes)) return NextResponse.json({ error: 'Stored report is invalid.' }, { status: 415 });
      return pdfResponse(bytes, fileName);
    }

    if (/^https:\/\//i.test(booking.reportData)) {
      const upstream = await fetch(booking.reportData, { cache: 'no-store', redirect: 'error' });
      if (!upstream.ok) return NextResponse.json({ error: 'Unable to load report.' }, { status: 502 });
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      if (!hasPdfSignature(bytes)) return NextResponse.json({ error: 'Stored report is invalid.' }, { status: 415 });
      return pdfResponse(bytes, fileName);
    }

    return NextResponse.json({ error: 'Unsupported report format.' }, { status: 415 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : 401;
    return NextResponse.json(
      { error: status === 503 ? 'Authentication service is not configured.' : 'Please sign in again.' },
      { status },
    );
  }
}
