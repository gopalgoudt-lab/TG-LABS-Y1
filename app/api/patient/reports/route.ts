import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requirePatientPhone } from "../../../../lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const phone = await requirePatientPhone(request);
    const patient = await prisma.patient.findUnique({ where: { phone } });

    if (!patient) {
      return NextResponse.json({ reports: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        patientId: patient.id,
        OR: [
          { reportReadyAt: { not: null } },
          { reportData: { not: null } },
          { reportName: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        reportName: true,
        reportReadyAt: true,
        reportDeliveredAt: true,
        workflowStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      reports: bookings.map((b) => ({
        id: b.id,
        name: b.reportName || "Diagnostic report",
        status: b.reportReadyAt ? "READY" : b.workflowStatus,
        publishedAt: b.reportReadyAt,
        deliveredAt: b.reportDeliveredAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHENTICATED";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
