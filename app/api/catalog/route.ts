import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [tests, packages] = await Promise.all([
      prisma.diagnosticTest.findMany({
        where: { active: true },
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
        },
      }),
      prisma.diagnosticPackage.findMany({
        where: { active: true },
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
      tests,
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
