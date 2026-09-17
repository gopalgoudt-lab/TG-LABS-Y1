import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  preparation: z.string().trim().max(2000).nullable().optional(),
  mrp: z.number().int().min(0).optional(),
  price: z.number().int().min(0).optional(),
  tat: z.string().trim().max(200).nullable().optional(),
  sampleTypes: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  sampleTypeOther: z.string().trim().max(200).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, { message: 'Provide at least one approved catalog field.' });

function authFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

export async function PATCH(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const admin = await adminFromRequest(request);
    const { kind, id } = await context.params;
    if (kind !== 'test' && kind !== 'package') return NextResponse.json({ error: 'Unsupported catalog item type.' }, { status: 404 });
    const body = patchSchema.parse(await request.json());

    const model = kind === 'test' ? prisma.diagnosticTest : prisma.diagnosticPackage;
    const before = await (model as any).findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Catalog item not found.' }, { status: 404 });

    const updated = await prisma.$transaction(async tx => {
      const txModel = kind === 'test' ? tx.diagnosticTest : tx.diagnosticPackage;
      const item = await (txModel as any).update({ where: { id }, data: body });
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: kind === 'test' ? 'DIAGNOSTIC_TEST_METADATA_UPDATED' : 'DIAGNOSTIC_PACKAGE_METADATA_UPDATED',
        entityType: kind === 'test' ? 'DiagnosticTest' : 'DiagnosticPackage',
        entityId: id,
        summary: `Updated approved catalog metadata for ${before.name}`,
        metadata: {
          actorRole: admin.role,
          actorSource: 'TG_LABS_ADMIN',
          changedFields: Object.keys(body),
          before: Object.fromEntries(Object.keys(body).map(key => [key, before[key] ?? null])),
        },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
      return item;
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Only approved catalog metadata and pricing fields may be changed.', fields: error.flatten().fieldErrors }, { status: 400 });
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('PATCH admin catalog item failed', error);
    return NextResponse.json({ error: 'Unable to update catalog item.' }, { status: 500 });
  }
}
