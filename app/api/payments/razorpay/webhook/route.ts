import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function fallbackEventId(rawBody: string) {
  return `body_${createHash('sha256').update(rawBody).digest('hex')}`;
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing webhook signature.' }, { status: 400 });
  }

  const rawBody = await request.text();
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqualHex(expected, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  const eventType = payload?.event as string | undefined;
  const payment = payload?.payload?.payment?.entity;
  const order = payload?.payload?.order?.entity;
  const orderId = payment?.order_id || order?.id;
  const paymentId = payment?.id;
  const eventId = request.headers.get('x-razorpay-event-id') || fallbackEventId(rawBody);

  if (!eventType) {
    return NextResponse.json({ error: 'Webhook event type is missing.' }, { status: 400 });
  }

  try {
    try {
      await prisma.razorpayWebhookEvent.create({
        data: {
          eventId,
          eventType,
          paymentId: paymentId || null,
          orderId: orderId || null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.razorpayWebhookEvent.findUnique({ where: { eventId } });
        if (existing?.processedAt) {
          return NextResponse.json({ ok: true, duplicate: true });
        }
        await prisma.razorpayWebhookEvent.update({
          where: { eventId },
          data: { processingError: null },
        });
      } else {
        throw error;
      }
    }

    if ((eventType === 'order.paid' || eventType === 'payment.captured') && orderId && payment) {
      const booking = await prisma.booking.findUnique({
        where: { razorpayOrderId: orderId },
        include: {
          patient: { select: { name: true, phone: true } },
          items: { include: { test: { select: { name: true } } } },
        },
      });

      if (!booking) {
        throw new Error(`No booking found for Razorpay order ${orderId}`);
      }

      const expectedAmount = booking.totalAmount * 100;
      if (
        payment.order_id !== booking.razorpayOrderId ||
        payment.amount !== expectedAmount ||
        payment.currency !== 'INR' ||
        payment.status !== 'captured'
      ) {
        throw new Error(`Razorpay payment details do not match booking ${booking.id}`);
      }

      const wasAlreadyPaid = booking.paymentStatus === 'PAID';
      const now = new Date();
      const pendingRecord = await prisma.paymentTransaction.findFirst({
        where: { bookingId: booking.id, orderId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      const [, confirmed] = await prisma.$transaction([
        pendingRecord
          ? prisma.paymentTransaction.update({
              where: { id: pendingRecord.id },
              data: {
                paymentId: paymentId || booking.razorpayPaymentId,
                status: 'PAID',
                amount: expectedAmount,
                currency: 'INR',
                signatureVerified: true,
                source: 'WEBHOOK',
                failureCode: null,
                failureDescription: null,
              },
            })
          : prisma.paymentTransaction.create({
              data: {
                bookingId: booking.id,
                orderId,
                paymentId: paymentId || null,
                status: 'PAID',
                amount: expectedAmount,
                currency: 'INR',
                signatureVerified: true,
                source: 'WEBHOOK',
              },
            }),
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'PAID',
            paymentMode: 'ONLINE',
            status: 'CONFIRMED',
            workflowStatus: booking.workflowStatus === 'BOOKING_CREATED' ? 'BOOKING_CONFIRMED' : booking.workflowStatus,
            razorpayPaymentId: paymentId || booking.razorpayPaymentId,
            bookingConfirmedAt: booking.bookingConfirmedAt || now,
            paidAt: booking.paidAt || now,
          },
          include: {
            patient: { select: { name: true, phone: true } },
            items: { include: { test: { select: { name: true } } } },
          },
        }),
      ]);

      if (!wasAlreadyPaid) {
        try {
          await sendBookingConfirmationWhatsApp(confirmed);
        } catch (notificationError) {
          console.error('Webhook processed but WhatsApp confirmation failed', notificationError);
        }
      }
    } else if (eventType === 'payment.failed' && orderId && payment) {
      const booking = await prisma.booking.findUnique({ where: { razorpayOrderId: orderId } });
      if (booking && booking.paymentStatus !== 'PAID') {
        const pendingRecord = await prisma.paymentTransaction.findFirst({
          where: { bookingId: booking.id, orderId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        await prisma.$transaction([
          pendingRecord
            ? prisma.paymentTransaction.update({
                where: { id: pendingRecord.id },
                data: {
                  paymentId: paymentId || null,
                  status: 'FAILED',
                  signatureVerified: true,
                  source: 'WEBHOOK',
                  failureCode: payment.error_code || null,
                  failureDescription: payment.error_description || null,
                },
              })
            : prisma.paymentTransaction.create({
                data: {
                  bookingId: booking.id,
                  orderId,
                  paymentId: paymentId || null,
                  status: 'FAILED',
                  amount: payment.amount || booking.totalAmount * 100,
                  currency: payment.currency || 'INR',
                  signatureVerified: true,
                  source: 'WEBHOOK',
                  failureCode: payment.error_code || null,
                  failureDescription: payment.error_description || null,
                },
              }),
          prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: 'FAILED' },
          }),
        ]);
      }
    }

    await prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingError: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    console.error('POST /api/payments/razorpay/webhook failed', error);

    try {
      await prisma.razorpayWebhookEvent.update({
        where: { eventId },
        data: { processingError: message.slice(0, 1000) },
      });
    } catch (recordError) {
      console.error('Unable to record Razorpay webhook processing error', recordError);
    }

    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
