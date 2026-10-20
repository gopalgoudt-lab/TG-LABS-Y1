/** Read-only planning contract for a manual bank statement review.
 * This does NOT persist evidence or approval, and MUST NOT be treated as a
 * trusted bank reconciliation source. Authenticated staff identity and role
 * must be resolved server-side before this contract is used.
 */
import { assessManualStatementReview, type ManualStatementReview } from './manual-upi-manual-statement-review';

export type ManualStatementReviewPlan = Readonly<{
  readyForEvidenceRecording: false;
  blockers: readonly string[];
  requires: readonly string[];
}>;

/** Always fail closed until an encrypted evidence vault, immutable database
 * record, atomic reference uniqueness, and authenticated review endpoint exist.
 */
export function planManualStatementReview(review: ManualStatementReview): ManualStatementReviewPlan {
  const assessment = assessManualStatementReview(review);
  return {
    readyForEvidenceRecording: false,
    blockers: [...assessment.blockers, 'SECURE_EVIDENCE_PERSISTENCE_NOT_IMPLEMENTED'],
    requires: [
      'SERVER_VERIFIED_FIREBASE_UID_AND_ACTIVE_ACCOUNTS_STAFF_ASSIGNMENT',
      'PRIVATE_ENCRYPTED_EVIDENCE_STORAGE_WITH_RETENTION_AND_ACCESS_LOGS',
      'SERVER_SIDE_STATEMENT_INSPECTION_AND_BANK_CREDIT_RECONCILIATION',
      'ATOMIC_UNIQUE_UPI_REFERENCE_RESERVATION',
      'IMMUTABLE_BOOKING_AND_RECEIPT_BOUND_VERIFICATION_AUDIT',
      'INDEPENDENT_OWNER_DISCOUNT_APPROVAL',
    ],
  };
}
