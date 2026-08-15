import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  mode: z.enum(['home', 'centre']),
  address: z.string().trim().max(500).optional(),
  date: z.string().date(),
  slot: z.string().trim().min(3).max(60),
  testIds: z.array(z.string().min(1)).min(1).max(20),
});

export async function POST(request: Request) {
  try {
    const body = bookingSchema.parse(await request.json());

    if (body.mode === 'home' && !body.address) {
      return NextResponse.json({ error: 'Collection address is required for home collection.' }, { status: 400 });
    }

    const collectionDate = new Date(`${body.date}T00:00:00.000Z`);
    if (Number.isNaN(collectionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid collection date.' }, { status: 400 });
    }

    const tests = await prisma.diagnosticTest.findMany({
      where: { id: { in: body.testIds }, active: true },
      select: { id: true, name: true, price: true },
    });

    if (tests.length !== body.testIds.length) {
      return NextResponse.json({ error: 'One or more selected tests are unavailable.' }, { status: 400 });
    }

    const totalAmount = tests.reduce((sum, test) => sum + test.price, 0);

    const patient = await prisma.patient.upsert({
      where: { phone: body.phone },
      update: { name: body.name },
      create: { name: body.name, phone: body.phone },
    });

    const booking = await prisma.booking.create({
      data: {
        patientId: patient.id,
        mode: body.mode === 'home' ? 'HOME' : 'CENTRE',
        address: body.mode === 'home' ? body.address : null,
        collectionDate,
        slot: body.slot,
        totalAmount,
        items: {
          create: tests.map((test) => ({ testId: test.id, price: test.price })),
        },
      },
      include: { items: { include: { test: true } } },
    });

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          mode: booking.mode,
          collectionDate: booking.collectionDate.toISOString(),
          slot: booking.slot,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check the booking details and try again.', fields: error.flatten().fieldErrors }, { status: 400 });
    }

    console.error('POST /api/bookings failed', error);
    return NextResponse.json({ error: 'Booking service is temporarily unavailable.' }, { status: 503 });
  }
}
