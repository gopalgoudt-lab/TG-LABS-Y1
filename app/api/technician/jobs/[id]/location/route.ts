import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const TRACKING_STATUSES = new Set(['ON_THE_WAY', 'REACHED_PATIENT', 'SAMPLE_COLLECTED']);
const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().max(10000).optional().nullable(),
  speed: z.number().min(0).max(200).optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
  recordedAt: z.string().datetime().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getTechnicianSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id: bookingId } = await params;
    const body = schema.parse(await request.json());
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, technicianId: session.technicianId, status: { not: 'CANCELLED' } },
      select: { id: true, workflowStatus: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (!TRACKING_STATUSES.has(booking.workflowStatus)) {
      return NextResponse.json({ error: 'Location tracking is only allowed during an active collection journey.' }, { status: 409 });
    }

    const recent = await prisma.$queryRaw<Array<{ recordedAt: Date }>>`
      SELECT "recordedAt"
      FROM "TechnicianLocation"
      WHERE "bookingId" = ${bookingId} AND "technicianId" = ${session.technicianId}
      ORDER BY "recordedAt" DESC
      LIMIT 1
    `;
    const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
    if (recent[0] && recordedAt.getTime() - new Date(recent[0].recordedAt).getTime() < 12000) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await prisma.$executeRaw`
      INSERT INTO "TechnicianLocation"
      ("id", "bookingId", "technicianId", "latitude", "longitude", "accuracy", "speed", "heading", "recordedAt", "createdAt")
      VALUES (
        ${crypto.randomUUID()}, ${bookingId}, ${session.technicianId}, ${body.latitude}, ${body.longitude},
        ${body.accuracy ?? null}, ${body.speed ?? null}, ${body.heading ?? null}, ${recordedAt}, NOW()
      )
    `;

    return NextResponse.json({ ok: true, recordedAt: recordedAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid location update.' }, { status: 400 });
    console.error('POST technician location failed', error);
    return NextResponse.json({ error: 'Unable to save live location.' }, { status: 500 });
  }
}
