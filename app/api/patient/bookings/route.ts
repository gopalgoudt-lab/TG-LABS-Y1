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
            id: true,
            status: true,
            paymentStatus: true,
            workflowStatus: true,
            totalAmount: true,
            mode: true,
            collectionDate: true,
            slot: true,
            address: true,
            pincode: true,
            createdAt: true,
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
        tests: booking.items.map((item) => item.test.name),
        packages: booking.packages.map((item) => item.package.name),
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
