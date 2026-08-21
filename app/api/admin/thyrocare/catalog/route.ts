import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const PARTNER = 'THYROCARE';
const itemSchema = z.object({
  type: z.enum(['TEST', 'PACKAGE']),
  name: z.string().trim().min(2).max(160),
  price: z.coerce.number().int().min(0).max(1000000),
  mrp: z.coerce.number().int().min(0).max(1000000).optional().default(0),
  description: z.string().trim().max(1000).optional().default(''),
  tat: z.string().trim().max(100).optional().default(''),
  fastingNeeded: z.coerce.boolean().optional().default(false),
  sampleTypes: z.array(z.string().trim().min(1).max(80)).max(10).optional().default([]),
  active: z.boolean().optional().default(true),
});

function slugify(name: string, type: 'TEST' | 'PACKAGE') {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'item';
  return `thyrocare-${type.toLowerCase()}-${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get('includeInactive') === '1';
  const [tests, packages] = await Promise.all([
    prisma.diagnosticTest.findMany({
      where: { diagnosticPartner: PARTNER, ...(includeInactive ? {} : { active: true }) },
      orderBy: { name: 'asc' },
    }),
    prisma.diagnosticPackage.findMany({
      where: { diagnosticPartner: PARTNER, ...(includeInactive ? {} : { active: true }) },
      orderBy: { name: 'asc' },
    }),
  ]);
  return NextResponse.json({
    tests: tests.map((x) => ({ ...x, type: 'TEST' as const })),
    packages: packages.map((x) => ({ ...x, type: 'PACKAGE' as const })),
  });
}

export async function POST(request: Request) {
  try {
    const b = itemSchema.parse(await request.json());
    const common = {
      slug: slugify(b.name, b.type),
      name: b.name,
      description: b.description || null,
      mrp: b.mrp || b.price,
      price: b.price,
      diagnosticPartner: PARTNER,
      tat: b.tat || null,
      fastingNeeded: b.fastingNeeded,
      sampleTypes: b.sampleTypes,
      active: b.active,
    };
    const created = b.type === 'TEST'
      ? await prisma.diagnosticTest.create({ data: common })
      : await prisma.diagnosticPackage.create({ data: common });
    await writeAdminAudit(request, {
      action: 'THYROCARE_CATALOG_CREATED', entityType: b.type, entityId: created.id,
      summary: `Created Thyrocare ${b.type.toLowerCase()} ${b.name}`,
      metadata: { name: b.name, price: b.price, mrp: b.mrp || b.price },
    });
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check catalogue details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error('POST /api/admin/thyrocare/catalog failed', error);
    return NextResponse.json({ error: 'Unable to add Thyrocare catalogue item.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const b = itemSchema.parse(body);
    const data = {
      name: b.name,
      description: b.description || null,
      mrp: b.mrp || b.price,
      price: b.price,
      tat: b.tat || null,
      fastingNeeded: b.fastingNeeded,
      sampleTypes: b.sampleTypes,
      active: b.active,
    };
    const updated = b.type === 'TEST'
      ? await prisma.diagnosticTest.update({ where: { id }, data })
      : await prisma.diagnosticPackage.update({ where: { id }, data });
    await writeAdminAudit(request, {
      action: 'THYROCARE_CATALOG_UPDATED', entityType: b.type, entityId: id,
      summary: `Updated Thyrocare ${b.type.toLowerCase()} ${b.name}`,
      metadata: { name: b.name, price: b.price, active: b.active },
    });
    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check catalogue details.' }, { status: 400 });
    console.error('PATCH /api/admin/thyrocare/catalog failed', error);
    return NextResponse.json({ error: 'Unable to update Thyrocare catalogue item.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const type = z.enum(['TEST', 'PACKAGE']).parse(body.type);
    const item = type === 'TEST'
      ? await prisma.diagnosticTest.update({ where: { id }, data: { active: false } })
      : await prisma.diagnosticPackage.update({ where: { id }, data: { active: false } });
    await writeAdminAudit(request, {
      action: 'THYROCARE_CATALOG_DELETED', entityType: type, entityId: id,
      summary: `Removed Thyrocare ${type.toLowerCase()} ${item.name} from active catalogue`,
      metadata: { name: item.name },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/thyrocare/catalog failed', error);
    return NextResponse.json({ error: 'Unable to delete Thyrocare catalogue item.' }, { status: 500 });
  }
}
