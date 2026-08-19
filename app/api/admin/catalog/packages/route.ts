import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const allowedSampleTypes = ['Serum', 'EDTA', 'Fluoride', 'Urine', 'Other'] as const;
const schema = z.object({
  name: z.string().trim().min(2).max(160),
  mrp: z.coerce.number().int().min(0),
  price: z.coerce.number().int().min(0),
  diagnosticPartner: z.string().trim().max(160).optional().default(''),
  tat: z.string().trim().max(100).optional().default(''),
  fastingNeeded: z.boolean().optional().default(false),
  sampleTypes: z.array(z.enum(allowedSampleTypes)).min(1, 'Select at least one sample type.'),
  sampleTypeOther: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(3000).optional().default(''),
  imageData: z.string().max(2200000).optional().default(''),
  testIds: z.array(z.string().min(1)).min(1),
}).refine((value) => !value.sampleTypes.includes('Other') || Boolean(value.sampleTypeOther), {
  message: 'Specify the other sample type.',
  path: ['sampleTypeOther'],
});

const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function GET() {
  const packages = await prisma.diagnosticPackage.findMany({
    where: { active: true },
    include: { tests: { include: { test: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  try {
    const b = schema.parse(await request.json());
    if (b.price > b.mrp && b.mrp > 0) {
      return NextResponse.json({ error: 'After Discount price cannot be higher than MRP.' }, { status: 400 });
    }

    const tests = await prisma.diagnosticTest.findMany({ where: { id: { in: b.testIds }, active: true }, select: { id: true } });
    if (tests.length !== b.testIds.length) {
      return NextResponse.json({ error: 'One or more selected tests are unavailable.' }, { status: 400 });
    }

    let slug = slugify(b.name) || 'package';
    const base = slug;
    let n = 2;
    while (await prisma.diagnosticPackage.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${n++}`;

    const pack = await prisma.diagnosticPackage.create({
      data: {
        slug,
        name: b.name,
        mrp: b.mrp,
        price: b.price,
        diagnosticPartner: b.diagnosticPartner || null,
        tat: b.tat || null,
        fastingNeeded: b.fastingNeeded,
        sampleTypes: b.sampleTypes,
        sampleTypeOther: b.sampleTypes.includes('Other') ? b.sampleTypeOther : null,
        description: b.description || null,
        imageData: b.imageData || null,
        tests: { create: b.testIds.map((testId) => ({ testId })) },
      },
      include: { tests: { include: { test: true } } },
    });
    return NextResponse.json({ package: pack }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check the package details.', fields: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('POST /api/admin/catalog/packages failed', error);
    return NextResponse.json({ error: 'Unable to save package.' }, { status: 500 });
  }
}
