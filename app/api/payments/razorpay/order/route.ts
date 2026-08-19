import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const inputSchema = z.object({ bookingId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { bookingId } = inputSchema.parse(await request.json());
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay credentials are not configured.' }, { status: 503 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (booking.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'This booking is already paid.' }, { status: 409 });
    }

    if (booking.razorpayOrderId) {
      return NextResponse.json({
        keyId,
        order: { id: booking.razorpayOrderId, amount: booking.totalAmount * 100, currency: 'INR' },
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
        amount: booking.totalAmount * 100,
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

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({ keyId, order, bookingId: booking.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 });
    }
    console.error('POST /api/payments/razorpay/order failed', error);
    return NextResponse.json({ error: 'Payment service is temporarily unavailable.' }, { status: 503 });
  }
}
