import { PaymentMode, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { assertBookingOwner, validateAndPriceBooking } from '@/lib/booking-integrity';

export const dynamic = 'force-dynamic';

const PRINTED_REPORT_FEE = 100;

function fmt(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`;
}

const BOOKING_SLOTS = Array.from(
  { length: 26 },
  (_, index) => `${fmt(360 + index * 30)} - ${fmt(390 + index * 30)}`,
);

function indiaTodayAsUtcDate() {
  const now = new Date();
  const india = new Date(now.getTime() + 330 * 60 * 1000);
  return new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate()));
}

const bookingSchema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  email: z.string().trim().email().max(200),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHERS']),
  doctorName: z.string().trim().max(160).optional(),
  printedReport: z.boolean().optional().default(false),
  paymentOption: z.enum(['ONLINE', 'QR', 'COLLECTION']).optional().default('ONLINE'),
  collectionPaymentMethod: z.enum(['CASH', 'UPI']).optional(),
  mode: z.enum(['home', 'centre']),
  address: z.string().trim().max(500).optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
  date: z.string().date(),
  slot: z.string().refine((value) => BOOKING_SLOTS.includes(value), {
    message: 'Please choose an available collection slot.',
  }),
  testIds: z.array(z.string().min(1)).max(20).optional(),
  testNames: z.array(z.string().trim().min(1)).max(20).optional(),
  testSelections: z.array(z.object({ testId: z.string().min(1), offerId: z.string().min(1) })).max(20).optional(),
  packageIds: z.array(z.string().min(1)).max(10).optional(),
}).refine(
  (v) => Boolean(v.testSelections?.length || v.testIds?.length || v.testNames?.length || v.packageIds?.length),
  { message: 'At least one diagnostic test or package is required.', path: ['testIds'] },
).refine(
  (v) => v.mode !== 'home' || Boolean(v.address && v.pincode),
  { message: 'Address and 6-digit pincode are required for home collection.', path: ['pincode'] },
).refine(
  (v) => v.paymentOption !== 'COLLECTION' || Boolean(v.collectionPaymentMethod),
  { message: 'Choose Cash or UPI for payment at sample collection.', path: ['collectionPaymentMethod'] },
);

function bookingPayload(booking: {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMode: string | null;
  totalAmount: number;
  printedReport: boolean;
  printedReportFee: number;
  doctorName: string | null;
  mode: string;
  collectionDate: Date;
  slot: string;
}, diagnosticAmount?: number) {
  return {
    id: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMode: booking.paymentMode,
    totalAmount: booking.totalAmount,
    diagnosticAmount: diagnosticAmount ?? booking.totalAmount - booking.printedReportFee,
    printedReport: booking.printedReport,
    printedReportFee: booking.printedReportFee,
    doctorName: booking.doctorName,
    mode: booking.mode,
    collectionDate: booking.collectionDate.toISOString(),
    slot: booking.slot,
  };
}

export async function POST(request: Request) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const body = bookingSchema.parse(await request.json());
    assertBookingOwner(body.phone, identity.databasePhone);

    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { patient: { select: { phone: true } } },
    });
    if (existing) {
      assertBookingOwner(existing.patient.phone, identity.databasePhone);
      return NextResponse.json({ booking: bookingPayload(existing), duplicate: true }, { status: 200 });
    }

    const collectionDate = new Date(`${body.date}T00:00:00.000Z`);
    if (Number.isNaN(collectionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid collection date.' }, { status: 400 });
    }

    const today = indiaTodayAsUtcDate();
    const latestAllowedDate = new Date(today);
    latestAllowedDate.setUTCDate(latestAllowedDate.getUTCDate() + 90);
    if (collectionDate < today) {
      return NextResponse.json({ error: 'Collection date cannot be in the past.' }, { status: 400 });
    }
    if (collectionDate > latestAllowedDate) {
      return NextResponse.json({ error: 'Please choose a collection date within the next 90 days.' }, { status: 400 });
    }

    if ((body.testIds?.length || body.testNames?.length) && !body.testSelections?.length) {
      return NextResponse.json({ error: 'Please select an available diagnostic partner for every test.' }, { status: 400 });
    }

    const requestedSelections = body.testSelections ?? [];
    if (new Set(requestedSelections.map((selection) => selection.testId)).size !== requestedSelections.length) {
      return NextResponse.json({ error: 'Each diagnostic test must have exactly one selected partner offer.' }, { status: 400 });
    }

    const [directOffers, packages] = await Promise.all([
      requestedSelections.length
        ? prisma.testPartnerOffer.findMany({
            where: {
              id: { in: requestedSelections.map((selection) => selection.offerId) },
              active: true,
              availability: 'AVAILABLE',
              test: { active: true },
              partner: { active: true },
            },
            select: {
              id: true,
              testId: true,
              price: true,
              tat: true,
              partner: { select: { id: true, name: true } },
            },
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

    if (directOffers.length !== requestedSelections.length) {
      return NextResponse.json({ error: 'One or more selected partner offers are unavailable.' }, { status: 400 });
    }
    const requestedOfferByTest = new Map(requestedSelections.map((selection) => [selection.testId, selection.offerId]));
    if (directOffers.some((offer) => requestedOfferByTest.get(offer.testId) !== offer.id)) {
      return NextResponse.json({ error: 'A selected partner offer does not match its diagnostic test.' }, { status: 400 });
    }
    if (packages.length !== (body.packageIds?.length ?? 0)) {
      return NextResponse.json({ error: 'One or more selected packages are unavailable.' }, { status: 400 });
    }

    const pricing = validateAndPriceBooking(requestedSelections, directOffers, packages, body.printedReport ? PRINTED_REPORT_FEE : 0);
    const packageTestIds = pricing.packageTestIds;
    const uniqueTests = new Map<string, { id: string; price: number; offerId?: string; partnerId?: string; partnerName?: string; partnerTat?: string | null; partnerAvailability?: 'AVAILABLE' }>();

    for (const pkg of packages) {
      for (const item of pkg.tests) {
        uniqueTests.set(item.test.id, { id: item.test.id, price: 0 });
      }
    }
    for (const offer of directOffers) {
      uniqueTests.set(offer.testId, {
        id: offer.testId,
        price: packageTestIds.has(offer.testId) ? 0 : offer.price,
        offerId: offer.id,
        partnerId: offer.partner.id,
        partnerName: offer.partner.name,
        partnerTat: offer.tat,
        partnerAvailability: 'AVAILABLE',
      });
    }

    const diagnosticAmount = pricing.diagnosticAmount;
    const printedReportFee = body.printedReport ? PRINTED_REPORT_FEE : 0;
    const totalAmount = pricing.totalAmount;

    const patient = await prisma.patient.upsert({
      where: { phone: body.phone },
      update: { name: body.name, email: body.email, age: body.age, gender: body.gender },
      create: { name: body.name, phone: body.phone, email: body.email, age: body.age, gender: body.gender },
    });

    const payAtCollection = body.paymentOption === 'COLLECTION';
    const paymentMode: PaymentMode = payAtCollection
      ? body.collectionPaymentMethod === 'UPI' ? PaymentMode.UPI : PaymentMode.CASH
      : body.paymentOption === 'QR'
        ? PaymentMode.UPI
        : PaymentMode.ONLINE;
    const now = new Date();

    try {
      const booking = await prisma.booking.create({
        data: {
          idempotencyKey: body.idempotencyKey,
          patientId: patient.id,
          mode: body.mode === 'home' ? 'HOME' : 'CENTRE',
          address: body.mode === 'home' ? body.address : null,
          pincode: body.mode === 'home' ? body.pincode : null,
          doctorName: body.doctorName || null,
          printedReport: body.printedReport,
          printedReportFee,
          paymentMode,
          status: payAtCollection ? 'CONFIRMED' : 'PENDING',
          paymentStatus: 'PENDING',
          workflowStatus: payAtCollection ? 'BOOKING_CONFIRMED' : 'BOOKING_CREATED',
          bookingConfirmedAt: payAtCollection ? now : null,
          collectionDate,
          slot: body.slot,
          totalAmount,
          items: {
            create: Array.from(uniqueTests.values()).map((test) => ({
              testId: test.id,
              price: test.price,
              offerId: test.offerId,
              partnerId: test.partnerId,
              partnerName: test.partnerName,
              partnerTat: test.partnerTat,
              partnerAvailability: test.partnerAvailability,
            })),
          },
          packages: {
            create: packages.map((pkg) => ({ packageId: pkg.id, price: pkg.price })),
          },
        },
      });

      return NextResponse.json({ booking: bookingPayload(booking, diagnosticAmount) }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await prisma.booking.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
          include: { patient: { select: { phone: true } } },
        });
        if (duplicate) {
          assertBookingOwner(duplicate.patient.phone, identity.databasePhone);
          return NextResponse.json({ booking: bookingPayload(duplicate), duplicate: true }, { status: 200 });
        }
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check the booking details and try again.', fields: error.flatten().fieldErrors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message === 'FIREBASE_PROJECT_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
    }
    if (message === 'BOOKING_FORBIDDEN' || message === 'UNAUTHENTICATED' || message.includes('FIREBASE_') || message.includes('PHONE_IDENTITY')) {
      return NextResponse.json({ error: 'Please sign in with the patient mobile number before booking.' }, { status: 401 });
    }
    console.error('POST /api/bookings failed', error);
    return NextResponse.json({ error: 'Booking service is temporarily unavailable.' }, { status: 503 });
  }
}
