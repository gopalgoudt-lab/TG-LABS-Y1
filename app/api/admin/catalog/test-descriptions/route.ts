import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { descriptionNeedsSafetyRefresh, generateTestDescription } from '@/lib/test-description-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const requestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
  mode: z.enum(['missing', 'safety-refresh']).optional().default('missing'),
});

const partnerLinkedWhere: Prisma.DiagnosticTestWhereInput = { partnerOffers: { some: {} } };
const missingDescriptionWhere: Prisma.DiagnosticTestWhereInput = {
  ...partnerLinkedWhere,
  OR: [{ description: null }, { description: '' }],
};

async function safetyRefreshCandidates() {
  const tests = await prisma.diagnosticTest.findMany({
    where: partnerLinkedWhere,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, aliases: true, description: true },
  });
  return tests.filter((test) => descriptionNeedsSafetyRefresh(test.description));
}

export async function GET() {
  try {
    const [missing, total, withDescription, safetyCandidates] = await Promise.all([
      prisma.diagnosticTest.count({ where: missingDescriptionWhere }),
      prisma.diagnosticTest.count({ where: partnerLinkedWhere }),
      prisma.diagnosticTest.count({ where: { ...partnerLinkedWhere, NOT: missingDescriptionWhere } }),
      safetyRefreshCandidates(),
    ]);
    return NextResponse.json({ total, withDescription, missing, safetyRefreshNeeded: safetyCandidates.length, batchLimit: 10 });
  } catch (error) {
    console.error('GET AI test description status failed', error);
    return NextResponse.json({ error: 'Unable to read AI description status.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { limit, mode } = requestSchema.parse(await request.json().catch(() => ({})));
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI descriptions are not configured.' }, { status: 503 });

    const tests = mode === 'missing'
      ? await prisma.diagnosticTest.findMany({
          where: missingDescriptionWhere,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: limit,
          select: { id: true, name: true, aliases: true, description: true },
        })
      : (await safetyRefreshCandidates()).slice(0, limit);

    const results: Array<{ id: string; name: string; status: 'updated' | 'skipped' | 'failed'; error?: string }> = [];
    for (const test of tests) {
      try {
        const generated = await generateTestDescription(test);
        const guard = mode === 'missing'
          ? { id: test.id, OR: [{ description: null }, { description: '' }] }
          : { id: test.id, description: test.description };
        const updated = await prisma.diagnosticTest.updateMany({
          where: guard,
          data: { description: generated.description },
        });
        results.push({ id: test.id, name: test.name, status: updated.count === 1 ? 'updated' : 'skipped' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        console.error('AI test description failed', test.id, message);
        results.push({ id: test.id, name: test.name, status: 'failed', error: message.slice(0, 220) });
      }
    }

    const remaining = mode === 'missing'
      ? await prisma.diagnosticTest.count({ where: missingDescriptionWhere })
      : (await safetyRefreshCandidates()).length;
    return NextResponse.json({ mode, attempted: tests.length, updated: results.filter(x => x.status === 'updated').length, failed: results.filter(x => x.status === 'failed').length, remaining, results });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    console.error('POST AI test description backfill failed', error);
    return NextResponse.json({ error: 'Unable to generate AI test descriptions.' }, { status: 500 });
  }
}
