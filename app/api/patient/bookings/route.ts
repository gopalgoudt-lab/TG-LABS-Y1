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
        id: true,
        name: true,
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,status: true,paymentStatus: true,workflowStatus: true,totalAmount: true,mode: true,collectionDate: true,slot: true,address: true,pincode: true,createdAt: true,
            doctorName: true,printedReport: true,printedReportFee: true,technician: true,
            bookingConfirmedAt: true,technicianAssignedAt: true,technicianAcceptedAt: true,technicianOnTheWayAt: true,technicianReachedAt: true,sampleCollectedAt: true,sampleReceivedAt: true,processingStartedAt: true,reportReadyAt: true,reportDeliveredAt: true,
            items: { select: { test: { select: { name: true } } } },
            packages: { select: { package: { select: { name: true } } } },
          },
        },
      },
    });

    return NextResponse.json({
      patient: patient ? { id: patient.id, name: patient.name, phone } : { id: null, name: null, phone },
      orders: (patient?.bookings ?? []).map((booking) => ({
        id: booking.id,
        orderNumber: `TG-${booking.id.slice(-8).toUpperCase()}`,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        workflowStatus: booking.workflowStatus,
        total: booking.totalAmount,
        mode: booking.mode,
        collectionDate: booking.collectionDate.toISOString(),
        slot: booking.slot,
        address: booking.address,
        pincode: booking.pincode,
        createdAt: booking.createdAt.toISOString(),
        doctorName: booking.doctorName,
        printedReport: booking.printedReport,
        printedReportFee: booking.printedReportFee,
        technician: booking.technician,
        timeline: {
          BOOKING_CREATED: booking.createdAt.toISOString(),
          BOOKING_CONFIRMED: booking.bookingConfirmedAt?.toISOString() ?? null,
          TECHNICIAN_ASSIGNED: booking.technicianAssignedAt?.toISOString() ?? null,
          TECHNICIAN_ACCEPTED: booking.technicianAcceptedAt?.toISOString() ?? null,
          ON_THE_WAY: booking.technicianOnTheWayAt?.toISOString() ?? null,
          REACHED_PATIENT: booking.technicianReachedAt?.toISOString() ?? null,
          SAMPLE_COLLECTED: booking.sampleCollectedAt?.toISOString() ?? null,
          SAMPLE_RECEIVED_AT_LAB: booking.sampleReceivedAt?.toISOString() ?? null,
          PROCESSING: booking.processingStartedAt?.toISOString() ?? null,
          REPORT_READY: booking.reportReadyAt?.toISOString() ?? null,
          REPORT_DELIVERED: booking.reportDeliveredAt?.toISOString() ?? null,
        },
        tests: booking.items.map((item) => item.test.name),
        packages: booking.packages.map((item) => item.package.name),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : 401;
    return NextResponse.json({ error: status === 503 ? 'Authentication service is not configured.' : 'Please sign in again.' }, { status });
  }
}
