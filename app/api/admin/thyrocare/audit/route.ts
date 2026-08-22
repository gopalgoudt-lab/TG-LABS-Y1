import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireThyrocareRole, thyrocareAuthError } from '@/lib/thyrocare-auth';

export const dynamic = 'force-dynamic';

function metadataObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: Request) {
  try {
    await requireThyrocareRole(request, ['ADMIN']);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
    const action = (url.searchParams.get('action') || '').trim().slice(0, 100);
    const requestedLimit = Number(url.searchParams.get('limit') || 150);
    const limit = Number.isFinite(requestedLimit) ? Math.min(300, Math.max(20, requestedLimit)) : 150;

    const rows = await prisma.adminAuditLog.findMany({
      where: {
        action: action ? action : { startsWith: 'THYROCARE_' },
        ...(q ? {
          OR: [
            { summary: { contains: q, mode: 'insensitive' } },
            { entityId: { contains: q, mode: 'insensitive' } },
            { adminPhone: { contains: q } },
            { action: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const actions = await prisma.adminAuditLog.findMany({
      where: { action: { startsWith: 'THYROCARE_' } },
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
      take: 100,
    });

    return NextResponse.json({
      logs: rows.map(row => {
        const meta = metadataObject(row.metadata);
        return {
          id: row.id,
          actorPhone: row.adminPhone,
          actorRole: String(meta.actorRole || meta.role || 'ADMIN'),
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          summary: row.summary,
          metadata: meta,
          ipAddress: row.ipAddress,
          createdAt: row.createdAt,
        };
      }),
      actions: actions.map(x => x.action),
    });
  } catch (error) {
    const auth = thyrocareAuthError(error);
    if (error instanceof Error && ['FORBIDDEN', 'UNAUTHENTICATED', 'THYROCARE_AUTH_NOT_CONFIGURED'].includes(error.message)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('GET /api/admin/thyrocare/audit failed', error);
    return NextResponse.json({ error: 'Unable to load activity history.' }, { status: 500 });
  }
}
