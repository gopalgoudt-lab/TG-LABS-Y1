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

export async function POST(request: Request) {
  try {
    const body = inputSchema.parse(await request.json());
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: 'Razorpay is not configured.' }, { status: 503 });

    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (!booking.razorpayOrderId || booking.razorpayOrderId !== body.razorpay_order_id) {
      return NextResponse.json({ error: 'Payment order does not match this booking.' }, { status: 400 });
    }

    const expected = createHmac('sha256', secret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest('hex');

    if (!safeEqualHex(expected, body.razorpay_signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        razorpayPaymentId: body.razorpay_payment_id,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paidAt: new Date(),
      },
      include: {
        patient: { select: { name: true, phone: true } },
        items: { include: { test: { select: { name: true } } } },
      },
    });

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
        totalAmount: updated.totalAmount,
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
