import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { after, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_code?: string | null;
  error_description?: string | null;
};

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
  };
};

async function claimWebhookEvent(eventId: string, eventType: string, paymentId?: string, orderId?: string) {
  try {
    await prisma.razorpayWebhookEvent.create({
      data: {
        eventId,
        eventType,
        paymentId: paymentId ?? null,
        orderId: orderId ?? null,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

async function reconcileCapturedPayment(eventId: string, payment: RazorpayPaymentEntity) {
  if (!payment.id || !payment.order_id || typeof payment.amount !== 'number') {
    throw new Error('Captured payment webhook is missing required payment fields.');
  }

  const booking = await prisma.booking.findUnique({
    where: { razorpayOrderId: payment.order_id },
  });
  if (!booking) throw new Error(`No booking found for Razorpay order ${payment.order_id}.`);

  const expectedAmount = booking.totalAmount * 100;
  if (payment.amount !== expectedAmount || payment.currency !== 'INR') {
    throw new Error(`Payment amount/currency mismatch for booking ${booking.id}.`);
  }

  const existingByPayment = await prisma.paymentTransaction.findUnique({
    where: { paymentId: payment.id },
    select: { id: true },
  });
  const pendingByOrder = existingByPayment
    ? null
    : await prisma.paymentTransaction.findFirst({
        where: { bookingId: booking.id, orderId: payment.order_id, paymentId: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

  const now = new Date();
  const [, updated] = await prisma.$transaction([
    existingByPayment
      ? prisma.paymentTransaction.update({
          where: { id: existingByPayment.id },
          data: {
            status: 'PAID',
            amount: expectedAmount,
            currency: 'INR',
            source: 'WEBHOOK_CAPTURED',
            failureCode: null,
            failureDescription: null,
          },
        })
      : pendingByOrder
        ? prisma.paymentTransaction.update({
            where: { id: pendingByOrder.id },
            data: {
              paymentId: payment.id,
              status: 'PAID',
              amount: expectedAmount,
              currency: 'INR',
              source: 'WEBHOOK_CAPTURED',
              failureCode: null,
              failureDescription: null,
            },
          })
        : prisma.paymentTransaction.create({
            data: {
              bookingId: booking.id,
              orderId: payment.order_id,
              paymentId: payment.id,
              status: 'PAID',
              amount: expectedAmount,
              currency: 'INR',
              signatureVerified: false,
              source: 'WEBHOOK_CAPTURED',
            },
          }),
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        razorpayPaymentId: payment.id,
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

  if (!updated.whatsappNotifiedAt) {
    try {
      await sendBookingConfirmationWhatsApp(updated);
    } catch (notificationError) {
      console.error('Webhook reconciled payment but WhatsApp confirmation failed', notificationError);
    }
  }

  await prisma.razorpayWebhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date(), processingError: null },
  });
}

async function reconcileFailedPayment(eventId: string, payment: RazorpayPaymentEntity) {
  if (!payment.id || !payment.order_id) {
    throw new Error('Failed payment webhook is missing required payment fields.');
  }

  const booking = await prisma.booking.findUnique({ where: { razorpayOrderId: payment.order_id } });
  if (!booking) throw new Error(`No booking found for Razorpay order ${payment.order_id}.`);

  const existingByPayment = await prisma.paymentTransaction.findUnique({
    where: { paymentId: payment.id },
    select: { id: true },
  });
  const pendingByOrder = existingByPayment
    ? null
    : await prisma.paymentTransaction.findFirst({
        where: { bookingId: booking.id, orderId: payment.order_id, paymentId: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

  await prisma.$transaction([
    existingByPayment
      ? prisma.paymentTransaction.update({
          where: { id: existingByPayment.id },
          data: {
            status: booking.paymentStatus === 'PAID' ? 'PAID' : 'FAILED',
            source: 'WEBHOOK_FAILED',
            failureCode: payment.error_code ?? null,
            failureDescription: payment.error_description ?? null,
          },
        })
      : pendingByOrder
        ? prisma.paymentTransaction.update({
            where: { id: pendingByOrder.id },
            data: {
              paymentId: payment.id,
              status: booking.paymentStatus === 'PAID' ? 'PAID' : 'FAILED',
              source: 'WEBHOOK_FAILED',
              failureCode: payment.error_code ?? null,
              failureDescription: payment.error_description ?? null,
            },
          })
        : prisma.paymentTransaction.create({
            data: {
              bookingId: booking.id,
              orderId: payment.order_id,
              paymentId: payment.id,
              status: booking.paymentStatus === 'PAID' ? 'PAID' : 'FAILED',
              amount: typeof payment.amount === 'number' ? payment.amount : booking.totalAmount * 100,
              currency: payment.currency ?? 'INR',
              signatureVerified: false,
              source: 'WEBHOOK_FAILED',
              failureCode: payment.error_code ?? null,
              failureDescription: payment.error_description ?? null,
            },
          }),
    booking.paymentStatus === 'PAID'
      ? prisma.booking.update({ where: { id: booking.id }, data: {} })
      : prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: 'FAILED' },
        }),
  ]);

  await prisma.razorpayWebhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date(), processingError: null },
  });
}

async function processWebhook(eventId: string, payload: RazorpayWebhookPayload) {
  const eventType = payload.event ?? 'unknown';
  const payment = payload.payload?.payment?.entity;

  try {
    if (eventType === 'payment.captured' && payment) {
      await reconcileCapturedPayment(eventId, payment);
      return;
    }
    if (eventType === 'payment.failed' && payment) {
      await reconcileFailedPayment(eventId, payment);
      return;
    }

    await prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    console.error('Razorpay webhook reconciliation failed', { eventId, eventType, message });
    await prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingError: message.slice(0, 1000) },
    }).catch(() => undefined);
  }
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Razorpay webhook is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const eventId = request.headers.get('x-razorpay-event-id');

  if (!signature || !eventId) {
    return NextResponse.json({ error: 'Missing Razorpay webhook headers.' }, { status: 400 });
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqualHex(expected, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook JSON.' }, { status: 400 });
  }

  const eventType = payload.event ?? 'unknown';
  const payment = payload.payload?.payment?.entity;
  const claimed = await claimWebhookEvent(eventId, eventType, payment?.id, payment?.order_id);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  after(() => processWebhook(eventId, payload));
  return NextResponse.json({ received: true });
}
