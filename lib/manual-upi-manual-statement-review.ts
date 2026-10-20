/** Manual bank statement verification policy — PURE, READ-ONLY, FAIL CLOSED.
 * This module does not authenticate staff, store bank statements, issue approvals,
 * modify bookings, or enable financial writes. Only a server-side authenticated
 * workflow may call it with independently inspected evidence.
 */
import { authorizeManualUpiAction, type VerifiedRoleAssignment } from './manual-upi-role-policy';

export type ManualStatementReview = Readonly<{
  bookingId: string;
  requesterUid: string;
  verifierUid: string;
  approverUid: string;
  verifierAssignment: VerifiedRoleAssignment | null;
  referenceHash: string;
  receivingAccountHash: string;
  expectedReferenceHash: string;
  expectedReceivingAccountHash: string;
  amountPaise: number;
  expectedAmountPaise: number;
  currency: string;
  creditPosted: boolean;
  bankStatementPeriodStart: string;
  bankStatementPeriodEnd: string;
  creditDate: string;
  immutableStatementDigest: string;
  evidenceStorageReference: string;
  independentlyInspected: boolean;
  referenceAlreadyUsed: boolean;
}>;

const digest = /^[a-f0-9]{64}$/i;
export function assessManualStatementReview(r: ManualStatementReview): {
  eligibleForFurtherReview: boolean; blockers: string[];
} {
  const blockers: string[] = [];
  const role = authorizeManualUpiAction({
    authenticatedUid: r.verifierUid, assignment: r.verifierAssignment,
    action: 'VERIFY_BANK_CREDIT', requesterUid: r.requesterUid, approverUid: r.approverUid,
  });
  if (!role.allowed) blockers.push(role.blocker ?? 'ROLE_NOT_AUTHORIZED');
  if (!r.bookingId?.trim() || !r.requesterUid?.trim() || !r.approverUid?.trim() ||
      new Set([r.requesterUid, r.verifierUid, r.approverUid]).size !== 3)
    blockers.push('THREE_DISTINCT_ACTORS_REQUIRED');
  if (!digest.test(r.referenceHash) || r.referenceHash !== r.expectedReferenceHash)
    blockers.push('REFERENCE_MISMATCH');
  if (!digest.test(r.receivingAccountHash) ||
      r.receivingAccountHash !== r.expectedReceivingAccountHash)
    blockers.push('RECEIVING_ACCOUNT_MISMATCH');
  if (!Number.isSafeInteger(r.amountPaise) || r.amountPaise <= 0 ||
      r.amountPaise !== r.expectedAmountPaise || r.currency !== 'INR')
    blockers.push('BANK_AMOUNT_MISMATCH');
  if (!r.creditPosted || !r.independentlyInspected)
    blockers.push('BANK_CREDIT_NOT_INDEPENDENTLY_CONFIRMED');
  if (r.referenceAlreadyUsed) blockers.push('BANK_REFERENCE_ALREADY_USED');
  if (!digest.test(r.immutableStatementDigest) || !r.evidenceStorageReference?.trim())
    blockers.push('IMMUTABLE_EVIDENCE_REQUIRED');
  const start = Date.parse(r.bankStatementPeriodStart);
  const end = Date.parse(r.bankStatementPeriodEnd);
  const credit = Date.parse(r.creditDate);
  if (![start, end, credit].every(Number.isFinite) || start > credit || credit > end ||
      end > Date.now()) blockers.push('BANK_STATEMENT_DATES_INVALID');
  return { eligibleForFurtherReview: blockers.length === 0, blockers };
}
