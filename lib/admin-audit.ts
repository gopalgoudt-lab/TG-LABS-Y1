import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth';
import { thyrocareIdentityFromRequest } from '@/lib/thyrocare-auth';

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

export async function adminFromRequest(request: Request) {
  const token = cookieValue(request, ADMIN_SESSION_COOKIE);
  if (!token) throw new Error('UNAUTHENTICATED');
  return verifyAdminSessionToken(token);
}

async function auditActorFromRequest(request: Request) {
  try {
    const admin = await adminFromRequest(request);
    return { phone: admin.phone, role: 'ADMIN', source: 'TG_LABS_ADMIN' } as const;
  } catch {}
  const thyrocare = await thyrocareIdentityFromRequest(request);
  return { phone: thyrocare.phone, role: thyrocare.role, source: 'THYROCARE_MANUAL' } as const;
}

function mergeMetadata(
  metadata: Prisma.InputJsonValue | null | undefined,
  actor: { phone: string; role: string; source: string },
): Prisma.InputJsonValue {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return { ...(metadata as Prisma.JsonObject), actorRole: actor.role, actorSource: actor.source };
  }
  return { actorRole: actor.role, actorSource: actor.source };
}

export async function writeAdminAudit(
  request: Request,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Prisma.InputJsonValue | null;
  },
) {
  try {
    const actor = await auditActorFromRequest(request);
    await prisma.adminAuditLog.create({
      data: {
        adminPhone: actor.phone,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        summary: input.summary,
        metadata: mergeMetadata(input.metadata, actor),
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Admin audit logging failed', error);
  }
}
