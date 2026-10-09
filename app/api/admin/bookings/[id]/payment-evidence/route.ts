import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Read-only financial evidence review. No patient identifiers, gateway IDs,
// receipt line descriptions, or other personal information are returned.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true, totalAmount: true, paymentStatus: true, paymentMode: true,
        paymentReceiptSnapshot: true, updatedAt: true,
        payments: {
          select: { amount: true, status: true, currency: true, provider: true, source: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    const snapshot = booking.paymentReceiptSnapshot;
    const record = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? snapshot as Record<string, unknown> : null;
    const frozenTotal = record && typeof record.total === 'number' && Number.isSafeInteger(record.total)
      ? record.total : null;
    const paid = booking.payments.filter(p => p.status === 'PAID');
    const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);
    const snapshotMatchesBooking = frozenTotal !== null && frozenTotal === booking.totalAmount;
    const transactionsMatchSnapshot = frozenTotal !== null && paid.length > 0 && paidTotal === frozenTotal;
    const readyForManualReview = booking.paymentStatus === 'PAID'
      && snapshotMatchesBooking && transactionsMatchSnapshot;
    return NextResponse.json({
      bookingId: booking.id,
      paymentStatus: booking.paymentStatus,
      paymentMode: booking.paymentMode,
      bookingTotal: booking.totalAmount,
      frozenReceiptTotal: frozenTotal,
      paidTransactionTotal: paidTotal,
      paidTransactionCount: paid.length,
      paymentEvidence: booking.payments.map(p => ({
        amount: p.amount, status: p.status, currency: p.currency,
        provider: p.provider, source: p.source, createdAt: p.createdAt,
      })),
      updatedAt: booking.updatedAt,
      integrity: {
        snapshotMatchesBooking, transactionsMatchSnapshot, readyForManualReview,
      },
      nextAction: readyForManualReview
        ? 'Review actual collection evidence and obtain approval before creating a financial adjustment.'
        : 'Financial evidence mismatch or missing evidence: stop and investigate manually. Do not edit a paid booking.',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const auth = adminAuthError(error);
    if (auth.status !== 401 || (error instanceof Error && error.message.includes('ADMIN')))
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    console.error('Read-only paid booking evidence review failed', error);
    return NextResponse.json({ error: 'Unable to inspect payment evidence.' }, { status: 500 });
  }
}
