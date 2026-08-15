import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tests = await prisma.diagnosticTest.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, description: true, price: true },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error('GET /api/tests failed', error);
    return NextResponse.json(
      { error: 'Diagnostic catalogue is temporarily unavailable.' },
      { status: 503 },
    );
  }
}
