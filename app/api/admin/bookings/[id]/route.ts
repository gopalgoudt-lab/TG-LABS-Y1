import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  age: z.coerce.number().int().min(0).max(120).nullable().optional(),
  gender: z.enum(['Male','Female','Others']).nullable().optional(),
  mode: z.enum(['HOME','CENTRE']),
  address: z.string().trim().max(500).optional().default(''),
  date: z.string().date(),
  slot: z.string().trim().min(3).max(60),
  testIds: z.array(z.string()).default([]),
  packageIds: z.array(z.string()).default([]),
  technician: z.string().trim().max(120).optional().default(''),
  totalAmount: z.coerce.number().int().min(0),
  status: z.enum(['PENDING','CONFIRMED','CANCELLED','COMPLETED']),
  paymentStatus: z.enum(['PENDING','PAID','FAILED','REFUNDED']),
  adminNotes: z.string().trim().max(1000).optional().default(''),
  reportName: z.string().trim().max(255).optional().default(''),
  reportData: z.string().max(4500000).optional().default(''),
}).refine(v => v.testIds.length + v.packageIds.length > 0, { message: 'Select at least one test or package.' });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { patient: true, items: { include: { test: true } } },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = schema.parse(await request.json());
    if (b.mode === 'HOME' && !b.address) return NextResponse.json({ error: 'Address is required for home collection.' }, { status: 400 });

    const existing = await prisma.booking.findUnique({ where: { id }, include: { patient: true } });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    const tests = await prisma.diagnosticTest.findMany({ where: { id: { in: b.testIds }, active: true } });
    const packages = await prisma.diagnosticPackage.findMany({ where: { id: { in: b.packageIds }, active: true }, include: { tests: { include: { test: true } } } });
    if (tests.length !== b.testIds.length || packages.length !== b.packageIds.length) return NextResponse.json({ error: 'One or more selected tests/packages are unavailable.' }, { status: 400 });

    const testMap = new Map<string, { id: string; price: number }>();
    tests.forEach(t => testMap.set(t.id, { id: t.id, price: t.price }));
    for (const p of packages) for (const item of p.tests) if (!testMap.has(item.test.id)) testMap.set(item.test.id, { id: item.test.id, price: item.test.price });

    const booking = await prisma.$transaction(async tx => {
      let patientId = existing.patientId;
      if (existing.patient.phone !== b.phone) {
        const target = await tx.patient.findUnique({ where: { phone: b.phone } });
        if (target) {
          patientId = target.id;
          await tx.patient.update({ where: { id: target.id }, data: { name: b.name, age: b.age ?? null, gender: b.gender ?? null } });
        } else {
          await tx.patient.update({ where: { id: existing.patientId }, data: { phone: b.phone, name: b.name, age: b.age ?? null, gender: b.gender ?? null } });
        }
      } else {
        await tx.patient.update({ where: { id: existing.patientId }, data: { name: b.name, age: b.age ?? null, gender: b.gender ?? null } });
      }

      await tx.bookingItem.deleteMany({ where: { bookingId: id } });
      return tx.booking.update({
        where: { id },
        data: {
          patientId,
          mode: b.mode,
          address: b.mode === 'HOME' ? b.address : null,
          collectionDate: new Date(`${b.date}T00:00:00.000Z`),
          slot: b.slot,
          technician: b.technician || null,
          totalAmount: b.totalAmount,
          status: b.status,
          paymentStatus: b.paymentStatus,
          adminNotes: b.adminNotes || null,
          reportName: b.reportName || null,
          reportData: b.reportData || null,
          items: { create: [...testMap.values()].map(t => ({ testId: t.id, price: t.price })) },
        },
        include: { patient: true, items: { include: { test: true } } },
      });
    });

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check the booking details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update booking.' }, { status: 500 });
  }
}
