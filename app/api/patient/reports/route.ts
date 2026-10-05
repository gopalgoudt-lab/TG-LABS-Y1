import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { manualPatientReports, manualPatientTests } from '@/lib/manual-patient-metadata';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = identity.databasePhone;

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
            aiReportEn: true,
            aiReportTe: true,
            aiReportHi: true,
            reportObservations: { where: { source: { in: ['ADMIN_VERIFIED', 'AUTO_EXTRACTED'] } }, select: { id: true }, take: 1 },
            workflowStatus: true,
            collectionDate: true,
            createdByAdmin: true, adminNotes: true,
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
        tests: booking.createdByAdmin === 'THYROCARE_MANUAL' ? manualPatientTests(booking.createdByAdmin, booking.adminNotes) : booking.items.map((item) => item.test.name),
        packages: booking.packages.map((item) => item.package.name),
        downloadUrl: booking.reportData ? `/api/patient/reports/${booking.id}/file` : null,
        aiLanguages: [booking.aiReportEn ? 'en' : null, booking.aiReportTe ? 'te' : null, booking.aiReportHi ? 'hi' : null].filter(Boolean),
        aiReady: booking.reportObservations.length > 0,
        reportDocuments: booking.createdByAdmin === 'THYROCARE_MANUAL' ? manualPatientReports(booking.createdByAdmin, booking.adminNotes).map((doc) => ({ ...doc, downloadUrl: `/api/patient/reports/${booking.id}/file?documentId=${encodeURIComponent(doc.id)}` })) : [],
      })),
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const authenticationErrors = new Set([
      'UNAUTHENTICATED',
      'INVALID_FIREBASE_TOKEN',
      'FIREBASE_TOKEN_EXPIRED',
      'INVALID_FIREBASE_ISSUER',
      'INVALID_FIREBASE_AUDIENCE',
      'INVALID_FIREBASE_SUBJECT',
      'PHONE_IDENTITY_REQUIRED',
      'INDIAN_PHONE_IDENTITY_REQUIRED',
    ]);
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : authenticationErrors.has(message) ? 401 : 503;
    return NextResponse.json(
      { error: status === 503 ? (message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 'Authentication service is not configured.' : 'Patient services are temporarily unavailable. Please try again shortly.') : 'Please sign in again.' },
      { status },
    );
  }
}
