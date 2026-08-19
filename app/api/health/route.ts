import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database: 'ok' | 'unavailable' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unavailable';
  }

  const healthy = database === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      service: 'tg-labs-web',
      version: '6.3',
      database,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
