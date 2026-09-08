import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPaymentReceiptPdf, isReceiptAvailable, receiptNumberForBooking } from '@/lib/payment-receipt';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
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

  const lines = [
    ...booking.items.map((item) => ({ name: item.test.name, amount: item.price })),
    ...booking.packages.map((item) => ({ name: item.package.name, amount: item.price })),
    ...(booking.printedReportFee > 0 ? [{ name: 'Printed report service', amount: booking.printedReportFee }] : []),
  ];
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const partners = [...new Set([
    ...booking.items.map((item) => item.partnerName).filter((v): v is string => Boolean(v)),
    ...booking.packages.map((item) => item.partnerName).filter((v): v is string => Boolean(v)),
  ])];
  const paidPayment = booking.payments[0];
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
    transactionReference: booking.razorpayPaymentId || paidPayment?.paymentId || null,
    lines,
    subtotal,
    discount: Math.max(0, subtotal - booking.totalAmount),
    total: booking.totalAmount,
    paidAmount: booking.totalAmount,
    due: 0,
    partners,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TG-Labs-Payment-Receipt-${booking.id.slice(-8).toUpperCase()}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
