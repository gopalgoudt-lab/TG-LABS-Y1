import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const observation = z.object({
  parameterName: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  unit: z.string().trim().max(60).optional().default(''),
  referenceRange: z.string().trim().max(120).optional().default(''),
  flag: z.enum(['', 'Normal', 'Low', 'High', 'Borderline', 'Critical', 'Abnormal', 'Positive', 'Negative']).default(''),
});
const bodySchema = z.object({ observations: z.array(observation).max(250) });

async function requireAdmin(request: Request) {
  try { return await adminFromRequest(request); }
  catch (error) {
    const auth = adminAuthError(error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  const observations = await prisma.reportObservation.findMany({
    where: { bookingId: id },
    orderBy: [{ parameterName: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, parameterName: true, value: true, unit: true, referenceRange: true, flag: true, source: true },
  });
  return NextResponse.json({ observations }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.reportObservation.deleteMany({ where: { bookingId: id } });
      for (const row of body.observations) {
        await tx.reportObservation.create({
          data: {
            bookingId: id,
            parameterName: row.parameterName,
            value: row.value,
            unit: row.unit || null,
            referenceRange: row.referenceRange || null,
            flag: row.flag || null,
            source: 'ADMIN_VERIFIED',
          },
        });
      }
    });

    await writeAdminAudit(request, {
      action: 'REPORT_OBSERVATIONS_REPLACED',
      entityType: 'Booking',
      entityId: id,
      summary: 'Admin replaced verified structured diagnostic observations.',
      metadata: { observationCount: body.observations.length },
    });
    return NextResponse.json({ ok: true, count: body.observations.length });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Check structured report values.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to save structured report values.' }, { status: 500 });
  }
}
