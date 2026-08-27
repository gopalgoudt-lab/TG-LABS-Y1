import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationWhatsApp } from '@/lib/whatsapp';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { assertBookingOwner, assertOnlinePaymentEligible } from '@/lib/booking-integrity';
import { assertCapturedPayment, verifyRazorpayPaymentSignature } from '@/lib/payment-integrity';

export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  bookingId: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

async function fetchRazorpayPayment(paymentId: string, keyId: string, keySecret: string) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    cache: 'no-store',
  });

  const payment = await response.json();
  if (!response.ok) {
    console.error('Razorpay payment lookup failed', payment);
    return null;
  }
  return payment;
}

export async function POST(request: Request) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const body = inputSchema.parse(await request.json());
    const keyId = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) return NextResponse.json({ error: 'Razorpay is not configured.' }, { status: 503 });

    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { patient: { select: { phone: true } } },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    assertBookingOwner(booking.patient.phone, identity.databasePhone);
    if (!booking.razorpayOrderId || booking.razorpayOrderId !== body.razorpay_order_id) {
      return NextResponse.json({ error: 'Payment order does not match this booking.' }, { status: 400 });
    }
    if (booking.paymentStatus === 'PAID' && booking.razorpayPaymentId === body.razorpay_payment_id) {
      return NextResponse.json({
        booking: {
          id: booking.id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          workflowStatus: booking.workflowStatus,
          totalAmount: booking.totalAmount,
        },
      });
    }
    if (booking.paymentStatus === 'PAID' && booking.razorpayPaymentId !== body.razorpay_payment_id) {
      return NextResponse.json({ error: 'This booking is already paid with a different payment.' }, { status: 409 });
    }
    assertOnlinePaymentEligible(booking);

    if (!verifyRazorpayPaymentSignature(booking.razorpayOrderId, body.razorpay_payment_id, body.razorpay_signature, secret)) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(body.razorpay_payment_id, keyId, secret);
    if (!payment) {
      return NextResponse.json({ error: 'Unable to confirm payment with Razorpay.' }, { status: 502 });
    }

    const expectedAmount = booking.totalAmount * 100;
    try {
      assertCapturedPayment(payment, booking.razorpayOrderId, expectedAmount);
    } catch {
      return NextResponse.json({ error: 'Razorpay payment details do not match this booking.' }, { status: 400 });
    }

    const now = new Date();
    const pendingRecord = await prisma.paymentTransaction.findFirst({
      where: { bookingId: booking.id, orderId: booking.razorpayOrderId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const [, updated] = await prisma.$transaction([
      pendingRecord
        ? prisma.paymentTransaction.update({
            where: { id: pendingRecord.id },
            data: {
              paymentId: body.razorpay_payment_id,
              status: 'PAID',
              amount: expectedAmount,
              currency: payment.currency,
              signatureVerified: true,
              source: 'CHECKOUT_VERIFY',
              failureCode: null,
              failureDescription: null,
            },
          })
        : prisma.paymentTransaction.create({
            data: {
              bookingId: booking.id,
              orderId: booking.razorpayOrderId,
              paymentId: body.razorpay_payment_id,
              status: 'PAID',
              amount: expectedAmount,
              currency: payment.currency,
              signatureVerified: true,
              source: 'CHECKOUT_VERIFY',
            },
          }),
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          razorpayPaymentId: body.razorpay_payment_id,
          paymentStatus: 'PAID',
          paymentMode: 'ONLINE',
          status: 'CONFIRMED',
          workflowStatus: booking.workflowStatus === 'BOOKING_CREATED' ? 'BOOKING_CONFIRMED' : booking.workflowStatus,
          bookingConfirmedAt: booking.bookingConfirmedAt ?? now,
          paidAt: booking.paidAt ?? now,
        },
        include: {
          patient: { select: { name: true, phone: true } },
          items: { include: { test: { select: { name: true } } } },
        },
      }),
    ]);

    try {
      await sendBookingConfirmationWhatsApp(updated);
    } catch (notificationError) {
      console.error('Payment succeeded but WhatsApp confirmation failed', notificationError);
    }

    return NextResponse.json({
      booking: {
        id: updated.id,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        workflowStatus: updated.workflowStatus,
        totalAmount: updated.totalAmount,
        razorpayPaymentId: updated.razorpayPaymentId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment verification request.' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message === 'FIREBASE_PROJECT_NOT_CONFIGURED') return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
    if (message === 'BOOKING_FORBIDDEN' || message === 'UNAUTHENTICATED' || message.includes('FIREBASE_') || message.includes('PHONE_IDENTITY')) {
      return NextResponse.json({ error: 'Authentication is required for this booking.' }, { status: 401 });
    }
    if (message === 'BOOKING_NOT_ONLINE_PAYABLE') return NextResponse.json({ error: 'This booking is not eligible for online payment.' }, { status: 409 });
    console.error('POST /api/payments/razorpay/verify failed', error);
    return NextResponse.json({ error: 'Unable to verify payment.' }, { status: 503 });
  }
}
