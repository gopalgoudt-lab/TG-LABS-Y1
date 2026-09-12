import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateTestDescription } from '@/lib/test-description-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const requestSchema = z.object({ limit: z.coerce.number().int().min(1).max(10).optional().default(5) });
const missingDescriptionWhere: Prisma.DiagnosticTestWhereInput = {
  OR: [{ description: null }, { description: '' }],
  partnerOffers: { some: {} },
};

export async function GET() {
  try {
    const [missing, total, withDescription] = await Promise.all([
      prisma.diagnosticTest.count({ where: missingDescriptionWhere }),
      prisma.diagnosticTest.count({ where: { partnerOffers: { some: {} } } }),
      prisma.diagnosticTest.count({ where: { partnerOffers: { some: {} }, NOT: missingDescriptionWhere } }),
    ]);
    return NextResponse.json({ total, withDescription, missing, batchLimit: 10 });
  } catch (error) {
    console.error('GET AI test description status failed', error);
    return NextResponse.json({ error: 'Unable to read AI description status.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { limit } = requestSchema.parse(await request.json().catch(() => ({})));
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI descriptions are not configured.' }, { status: 503 });

    const tests = await prisma.diagnosticTest.findMany({
      where: missingDescriptionWhere,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, name: true, aliases: true },
    });

    const results: Array<{ id: string; name: string; status: 'updated' | 'skipped' | 'failed'; error?: string }> = [];
    for (const test of tests) {
      try {
        const generated = await generateTestDescription(test);
        const updated = await prisma.diagnosticTest.updateMany({
          where: { id: test.id, OR: [{ description: null }, { description: '' }] },
          data: { description: generated.description },
        });
        results.push({ id: test.id, name: test.name, status: updated.count === 1 ? 'updated' : 'skipped' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        console.error('AI test description failed', test.id, message);
        results.push({ id: test.id, name: test.name, status: 'failed', error: message.slice(0, 220) });
      }
    }

    const remaining = await prisma.diagnosticTest.count({ where: missingDescriptionWhere });
    return NextResponse.json({ attempted: tests.length, updated: results.filter(x => x.status === 'updated').length, failed: results.filter(x => x.status === 'failed').length, remaining, results });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid batch size.' }, { status: 400 });
    console.error('POST AI test description backfill failed', error);
    return NextResponse.json({ error: 'Unable to generate AI test descriptions.' }, { status: 500 });
  }
}
