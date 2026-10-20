import type { PrismaClient } from '@prisma/client';

/**
 * Internal bank-review writer, NOT connected to any HTTP route.
 * Financial booking fields, approval rows and receipts are never updated.
 * Caller must supply evidence from a reviewed vault and independently verified
 * bank credit; neither can be asserted by browser input.
 *
 * Deliberately disabled until the vault, role enforcement and audit mechanism
 * are reviewed. No environment flag can bypass this gate.
 */
export async function recordIndependentBankReview(
  _db: PrismaClient,
  _input: Readonly<{
    bookingId: string;
    authenticatedVerifierUid: string;
    requesterUid: string;
    approverUid: string;
    originalReceiptHash: string;
    paymentReferenceHmac: string;
    verifiedAmountPaise: number;
    privateEvidenceObjectKey: string;
  }>,
): Promise<never> {
  throw new Error('BANK_REVIEW_PERSISTENCE_DISABLED_PENDING_SECURITY_REVIEW');
}

/** Pure identity separation check; the authenticated role and frozen receipt
 * must additionally be revalidated within the eventual database transaction.
 */
export function assessIndependentBankReviewActors(
  requesterUid: string,
  verifierUid: string,
  approverUid: string,
): { eligible: boolean; blockers: string[] } {
  const identities = [requesterUid, verifierUid, approverUid];
  const blockers: string[] = [];
  if (identities.some(uid => typeof uid !== 'string' || !uid.trim() || uid !== uid.trim()))
    blockers.push('INVALID_ACTOR_IDENTITY');
  if (new Set(identities).size !== 3)
    blockers.push('INDEPENDENT_THREE_ACTOR_REVIEW_REQUIRED');
  return { eligible: blockers.length === 0, blockers };
}
