import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PRINTED_REPORT_FEE = 100;

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  email: z.string().trim().email().max(200),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHERS']),
  doctorName: z.string().trim().max(160).optional(),
  printedReport: z.boolean().optional().default(false),
  mode: z.enum(['home', 'centre']),
  address: z.string().trim().max(500).optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
  date: z.string().date(),
  slot: z.string().trim().min(3).max(60),
  testIds: z.array(z.string().min(1)).max(20).optional(),
  testNames: z.array(z.string().trim().min(1)).max(20).optional(),
  packageIds: z.array(z.string().min(1)).max(10).optional(),
}).refine(
  (v) => Boolean(v.testIds?.length || v.testNames?.length || v.packageIds?.length),
  { message: 'At least one diagnostic test or package is required.', path: ['testIds'] },
).refine(
  (v) => v.mode !== 'home' || Boolean(v.address && v.pincode),
  { message: 'Address and 6-digit pincode are required for home collection.', path: ['pincode'] },
);

export async function POST(request: Request) {
  try {
    const body = bookingSchema.parse(await request.json());
    const collectionDate = new Date(`${body.date}T00:00:00.000Z`);
    if (Number.isNaN(collectionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid collection date.' }, { status: 400 });
    }

    const [directTests, packages] = await Promise.all([
      body.testIds?.length || body.testNames?.length
        ? prisma.diagnosticTest.findMany({
            where: {
              active: true,
              ...(body.testIds?.length ? { id: { in: body.testIds } } : { name: { in: body.testNames } }),
            },
            select: { id: true, name: true, price: true },
          })
        : Promise.resolve([]),
      body.packageIds?.length
        ? prisma.diagnosticPackage.findMany({
            where: { active: true, id: { in: body.packageIds } },
            select: {
              id: true,
              name: true,
              price: true,
              tests: { select: { test: { select: { id: true, name: true, price: true } } } },
            },
          })
        : Promise.resolve([]),
    ]);

    const requestedTestCount = body.testIds?.length ?? body.testNames?.length ?? 0;
    if (directTests.length !== requestedTestCount) {
      return NextResponse.json({ error: 'One or more selected tests are unavailable.' }, { status: 400 });
    }
    if (packages.length !== (body.packageIds?.length ?? 0)) {
      return NextResponse.json({ error: 'One or more selected packages are unavailable.' }, { status: 400 });
    }

    const packageTestIds = new Set(packages.flatMap((pkg) => pkg.tests.map((item) => item.test.id)));
    const chargeableDirectTests = directTests.filter((test) => !packageTestIds.has(test.id));
    const uniqueTests = new Map<string, { id: string; price: number; includedByPackage: boolean }>();

    for (const pkg of packages) {
      for (const item of pkg.tests) {
        uniqueTests.set(item.test.id, { id: item.test.id, price: 0, includedByPackage: true });
      }
    }
    for (const test of directTests) {
      if (!uniqueTests.has(test.id)) uniqueTests.set(test.id, { id: test.id, price: test.price, includedByPackage: false });
    }

    const diagnosticAmount =
      packages.reduce((sum, pkg) => sum + pkg.price, 0) +
      chargeableDirectTests.reduce((sum, test) => sum + test.price, 0);
    const printedReportFee = body.printedReport ? PRINTED_REPORT_FEE : 0;
    const totalAmount = diagnosticAmount + printedReportFee;

    const patient = await prisma.patient.upsert({
      where: { phone: body.phone },
      update: { name: body.name, email: body.email, age: body.age, gender: body.gender },
      create: { name: body.name, phone: body.phone, email: body.email, age: body.age, gender: body.gender },
    });

    const booking = await prisma.booking.create({
      data: {
        patientId: patient.id,
        mode: body.mode === 'home' ? 'HOME' : 'CENTRE',
        address: body.mode === 'home' ? body.address : null,
        pincode: body.mode === 'home' ? body.pincode : null,
        doctorName: body.doctorName || null,
        printedReport: body.printedReport,
        printedReportFee,
        collectionDate,
        slot: body.slot,
        totalAmount,
        items: {
          create: Array.from(uniqueTests.values()).map((test) => ({ testId: test.id, price: test.price })),
        },
        packages: {
          create: packages.map((pkg) => ({ packageId: pkg.id, price: pkg.price })),
        },
      },
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        diagnosticAmount,
        printedReport: booking.printedReport,
        printedReportFee: booking.printedReportFee,
        doctorName: booking.doctorName,
        mode: booking.mode,
        collectionDate: booking.collectionDate.toISOString(),
        slot: booking.slot,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check the booking details and try again.', fields: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('POST /api/bookings failed', error);
    return NextResponse.json({ error: 'Booking service is temporarily unavailable.' }, { status: 503 });
  }
}
