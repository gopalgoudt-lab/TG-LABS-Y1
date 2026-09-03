import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';
import { findBlockedPartnerMutationFields, PARTNER_CREATE_SAFETY_DEFAULTS, partnerActivationMutationMessage } from '@/lib/partner-catalog-admin';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const createSchema = z.object({
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(160),
  accreditationDisplay: nullableText(240),
  accreditationReference: nullableText(500),
  accreditationVerifiedAt: z.string().datetime({ offset: true }).nullable().optional(),
  orderHandoffMethod: nullableText(500),
  reportIntakeMethod: nullableText(500),
}).strict();

function normalizeText(value: string | null | undefined) {
  return value === undefined ? undefined : value?.trim() || null;
}

function isAdminAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

export async function GET(request: Request) {
  try {
    await adminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const { q } = querySchema.parse({ q: searchParams.get('q') || undefined });
    const partners = await prisma.diagnosticPartner.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true, slug: true, name: true, active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true,
        accreditationDisplay: true, accreditationReference: true, accreditationVerifiedAt: true,
        orderHandoffMethod: true, reportIntakeMethod: true, updatedAt: true,
        _count: { select: { offers: true, packageOffers: true, serviceability: true } },
      },
    });
    return NextResponse.json({ partners });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid partner catalog query.' }, { status: 400 });
    if (isAdminAuthFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('GET partner catalog failed', error);
    return NextResponse.json({ error: 'Unable to load partner catalog.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await adminFromRequest(request);
    const raw = await request.json();
    const blockedFields = findBlockedPartnerMutationFields(raw);
    if (blockedFields.length) return NextResponse.json({ error: partnerActivationMutationMessage(blockedFields), blockedFields }, { status: 409 });
    const body = createSchema.parse(raw);
    const data = {
      slug: body.slug,
      name: body.name,
      ...PARTNER_CREATE_SAFETY_DEFAULTS,
      accreditationDisplay: normalizeText(body.accreditationDisplay),
      accreditationReference: normalizeText(body.accreditationReference),
      accreditationVerifiedAt: body.accreditationVerifiedAt ? new Date(body.accreditationVerifiedAt) : null,
      orderHandoffMethod: normalizeText(body.orderHandoffMethod),
      reportIntakeMethod: normalizeText(body.reportIntakeMethod),
    };

    const partner = await prisma.$transaction(async tx => {
      const created = await tx.diagnosticPartner.create({ data });
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: 'PARTNER_METADATA_CREATED',
        entityType: 'DiagnosticPartner',
        entityId: created.id,
        summary: `Created disabled partner metadata for ${created.name}`,
        metadata: { actorRole: admin.role, actorSource: 'TG_LABS_ADMIN', safetyDefaults: PARTNER_CREATE_SAFETY_DEFAULTS, slug: created.slug },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
      return created;
    });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Only approved partner metadata fields may be provided.', fields: error.flatten().fieldErrors }, { status: 400 });
    if (isAdminAuthFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if ((error as { code?: string })?.code === 'P2002') return NextResponse.json({ error: 'A partner with that name or slug already exists.' }, { status: 409 });
    console.error('POST partner catalog failed', error);
    return NextResponse.json({ error: 'Unable to create partner metadata.' }, { status: 500 });
  }
}
