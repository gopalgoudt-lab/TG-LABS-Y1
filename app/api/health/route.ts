import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'tg-labs-web',
    version: '6.1',
    timestamp: new Date().toISOString(),
  });
}
