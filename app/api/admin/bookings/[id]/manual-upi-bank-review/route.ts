import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';
import { lookupManualUpiRole } from '@/lib/manual-upi-role-registry';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/** Accounts Staff read-only gate. Never accepts uploaded statements, client
 * verification flags or UIDs; never creates evidence, approvals or adjustments.
 * Requires an actual Firebase ID token and a current active database role.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try {
    uid = (await verifyFirebasePatientRequest(request)).uid;
  } catch {
    return NextResponse.json({ error: 'Firebase authentication required.' }, { status: 401, headers });
  }
  try {
    const assignment = await lookupManualUpiRole(prisma, uid);
    if (!assignment.authorized || assignment.role !== 'ACCOUNTS_STAFF')
      return NextResponse.json({ error: 'Active Accounts Staff authorization required.' }, { status: 403, headers });
    const { id } = await params;
    if (!id?.trim()) return NextResponse.json({ error: 'Booking required.' }, { status: 400, headers });
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, paymentReceiptSnapshot: true, totalAmount: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404, headers });
    const snapshot = booking.paymentReceiptSnapshot;
    const receipt = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? snapshot as Record<string, unknown> : null;
    const frozenReceiptValid = booking.paymentStatus === 'PAID' &&
      Number.isSafeInteger(booking.totalAmount) &&
      receipt?.total === booking.totalAmount;
    return NextResponse.json({
      bookingId: booking.id,
      frozenReceiptValid,
      status: 'EVIDENCE_RECORDING_DISABLED',
      canRecordVerification: false,
      canApproveDiscount: false,
      canIssueReceipt: false,
      blockers: [
        ...(frozenReceiptValid ? [] : ['FROZEN_PAID_RECEIPT_REQUIRED']),
        'ENCRYPTED_EVIDENCE_STORAGE_NOT_IMPLEMENTED',
        'IMMUTABLE_VERIFICATION_TRANSACTION_NOT_IMPLEMENTED',
      ],
      message: 'Read-only staff readiness check. Independent bank verification is not recorded here.',
    }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to assess staff verification readiness.' }, { status: 503, headers });
  }
}
