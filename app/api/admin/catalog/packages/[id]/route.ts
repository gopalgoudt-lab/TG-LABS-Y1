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
}).refine(v => !v.sampleTypes.includes('Other') || Boolean(v.sampleTypeOther), {
  message: 'Specify the other sample type.', path: ['sampleTypeOther'],
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    if (body.price > body.mrp && body.mrp > 0) return NextResponse.json({ error: 'After Discount price cannot be higher than MRP.' }, { status: 400 });
    const tests = await prisma.diagnosticTest.findMany({ where: { id: { in: body.testIds }, active: true }, select: { id: true } });
    if (tests.length !== body.testIds.length) return NextResponse.json({ error: 'One or more selected tests are unavailable.' }, { status: 400 });

    const pack = await prisma.$transaction(async tx => {
      await tx.packageItem.deleteMany({ where: { packageId: id } });
      return tx.diagnosticPackage.update({
        where: { id },
        data: {
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
          tests: { create: body.testIds.map(testId => ({ testId })) },
        },
        include: { tests: { include: { test: true } } },
      });
    });
    return NextResponse.json({ package: pack });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check the package details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error('PATCH diagnostic package failed', error);
    return NextResponse.json({ error: 'Unable to update package.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.diagnosticPackage.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE diagnostic package failed', error);
    return NextResponse.json({ error: 'Unable to delete package.' }, { status: 500 });
  }
}
