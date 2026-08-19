import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const allowedSampleTypes = ['Serum', 'EDTA', 'Fluoride', 'Urine', 'Other'] as const;
const schema = z.object({
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
}).refine(v => !v.sampleTypes.includes('Other') || Boolean(v.sampleTypeOther), {
  message: 'Specify the other sample type.', path: ['sampleTypeOther'],
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    if (body.price > body.mrp && body.mrp > 0) return NextResponse.json({ error: 'After Discount price cannot be higher than MRP.' }, { status: 400 });
    const test = await prisma.diagnosticTest.update({
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
      },
    });
    return NextResponse.json({ test });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check the test details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error('PATCH diagnostic test failed', error);
    return NextResponse.json({ error: 'Unable to update diagnostic test.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.diagnosticTest.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE diagnostic test failed', error);
    return NextResponse.json({ error: 'Unable to delete diagnostic test.' }, { status: 500 });
  }
}
