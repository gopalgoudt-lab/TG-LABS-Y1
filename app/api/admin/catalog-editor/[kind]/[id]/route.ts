import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  partnerSlug: z.string().trim().min(1).max(200),
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  preparation: z.string().trim().max(2000).nullable().optional(),
  fastingNeeded: z.boolean().optional(),
  mrp: z.number().int().min(0).optional(),
  price: z.number().int().min(0).optional(),
  tat: z.string().trim().max(200).nullable().optional(),
  sampleTypes: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  sampleTypeOther: z.string().trim().max(200).nullable().optional(),
  imageData: z.string().max(2_000_000).nullable().optional(),
  packageType: z.enum(["PACKAGE", "PROFILE"]).optional(),
  includedTestIds: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
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
    if (kind === 'test' && (body.includedTestIds !== undefined || body.packageType !== undefined)) return NextResponse.json({ error: 'Package/profile fields apply only to packages/profiles.' }, { status: 400 });
    const { includedTestIds, partnerSlug, ...metadata } = body;

    const model = kind === 'test' ? prisma.diagnosticTest : prisma.diagnosticPackage;
    const before = await (model as any).findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Catalog item not found.' }, { status: 404 });

    const updated = await prisma.$transaction(async tx => {
      const partner = await tx.diagnosticPartner.findFirst({
        where: { OR: [{ slug: { equals: partnerSlug, mode: 'insensitive' } }, { name: { equals: partnerSlug, mode: 'insensitive' } }] },
        select: { id: true },
      });
      if (!partner) throw new Error('PARTNER_NOT_FOUND');
      const txModel = kind === 'test' ? tx.diagnosticTest : tx.diagnosticPackage;
      const item = await (txModel as any).update({ where: { id }, data: metadata });
      if (body.tat !== undefined) {
        if (kind === 'test') {
          await tx.testPartnerOffer.updateMany({ where: { testId: id, partnerId: partner.id }, data: { tat: body.tat } });
        } else {
          await tx.packagePartnerOffer.updateMany({ where: { packageId: id, partnerId: partner.id }, data: { tat: body.tat } });
        }
      }
      if (kind === 'package' && includedTestIds !== undefined) {
        const uniqueInputs = [...new Set(includedTestIds)];
        const matchingTests = await tx.diagnosticTest.findMany({
          where: { OR: [{ id: { in: uniqueInputs } }, { name: { in: uniqueInputs, mode: 'insensitive' } }] },
          select: { id: true, name: true },
        });
        const resolvedTestIds = uniqueInputs.map(value => {
          const normalized = value.trim().toLocaleLowerCase();
          const matches = matchingTests.filter(test => test.id === value || test.name.trim().toLocaleLowerCase() === normalized);
          return matches.length === 1 ? matches[0].id : null;
        });
        if (resolvedTestIds.some(testId => testId === null)) throw new Error('INVALID_INCLUDED_TEST');
        const uniqueTestIds = [...new Set(resolvedTestIds as string[])];
        await tx.packageItem.deleteMany({ where: { packageId: id } });
        if (uniqueTestIds.length) await tx.packageItem.createMany({ data: uniqueTestIds.map(testId => ({ packageId: id, testId })) });
      }
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: kind === 'test' ? 'DIAGNOSTIC_TEST_METADATA_UPDATED' : 'DIAGNOSTIC_PACKAGE_METADATA_UPDATED',
        entityType: kind === 'test' ? 'DiagnosticTest' : 'DiagnosticPackage',
        entityId: id,
        summary: `Updated approved catalog metadata for ${before.name}`,
        metadata: {
          actorRole: admin.role,
          actorSource: 'TG_LABS_ADMIN',
          changedFields: Object.keys(body).filter(key => key !== 'partnerSlug'),
          before: Object.fromEntries(Object.keys(metadata).map(key => [key, before[key] ?? null])),
        },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
      return item;
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Only approved catalog metadata and pricing fields may be changed.', fields: error.flatten().fieldErrors }, { status: 400 });
    if (error instanceof Error && error.message === 'INVALID_INCLUDED_TEST') {
      return NextResponse.json({ error: 'One or more included tests could not be matched uniquely. Use an exact TG Labs test name or catalog ID.' }, { status: 400 });
    }
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('PATCH admin catalog item failed', error);
    return NextResponse.json({ error: 'Unable to update catalog item.' }, { status: 500 });
  }
}
