import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type BrandingRow = { slug: string; name: string; logoData: string | null; logoMime: string | null; logoUpdatedAt: Date | null };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get('slugs') || '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 20);
    const rows = requested.length
      ? await prisma.$queryRaw<BrandingRow[]>(Prisma.sql`
          SELECT p.slug, p.name, b."logoData", b."logoMime", b."logoUpdatedAt"
          FROM "DiagnosticPartner" p
          LEFT JOIN "PartnerBranding" b ON b."partnerId" = p.id
          WHERE p.slug IN (${Prisma.join(requested)})
          ORDER BY p.name ASC
        `)
      : await prisma.$queryRaw<BrandingRow[]>(Prisma.sql`
          SELECT p.slug, p.name, b."logoData", b."logoMime", b."logoUpdatedAt"
          FROM "DiagnosticPartner" p
          LEFT JOIN "PartnerBranding" b ON b."partnerId" = p.id
          WHERE p."displayEnabled" = true
          ORDER BY p.name ASC
        `);
    return NextResponse.json({ partners: rows }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('GET public partner branding failed', error);
    return NextResponse.json({ error: 'Unable to load partner branding.' }, { status: 500 });
  }
}
