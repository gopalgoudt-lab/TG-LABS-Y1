import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 503 });

  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) return NextResponse.json({ error: 'Missing webhook signature.' }, { status: 400 });

  const rawBody = await request.text();
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqualHex(expected, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload?.event as string | undefined;
    const payment = payload?.payload?.payment?.entity;
    const order = payload?.payload?.order?.entity;
    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;

    if ((event === 'order.paid' || event === 'payment.captured') && orderId) {
      const booking = await prisma.booking.findUnique({
        where: { razorpayOrderId: orderId },
        include: {
          patient: { select: { name: true, phone: true } },
          items: { include: { test: { select: { name: true } } } },
        },
      });

      if (booking) {
        const confirmed = booking.paymentStatus === 'PAID'
          ? booking
          : await prisma.booking.update({
              where: { id: booking.id },
              data: {
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                razorpayPaymentId: paymentId || booking.razorpayPaymentId,
                paidAt: booking.paidAt || new Date(),
              },
              include: {
                patient: { select: { name: true, phone: true } },
                items: { include: { test: { select: { name: true } } } },
              },
            });

        try {
          await sendBookingConfirmationWhatsApp(confirmed);
        } catch (notificationError) {
          console.error('Webhook processed but WhatsApp confirmation failed', notificationError);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/payments/razorpay/webhook failed', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
