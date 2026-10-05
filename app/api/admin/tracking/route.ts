import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    try { await adminFromRequest(request); } catch (error) { const auth = adminAuthError(error); return NextResponse.json({ error: auth.error }, { status: auth.status }); }
    const rows = await prisma.$queryRaw<Array<{
      bookingId: string;
      workflowStatus: string;
      patientName: string;
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
