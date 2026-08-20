import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';

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

    if (booking.reportData.startsWith('data:application/pdf;base64,')) {
      const base64 = booking.reportData.slice('data:application/pdf;base64,'.length);
      const bytes = Buffer.from(base64, 'base64');
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${(booking.reportName || 'diagnostic-report.pdf').replace(/"/g, '')}"`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (/^https:\/\//i.test(booking.reportData)) {
      const upstream = await fetch(booking.reportData, { cache: 'no-store' });
      if (!upstream.ok) return NextResponse.json({ error: 'Unable to load report.' }, { status: 502 });
      const bytes = await upstream.arrayBuffer();
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
          'Content-Disposition': `inline; filename="${(booking.reportName || 'diagnostic-report.pdf').replace(/"/g, '')}"`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported report format.' }, { status: 415 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : 401;
    return NextResponse.json({ error: status === 503 ? 'Authentication service is not configured.' : 'Please sign in again.' }, { status });
  }
}
