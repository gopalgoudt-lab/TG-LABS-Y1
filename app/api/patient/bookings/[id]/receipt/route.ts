import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { createPaymentReceiptPdf, isReceiptAvailable, receiptNumberForBooking } from '@/lib/payment-receipt';
import { receiptPartners, reconcilePaidReceipt } from '@/lib/receipt-reconciliation';
import { manualPatientReceipt } from '@/lib/manual-patient-metadata';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const { id } = await params;
    const booking = await prisma.booking.findFirst({
      where: { id, patient: { phone: identity.databasePhone } },
      include: {
        patient: true,
        items: { include: { test: true, offer: { include: { partner: true } } } },
        packages: { include: { package: true, offer: { include: { partner: true } } } },
        payments: { where: { status: 'PAID' }, orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (!isReceiptAvailable(booking.paymentStatus)) {
      return NextResponse.json({ error: 'Payment receipt is available after payment is marked PAID.' }, { status: 409 });
    }

    const manual = manualPatientReceipt(booking.createdByAdmin, booking.adminNotes);
    const baseLines = manual ? [
      { name: manual.tests.length ? `Thyrocare investigations (${manual.tests.length})` : 'Thyrocare investigations', amount: manual.testAmount },
      ...(manual.homeCollectionCharge > 0 ? [{ name: 'Home Collection Charges', amount: manual.homeCollectionCharge }] : []),
    ] : [
      ...booking.items.map((item) => ({ name: item.test.name, amount: item.price })),
      ...booking.packages.map((item) => ({ name: item.package.name, amount: item.price })),
      ...(booking.homeCollectionCharge > 0 ? [{ name: 'Home Collection Charges', amount: booking.homeCollectionCharge }] : []),
    ...(booking.printedReportFee > 0 ? [{ name: 'Printed report service', amount: booking.printedReportFee }] : []),
    ];
    const baseSubtotal = baseLines.reduce((sum, line) => sum + line.amount, 0);
    const authoritativeTotal = manual ? manual.total : booking.totalAmount;
    const positiveAdjustment = Math.max(0, authoritativeTotal - baseSubtotal);
    const lines = positiveAdjustment > 0
      ? [...baseLines, { name: 'Recorded booking adjustment', amount: positiveAdjustment }]
      : baseLines;
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = manual ? manual.discount : Math.max(0, subtotal - booking.totalAmount);

    const partnerIds = [...new Set([...booking.items, ...booking.packages].map((item) => item.partnerId).filter((v): v is string => Boolean(v)))];
  const partnerRows = partnerIds.length ? await prisma.diagnosticPartner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true } }) : [];
  const partnerNamesById = new Map(partnerRows.map((partner) => [partner.id, partner.name]));
  const unresolvedItems = booking.items.filter((item) => !item.offer?.partner?.name && (!item.partnerId || !partnerNamesById.has(item.partnerId)));
  const catalogFallbacks = new Map<string, string>();
  for (const item of unresolvedItems) {
    const matches = await prisma.testPartnerOffer.findMany({
      where: { testId: item.testId, price: item.price, active: true, availability: 'AVAILABLE' },
      select: { partner: { select: { name: true } } },
    });
    const names = [...new Set(matches.map((match) => match.partner.name))];
    if (names.length === 1) catalogFallbacks.set(item.id, names[0]);
  }
  const receiptItems = booking.items.map((item) => catalogFallbacks.has(item.id) ? { ...item, partnerName: catalogFallbacks.get(item.id)! } : item);
  const partners = receiptPartners(receiptItems, booking.packages, partnerNamesById);
    const paidPayment = booking.payments[0];
  const { total: receiptTotal, paidAmount, due } = manual ? { total: manual.total, paidAmount: manual.paidAmount, due: manual.balance } : reconcilePaidReceipt(booking.totalAmount, subtotal, paidPayment?.amount);
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
      paymentMode: manual?.paymentMode || booking.paymentMode,
      paymentStatus: booking.paymentStatus,
      transactionReference,
      lines,
      subtotal,
      discount,
      showDiscount: discount > 0,
      total: receiptTotal,
      paidAmount,
      due,
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
