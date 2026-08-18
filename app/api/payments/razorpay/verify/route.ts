import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  bookingId: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

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
    const body = inputSchema.parse(await request.json());
    const keyId = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) return NextResponse.json({ error: 'Razorpay is not configured.' }, { status: 503 });

    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
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

    const expected = createHmac('sha256', secret)
      .update(`${booking.razorpayOrderId}|${body.razorpay_payment_id}`)
      .digest('hex');

    if (!safeEqualHex(expected, body.razorpay_signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(body.razorpay_payment_id, keyId, secret);
    if (!payment) {
      return NextResponse.json({ error: 'Unable to confirm payment with Razorpay.' }, { status: 502 });
    }

    const expectedAmount = booking.totalAmount * 100;
    if (
      payment.order_id !== booking.razorpayOrderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== 'INR'
    ) {
      return NextResponse.json({ error: 'Razorpay payment details do not match this booking.' }, { status: 400 });
    }

    if (payment.status !== 'captured') {
      return NextResponse.json({
        error: 'Payment is verified but has not been captured yet. It will be reconciled automatically.',
        paymentStatus: payment.status,
      }, { status: 409 });
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
    console.error('POST /api/payments/razorpay/verify failed', error);
    return NextResponse.json({ error: 'Unable to verify payment.' }, { status: 503 });
  }
}
