import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{
      bookingId: string;
      workflowStatus: string;
      patientName: string;
      patientPhone: string;
      technicianId: string;
      technicianName: string;
      latitude: number;
      longitude: number;
      accuracy: number | null;
      speed: number | null;
      heading: number | null;
      recordedAt: Date;
    }>>`
      SELECT DISTINCT ON (b."id")
        b."id" AS "bookingId",
        b."workflowStatus",
        p."name" AS "patientName",
        p."phone" AS "patientPhone",
        t."id" AS "technicianId",
        t."name" AS "technicianName",
        l."latitude",
        l."longitude",
        l."accuracy",
        l."speed",
        l."heading",
        l."recordedAt"
      FROM "Booking" b
      JOIN "Patient" p ON p."id" = b."patientId"
      JOIN "Technician" t ON t."id" = b."technicianId"
      JOIN "TechnicianLocation" l ON l."bookingId" = b."id" AND l."technicianId" = t."id"
      WHERE b."status" <> 'CANCELLED'
        AND b."workflowStatus" IN ('ON_THE_WAY', 'REACHED_PATIENT', 'SAMPLE_COLLECTED')
      ORDER BY b."id", l."recordedAt" DESC
    `;

    return NextResponse.json({
      active: rows.map((row) => ({ ...row, recordedAt: new Date(row.recordedAt).toISOString() })),
    });
  } catch (error) {
    console.error('GET /api/admin/tracking failed', error);
    return NextResponse.json({ error: 'Unable to load live technician locations.' }, { status: 500 });
  }
}
