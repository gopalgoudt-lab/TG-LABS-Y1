/** Bank review deployment controls.
 * These are documentation-grade gates, not permission to write.
 * Only a separately reviewed release may install a vault and activate a
 * transaction writer. There is deliberately no bypass environment flag.
 */
export const BANK_REVIEW_RELEASE_GATES = [
  'VERIFIED_FIREBASE_ACCOUNTS_STAFF_SESSION',
  'ACTIVE_DATABASE_ACCOUNTS_STAFF_ASSIGNMENT',
  'INDEPENDENT_REQUESTER_VERIFIER_OWNER',
  'BANK_ISSUED_SETTLED_CREDIT_CONFIRMED',
  'PRIVATE_ENCRYPTED_MALWARE_SCANNED_EVIDENCE',
  'EVIDENCE_ACCESS_AUDIT_AND_RETENTION',
  'FROZEN_ORIGINAL_RECEIPT_HASH_MATCH',
  'ATOMIC_UNIQUE_PAYMENT_REFERENCE_HMAC',
  'SERIALIZABLE_VERIFICATION_AND_IMMUTABLE_AUDIT',
  'ISOLATED_POSTGRES_CONCURRENCY_AND_ROLLBACK_TESTS',
  'SEPARATE_OWNER_APPROVAL_AFTER_VERIFICATION',
] as const;

export function bankReviewReleaseReadiness(): {
  enabled: false;
  blockers: readonly string[];
} {
  return {
    enabled: false,
    blockers: [
      'REAL_VAULT_PROVIDER_NOT_SECURITY_REVIEWED',
      'TRUSTED_BANK_RECONCILIATION_NOT_CONNECTED',
      'AUDITED_TRANSACTION_WRITER_NOT_APPROVED',
      'PRODUCTION_FINANCIAL_WRITES_PROHIBITED',
    ],
  };
}
