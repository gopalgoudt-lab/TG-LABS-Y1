import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';
import { assessManualUpiCorrectionPreflight } from '@/lib/manual-upi-correction-preflight';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

// PREPARATION ONLY. An authenticated caller cannot certify their own PhonePe bank
// evidence or discount approval. A future trusted reviewer service must supply
// server-verified attestations before any financial write is introduced.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await adminFromRequest(request);
  } catch (error) {
    const auth = adminAuthError(error);
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  }
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers });
    const data = body as Record<string, unknown>;
    // Do not accept client-supplied approval/verification booleans as evidence.
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, totalAmount: true, paymentReceiptSnapshot: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404, headers });
    if (booking.paymentStatus !== 'PAID')
      return NextResponse.json({ error: 'Only paid bookings qualify for review.' }, { status: 409, headers });
    const snapshot = booking.paymentReceiptSnapshot;
    const record = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? snapshot as Record<string, unknown> : null;
    const frozenTotal = record?.total;
    if (typeof frozenTotal !== 'number' || !Number.isSafeInteger(frozenTotal) || frozenTotal !== booking.totalAmount)
      return NextResponse.json({ error: 'Frozen receipt evidence requires manual incident review.' }, { status: 409, headers });
    const amounts = {
      originalGrossAmount: booking.totalAmount,
      discountAmount: data.discountAmount,
      correctedNetAmount: data.correctedNetAmount,
      verifiedPaidAmount: data.verifiedPaidAmount,
    };
    const validAmounts = Object.values(amounts).every(value => typeof value === 'number' && Number.isSafeInteger(value));
    if (!validAmounts) return NextResponse.json({ error: 'Whole-rupee amounts required.' }, { status: 400, headers });
    const assessment = assessManualUpiCorrectionPreflight({
      amounts: amounts as { originalGrossAmount: number; discountAmount: number; correctedNetAmount: number; verifiedPaidAmount: number },
      originalReceiptId: typeof data.originalReceiptId === 'string' ? data.originalReceiptId : '',
      phonePeEvidenceVerified: false,
      bankCreditVerified: false,
      discountApproved: false,
      existingPaymentRecordsReviewed: false,
      originalReceiptPreserved: false,
    });
    return NextResponse.json({
      bookingId: booking.id,
      reviewedBy: admin.uid,
      amountsValid: !assessment.blockers.includes('INVALID_AMOUNTS'),
      blockers: assessment.blockers,
      status: 'AWAITING_INDEPENDENT_VERIFICATION',
      correctionApplied: false,
      receiptIssued: false,
      message: 'A verified reviewer attestation and atomic correction workflow are required. This endpoint never writes financial records.',
    }, { status: 409, headers });
  } catch (error) {
    console.error('Manual UPI correction preparation failed', error);
    return NextResponse.json({ error: 'Unable to prepare correction review.' }, { status: 500, headers });
  }
}
