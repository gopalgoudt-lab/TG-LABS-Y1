import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    await adminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const { q } = querySchema.parse({ q: searchParams.get('q') || undefined });
    const partners = await prisma.diagnosticPartner.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true, slug: true, name: true, active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true,
        accreditationDisplay: true, accreditationReference: true, accreditationVerifiedAt: true,
        orderHandoffMethod: true, reportIntakeMethod: true, updatedAt: true,
        _count: { select: { offers: true, packageOffers: true, serviceability: true } },
      },
    });
    return NextResponse.json({ partners });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid partner catalog query.' }, { status: 400 });
    const auth = adminAuthError(error);
    if (auth.status !== 401 || (error instanceof Error && error.message.includes('ADMIN'))) return NextResponse.json({ error: auth.error }, { status: auth.status });
    console.error('GET partner catalog failed', error);
    return NextResponse.json({ error: 'Unable to load partner catalog.' }, { status: 500 });
  }
}
