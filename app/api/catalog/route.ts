import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const referrer = request.headers.get('referer') || '';
    const thyrocare = url.searchParams.get('lab') === 'thyrocare' || referrer.includes('/manual');
    const partnerWhere = thyrocare ? { diagnosticPartner: 'THYROCARE' } : {};
    const [tests, packages] = await Promise.all([
      prisma.diagnosticTest.findMany({
        where: { active: true, ...partnerWhere },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          mrp: true,
          price: true,
          diagnosticPartner: true,
          tat: true,
          fastingNeeded: true,
          sampleTypes: true,
          partnerOffers: {
            where: { active: true, partner: { active: true } },
            orderBy: { partner: { name: 'asc' } },
            select: {
              id: true,
              price: true,
              availability: true,
              tat: true,
              partner: { select: { id: true, slug: true, name: true } },
            },
          },
        },
      }),
      prisma.diagnosticPackage.findMany({
        where: { active: true, ...partnerWhere },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          mrp: true,
          price: true,
          diagnosticPartner: true,
          tat: true,
          fastingNeeded: true,
          sampleTypes: true,
          tests: {
            select: {
              test: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      lab: thyrocare ? 'THYROCARE' : 'DEFAULT',
      tests: tests.map(({ partnerOffers, ...test }) => ({ ...test, offers: partnerOffers })),
      packages: packages.map((pkg) => ({
        ...pkg,
        tests: pkg.tests.map((item) => item.test),
      })),
    });
  } catch (error) {
    console.error('GET /api/catalog failed', error);
    return NextResponse.json({ error: 'Catalogue is temporarily unavailable.' }, { status: 503 });
  }
}
