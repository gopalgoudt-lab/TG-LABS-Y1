import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const dataUrlSchema = z.string().max(800_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/);
const putSchema = z.object({ partnerId: z.string().min(1), logoData: dataUrlSchema }).strict();
const deleteSchema = z.object({ partnerId: z.string().min(1) }).strict();

type BrandingRow = {
  id: string;
  slug: string;
  name: string;
  logoData: string | null;
  logoMime: string | null;
  logoUpdatedAt: Date | null;
};

function authFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

function mimeFromDataUrl(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,/.exec(value);
  return match?.[1] || null;
}

export async function GET(request: Request) {
  try {
    await adminFromRequest(request);
    const rows = await prisma.$queryRaw<BrandingRow[]>(Prisma.sql`
      SELECT p.id, p.slug, p.name,
             b."logoData", b."logoMime", b."logoUpdatedAt"
      FROM "DiagnosticPartner" p
      LEFT JOIN "PartnerBranding" b ON b."partnerId" = p.id
      ORDER BY p.name ASC
    `);
    return NextResponse.json({ partners: rows });
  } catch (error) {
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('GET partner branding failed', error);
    return NextResponse.json({ error: 'Unable to load partner branding.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await adminFromRequest(request);
    const body = putSchema.parse(await request.json());
    const mime = mimeFromDataUrl(body.logoData);
    if (!mime) return NextResponse.json({ error: 'Unsupported logo format.' }, { status: 400 });

    const partner = await prisma.diagnosticPartner.findUnique({ where: { id: body.partnerId }, select: { id: true, name: true, slug: true } });
    if (!partner) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });

    await prisma.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PartnerBranding" ("partnerId", "logoData", "logoMime", "logoUpdatedAt", "createdAt", "updatedAt")
        VALUES (${partner.id}, ${body.logoData}, ${mime}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("partnerId") DO UPDATE SET
          "logoData" = EXCLUDED."logoData",
          "logoMime" = EXCLUDED."logoMime",
          "logoUpdatedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      `);
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: 'PARTNER_LOGO_UPDATED',
        entityType: 'DiagnosticPartner',
        entityId: partner.id,
        summary: `Updated logo for ${partner.name}`,
        metadata: { actorRole: admin.role, actorSource: 'TG_LABS_ADMIN', partnerSlug: partner.slug, logoMime: mime },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
    });

    return NextResponse.json({ ok: true, partnerId: partner.id, logoMime: mime });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Use a PNG, JPG/JPEG or WebP logo smaller than about 600 KB.' }, { status: 400 });
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('PUT partner branding failed', error);
    return NextResponse.json({ error: 'Unable to save partner logo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await adminFromRequest(request);
    const body = deleteSchema.parse(await request.json());
    const partner = await prisma.diagnosticPartner.findUnique({ where: { id: body.partnerId }, select: { id: true, name: true, slug: true } });
    if (!partner) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });

    await prisma.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`DELETE FROM "PartnerBranding" WHERE "partnerId" = ${partner.id}`);
      await tx.adminAuditLog.create({ data: {
        adminPhone: admin.phone,
        action: 'PARTNER_LOGO_REMOVED',
        entityType: 'DiagnosticPartner',
        entityId: partner.id,
        summary: `Removed logo for ${partner.name}`,
        metadata: { actorRole: admin.role, actorSource: 'TG_LABS_ADMIN', partnerSlug: partner.slug },
        ipAddress: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid partner.' }, { status: 400 });
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('DELETE partner branding failed', error);
    return NextResponse.json({ error: 'Unable to remove partner logo.' }, { status: 500 });
  }
}
