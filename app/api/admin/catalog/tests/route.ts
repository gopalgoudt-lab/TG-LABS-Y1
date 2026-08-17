import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const allowedSampleTypes = ['Serum', 'EDTA', 'Fluoride', 'Urine', 'Other'] as const;

const testSchema = z.object({
  name: z.string().trim().min(2).max(160),
  mrp: z.coerce.number().int().min(0).max(1000000),
  price: z.coerce.number().int().min(0).max(1000000),
  diagnosticPartner: z.string().trim().max(160).optional().default(''),
  tat: z.string().trim().max(100).optional().default(''),
  fastingNeeded: z.boolean().optional().default(false),
  sampleTypes: z.array(z.enum(allowedSampleTypes)).min(1, 'Select at least one sample type.'),
  sampleTypeOther: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(3000).optional().default(''),
  imageData: z.string().max(2200000).optional().default(''),
}).refine((value) => !value.sampleTypes.includes('Other') || Boolean(value.sampleTypeOther), {
  message: 'Specify the other sample type.',
  path: ['sampleTypeOther'],
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET() {
  const tests = await prisma.diagnosticTest.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ tests });
}

export async function POST(request: Request) {
  try {
    const body = testSchema.parse(await request.json());
    if (body.price > body.mrp && body.mrp > 0) {
      return NextResponse.json({ error: 'After Discount price cannot be higher than MRP.' }, { status: 400 });
    }

    const baseSlug = slugify(body.name) || 'test';
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.diagnosticTest.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const test = await prisma.diagnosticTest.create({
      data: {
        slug,
        name: body.name,
        mrp: body.mrp,
        price: body.price,
        diagnosticPartner: body.diagnosticPartner || null,
        tat: body.tat || null,
        fastingNeeded: body.fastingNeeded,
        sampleTypes: body.sampleTypes,
        sampleTypeOther: body.sampleTypes.includes('Other') ? body.sampleTypeOther : null,
        description: body.description || null,
        imageData: body.imageData || null,
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check the test details.', fields: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('POST /api/admin/catalog/tests failed', error);
    return NextResponse.json({ error: 'Unable to save diagnostic test.' }, { status: 500 });
  }
}
