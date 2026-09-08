import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { createPaymentReceiptPdf, isReceiptAvailable, receiptNumberForBooking } from '@/lib/payment-receipt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const { id } = await params;
    const booking = await prisma.booking.findFirst({
      where: { id, patient: { phone: identity.databasePhone } },
      include: {
        patient: true,
        items: { include: { test: true } },
        packages: { include: { package: true } },
        payments: { where: { status: 'PAID' }, orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (!isReceiptAvailable(booking.paymentStatus)) {
      return NextResponse.json({ error: 'Payment receipt is available after payment is marked PAID.' }, { status: 409 });
    }

    const baseLines = [
      ...booking.items.map((item) => ({ name: item.test.name, amount: item.price })),
      ...booking.packages.map((item) => ({ name: item.package.name, amount: item.price })),
      ...(booking.printedReportFee > 0 ? [{ name: 'Printed report service', amount: booking.printedReportFee }] : []),
    ];
    const baseSubtotal = baseLines.reduce((sum, line) => sum + line.amount, 0);
    const positiveAdjustment = Math.max(0, booking.totalAmount - baseSubtotal);
    const lines = positiveAdjustment > 0
      ? [...baseLines, { name: 'Recorded booking adjustment', amount: positiveAdjustment }]
      : baseLines;
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = Math.max(0, subtotal - booking.totalAmount);

    const partners = [...new Set([
      ...booking.items.map((item) => item.partnerName).filter((v): v is string => Boolean(v)),
      ...booking.packages.map((item) => item.partnerName).filter((v): v is string => Boolean(v)),
    ])];
    const paidPayment = booking.payments[0];
    const paidAmount = paidPayment?.amount ?? booking.totalAmount;
    const transactionReference = booking.razorpayPaymentId || paidPayment?.paymentId || null;
    const pdf = await createPaymentReceiptPdf({
      receiptNumber: receiptNumberForBooking(booking.id),
      bookingReference: `TG-${booking.id.slice(-8).toUpperCase()}`,
      receiptDate: booking.paidAt || paidPayment?.updatedAt || booking.updatedAt,
      patientName: booking.patient.name,
      age: booking.patient.age,
      gender: booking.patient.gender,
      doctorName: booking.doctorName,
      email: booking.patient.email,
      phone: booking.patient.phone,
      collectionMode: booking.mode,
      paymentMode: booking.paymentMode,
      paymentStatus: booking.paymentStatus,
      transactionReference,
      lines,
      subtotal,
      discount,
      total: booking.totalAmount,
      paidAmount,
      due: Math.max(0, booking.totalAmount - paidAmount),
      partners,
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TG-Labs-Payment-Receipt-${booking.id.slice(-8).toUpperCase()}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    const status = message === 'FIREBASE_PROJECT_NOT_CONFIGURED' ? 503 : 401;
    return NextResponse.json({ error: status === 503 ? 'Authentication service is not configured.' : 'Please sign in again.' }, { status });
  }
}
