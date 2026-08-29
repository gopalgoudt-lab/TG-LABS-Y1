import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { assertBookingOwner, assertOnlinePaymentEligible } from '@/lib/booking-integrity';

export const dynamic = 'force-dynamic';

const inputSchema = z.object({ bookingId: z.string().min(1) });

async function ensurePendingPaymentRecord(bookingId: string, orderId: string, amount: number) {
  const existing = await prisma.paymentTransaction.findFirst({
    where: { bookingId, orderId },
    select: { id: true },
  });

  if (!existing) {
    await prisma.paymentTransaction.create({
      data: {
        bookingId,
        orderId,
        amount,
        currency: 'INR',
        status: 'PENDING',
        signatureVerified: false,
        source: 'ORDER_CREATE',
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const { bookingId } = inputSchema.parse(await request.json());
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay credentials are not configured.' }, { status: 503 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: { select: { phone: true } } },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    assertBookingOwner(booking.patient.phone, identity.databasePhone);
    assertOnlinePaymentEligible(booking);

    const amount = booking.totalAmount * 100;

    if (booking.razorpayOrderId) {
      await ensurePendingPaymentRecord(booking.id, booking.razorpayOrderId, amount);
      return NextResponse.json({
        keyId,
        order: { id: booking.razorpayOrderId, amount, currency: 'INR' },
        bookingId: booking.id,
      });
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: booking.id.slice(0, 40),
        notes: { bookingId: booking.id },
      }),
      cache: 'no-store',
    });

    const order = await response.json();
    if (!response.ok || !order?.id) {
      console.error('Razorpay order creation failed', order);
      return NextResponse.json({ error: 'Unable to start payment.' }, { status: 502 });
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { razorpayOrderId: order.id },
      }),
      prisma.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          orderId: order.id,
          amount,
          currency: order.currency ?? 'INR',
          status: 'PENDING',
          signatureVerified: false,
          source: 'ORDER_CREATE',
        },
      }),
    ]);

    return NextResponse.json({ keyId, order, bookingId: booking.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message === 'FIREBASE_PROJECT_NOT_CONFIGURED') return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
    if (message === 'BOOKING_FORBIDDEN' || message === 'UNAUTHENTICATED' || message.includes('FIREBASE_') || message.includes('PHONE_IDENTITY')) {
      return NextResponse.json({ error: 'Authentication is required for this booking.' }, { status: 401 });
    }
    if (message === 'BOOKING_ALREADY_PAID') return NextResponse.json({ error: 'This booking is already paid.' }, { status: 409 });
    if (message === 'BOOKING_NOT_ONLINE_PAYABLE') return NextResponse.json({ error: 'This booking is not eligible for online payment.' }, { status: 409 });
    console.error('POST /api/payments/razorpay/order failed', error);
    return NextResponse.json({ error: 'Payment service is temporarily unavailable.' }, { status: 503 });
  }
}
