import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requirePatientPhone } from "../../../../lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const phone = await requirePatientPhone(request);
    const patient = await prisma.patient.findUnique({ where: { phone } });

    if (!patient) {
      return NextResponse.json({ orders: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        collectionDate: true,
        slot: true,
        workflowStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      orders: bookings.map((b) => ({
        id: b.id,
        orderNumber: b.id.slice(-8).toUpperCase(),
        state: b.workflowStatus || b.status,
        paymentStatus: b.paymentStatus,
        total: b.totalAmount,
        collectionDate: b.collectionDate,
        slot: b.slot,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHENTICATED";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
