import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = patientPhoneFromFirebase(identity.phone);

    const patient = await prisma.patient.findUnique({
      where: { phone },
      select: {
        bookings: {
          where: {
            OR: [
              { reportData: { not: null } },
              { reportReadyAt: { not: null } },
              { reportDeliveredAt: { not: null } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            reportName: true,
            reportData: true,
            reportReadyAt: true,
            reportDeliveredAt: true,
            workflowStatus: true,
            collectionDate: true,
            items: { select: { test: { select: { name: true } } } },
            packages: { select: { package: { select: { name: true } } } },
          },
        },
      },
    });

    return NextResponse.json({
      reports: (patient?.bookings ?? []).map((booking) => ({
        id: booking.id,
        orderNumber: `TG-${booking.id.slice(-8).toUpperCase()}`,
        name: booking.reportName || 'Diagnostic Report',
        status: booking.reportDeliveredAt ? 'DELIVERED' : booking.reportReadyAt || booking.reportData ? 'READY' : 'PROCESSING',
        publishedAt: booking.reportReadyAt?.toISOString() ?? null,
        deliveredAt: booking.reportDeliveredAt?.toISOString() ?? null,
        collectionDate: booking.collectionDate.toISOString(),
        workflowStatus: booking.workflowStatus,
        tests: booking.items.map((item) => item.test.name),
        packages: booking.packages.map((item) => item.package.name),
        downloadUrl: booking.reportData ? `/api/patient/reports/${booking.id}/file` : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : 401;
    return NextResponse.json(
      { error: status === 503 ? 'Authentication service is not configured.' : 'Please sign in again.' },
      { status },
    );
  }
}
