/**
 * Manual bank reconciliation policy. Pure validation only: no bank connection,
 * identity authentication, approval issuance, or financial writes.
 * All fields MUST originate from authenticated server-side records.
 */
export type ManualReconciliationReview = Readonly<{
  requestedByUid: string;
  verifiedByUid: string;
  approvedByUid: string;
  verifierAuthorized: boolean;
  approverAuthorized: boolean;
  bankStatementReconciled: boolean;
  bankCreditReferenceMatched: boolean;
  receivingAccountMatched: boolean;
  collectionAccountType: 'BUSINESS' | 'PERSONAL' | 'UNKNOWN';
  personalAccountCollectionAuthorizationRecorded: boolean;
  discountRequestedPaise: number;
  discountExplicitlyAuthorized: boolean;
}>;

export function assessManualReconciliationReview(input: ManualReconciliationReview) {
  const blockers: string[] = [];
  const ids = [input.requestedByUid, input.verifiedByUid, input.approvedByUid];
  if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== 3)
    blockers.push('INDEPENDENT_STAFF_REQUIRED');
  if (input.verifierAuthorized !== true) blockers.push('VERIFIER_NOT_AUTHORIZED');
  if (input.approverAuthorized !== true) blockers.push('APPROVER_NOT_AUTHORIZED');
  if (input.bankStatementReconciled !== true) blockers.push('BANK_STATEMENT_NOT_RECONCILED');
  if (input.bankCreditReferenceMatched !== true) blockers.push('BANK_REFERENCE_NOT_MATCHED');
  if (input.receivingAccountMatched !== true) blockers.push('RECEIVING_ACCOUNT_NOT_MATCHED');
  if (input.collectionAccountType === 'UNKNOWN' ||
      !['BUSINESS', 'PERSONAL'].includes(input.collectionAccountType))
    blockers.push('COLLECTION_ACCOUNT_TYPE_UNKNOWN');
  if (input.collectionAccountType === 'PERSONAL' &&
      input.personalAccountCollectionAuthorizationRecorded !== true)
    blockers.push('PERSONAL_ACCOUNT_AUTHORIZATION_REQUIRED');
  if (!Number.isSafeInteger(input.discountRequestedPaise) || input.discountRequestedPaise < 0)
    blockers.push('INVALID_DISCOUNT');
  else if (input.discountRequestedPaise > 0 && input.discountExplicitlyAuthorized !== true)
    blockers.push('DISCOUNT_APPROVAL_REQUIRED');
  return { eligible: blockers.length === 0, blockers };
}
