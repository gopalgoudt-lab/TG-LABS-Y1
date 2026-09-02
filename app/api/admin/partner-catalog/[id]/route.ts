import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';
import { findBlockedPartnerMutationFields, partnerActivationMutationMessage } from '@/lib/partner-catalog-admin';

export const dynamic = 'force-dynamic';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  accreditationDisplay: nullableText(240),
  accreditationReference: nullableText(500),
  accreditationVerifiedAt: z.string().datetime({ offset: true }).nullable().optional(),
  orderHandoffMethod: nullableText(500),
  reportIntakeMethod: nullableText(500),
}).strict().refine(value => Object.keys(value).length > 0, { message: 'Provide at least one metadata field.' });

function normalizeText(value: string | null | undefined) {
  return value === undefined ? undefined : value?.trim() || null;
}

function isAdminAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

function adminAuthResponse(error: unknown) {
  const auth = adminAuthError(error);
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await context.params;
    const partner = await prisma.diagnosticPartner.findUnique({
      where: { id },
      select: {
        id: true, slug: true, name: true, active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true,
        accreditationDisplay: true, accreditationReference: true, accreditationVerifiedAt: true,
        orderHandoffMethod: true, reportIntakeMethod: true, updatedAt: true,
        offers: { orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, price: true, mrp: true, availability: true, tat: true, active: true, sourceReference: true, lastVerifiedAt: true, test: { select: { id: true, name: true, slug: true } } } },
        packageOffers: { orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, price: true, mrp: true, availability: true, tat: true, active: true, sourceReference: true, lastVerifiedAt: true, package: { select: { id: true, name: true, slug: true } } } },
      },
    });
    if (!partner) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });
    return NextResponse.json({ partner });
  } catch (error) {
    if (isAdminAuthFailure(error)) return adminAuthResponse(error);
    console.error('GET partner metadata failed', error);
    return NextResponse.json({ error: 'Unable to load partner metadata.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminFromRequest(request);
    const raw = await request.json();
    const blockedFields = findBlockedPartnerMutationFields(raw);
    if (blockedFields.length) return NextResponse.json({ error: partnerActivationMutationMessage(blockedFields), blockedFields }, { status: 409 });
    const body = patchSchema.parse(raw);
    const { id } = await context.params;
    const before = await prisma.diagnosticPartner.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });

    const data = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.accreditationDisplay !== undefined ? { accreditationDisplay: normalizeText(body.accreditationDisplay) } : {}),
      ...(body.accreditationReference !== undefined ? { accreditationReference: normalizeText(body.accreditationReference) } : {}),
      ...(body.accreditationVerifiedAt !== undefined ? { accreditationVerifiedAt: body.accreditationVerifiedAt ? new Date(body.accreditationVerifiedAt) : null } : {}),
      ...(body.orderHandoffMethod !== undefined ? { orderHandoffMethod: normalizeText(body.orderHandoffMethod) } : {}),
      ...(body.reportIntakeMethod !== undefined ? { reportIntakeMethod: normalizeText(body.reportIntakeMethod) } : {}),
    };

    const partner = await prisma.$transaction(async tx => {
      const updated = await tx.diagnosticPartner.update({ where: { id }, data });
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: 'PARTNER_METADATA_UPDATED',
        entityType: 'DiagnosticPartner',
        entityId: id,
        summary: `Updated metadata for ${before.name}`,
        metadata: { actorRole: admin.role, actorSource: 'TG_LABS_ADMIN', changedFields: Object.keys(data), before: Object.fromEntries(Object.keys(data).map(key => [key, (before as Record<string, unknown>)[key] ?? null])) },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
      return updated;
    });
    return NextResponse.json({ partner });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Only approved partner metadata fields may be changed.', fields: error.flatten().fieldErrors }, { status: 400 });
    if (isAdminAuthFailure(error)) return adminAuthResponse(error);
    console.error('PATCH partner metadata failed', error);
    return NextResponse.json({ error: 'Unable to update partner metadata.' }, { status: 500 });
  }
}
