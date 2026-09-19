import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  partner: z.string().trim().min(1).max(200),
  kind: z.enum(['test', 'package']),
  q: z.string().trim().min(1).max(200),
});

function authFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

export async function GET(request: Request) {
  try {
    await adminFromRequest(request);
    const url = new URL(request.url);
    const { partner, kind, q } = searchSchema.parse({
      partner: url.searchParams.get('partner') ?? '',
      kind: url.searchParams.get('kind') ?? '',
      q: url.searchParams.get('q') ?? '',
    });

    const diagnosticPartner = await prisma.diagnosticPartner.findFirst({
      where: {
        OR: [
          { name: { equals: partner, mode: 'insensitive' } },
          { slug: { equals: partner, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    if (!diagnosticPartner) return NextResponse.json({ items: [] });

    if (kind === 'test') {
      const offers = await prisma.testPartnerOffer.findMany({
        where: {
          partnerId: diagnosticPartner.id,
          test: { name: { contains: q, mode: 'insensitive' } },
        },
        include: { test: true },
        orderBy: { test: { name: 'asc' } },
        take: 25,
      });
      return NextResponse.json({
        items: offers.map(({ test, price, mrp, tat }) => ({
          id: test.id,
          partnerName: diagnosticPartner.name,
          partnerSlug: diagnosticPartner.slug,
          name: test.name,
          mrp: mrp ?? test.mrp,
          price,
          description: test.description,
          sampleType: test.sampleTypeOther || test.sampleTypes.join(', '),
          preparation: test.preparation,
          tatHours: tat ?? test.tat,
          imageData: test.imageData,
        })),
      });
    }

    const offers = await prisma.packagePartnerOffer.findMany({
      where: {
        partnerId: diagnosticPartner.id,
        package: { name: { contains: q, mode: 'insensitive' } },
      },
      include: { package: { include: { tests: { select: { testId: true } } } } },
      orderBy: { package: { name: 'asc' } },
      take: 25,
    });
    return NextResponse.json({
      items: offers.map(({ package: catalogPackage, price, mrp, tat }) => ({
        id: catalogPackage.id,
        partnerName: diagnosticPartner.name,
        partnerSlug: diagnosticPartner.slug,
        name: catalogPackage.name,
        mrp: mrp ?? catalogPackage.mrp,
        price,
        description: catalogPackage.description,
        sampleType: catalogPackage.sampleTypeOther || catalogPackage.sampleTypes.join(', '),
        preparation: catalogPackage.preparation,
        tatHours: tat ?? catalogPackage.tat,
        imageData: catalogPackage.imageData,
        packageType: catalogPackage.packageType,
        includedTestIds: catalogPackage.tests.map(item => item.testId),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Partner, catalog type and search query are required.' }, { status: 400 });
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('GET admin catalog search failed', error);
    return NextResponse.json({ error: 'Unable to search catalog.' }, { status: 500 });
  }
}
