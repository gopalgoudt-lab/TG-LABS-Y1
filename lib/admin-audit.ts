import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth';

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
    const admin = await adminFromRequest(request);
    await prisma.adminAuditLog.create({
      data: {
        adminPhone: admin.phone,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Admin audit logging failed', error);
  }
}
