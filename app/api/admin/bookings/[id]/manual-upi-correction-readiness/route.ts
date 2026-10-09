import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Read-only safety gate. Never changes a paid booking or receipt.
// Verification of owner PhonePe credit and discount approval must occur outside this endpoint.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, totalAmount: true, paymentReceiptSnapshot: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    const frozen = booking.paymentReceiptSnapshot;
    const record = frozen && typeof frozen === 'object' && !Array.isArray(frozen)
      ? frozen as Record<string, unknown> : null;
    const originalReceiptTotal = record && typeof record.total === 'number' && Number.isSafeInteger(record.total)
      ? record.total : null;
    return NextResponse.json({
      bookingId: booking.id,
      paymentStatus: booking.paymentStatus,
      currentBookingTotal: booking.totalAmount,
      originalReceiptTotal,
      correctionAvailable: false,
      requiredActions: [
        'Verify PhonePe receipt against beneficiary bank credit',
        'Obtain documented discount approval',
        'Review existing paid transactions and frozen receipt',
        'Implement audited, idempotent adjustment and versioned corrected receipt',
      ],
      warning: 'Read-only review. No correction or receipt issuance is authorized by this response.',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('ADMIN') || error.message === 'UNAUTHENTICATED')) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('Manual UPI correction readiness review failed', error);
    return NextResponse.json({ error: 'Unable to review correction readiness.' }, { status: 500 });
  }
}
