/** Manual UPI authorization policy. Pure and fail-closed; not wired to production routes. */
export type ManualUpiRole = 'OWNER' | 'ADMIN' | 'ACCOUNTS_STAFF' | 'TECHNICIAN';
export type ManualUpiAction = 'REVIEW_PAYMENT_EVIDENCE' | 'VERIFY_BANK_CREDIT' | 'APPROVE_DISCOUNT' | 'ISSUE_CORRECTED_RECEIPT';
export type VerifiedRoleAssignment = Readonly<{ uid: string; role: ManualUpiRole; active: boolean }>;
const permissions: Readonly<Record<ManualUpiAction, readonly ManualUpiRole[]>> = {
  REVIEW_PAYMENT_EVIDENCE: ['OWNER', 'ACCOUNTS_STAFF'],
  VERIFY_BANK_CREDIT: ['ACCOUNTS_STAFF'],
  APPROVE_DISCOUNT: ['OWNER'],
  ISSUE_CORRECTED_RECEIPT: [], // Disabled until atomic issuance is implemented and reviewed.
};
export function authorizeManualUpiAction(input: {
  authenticatedUid: string;
  assignment: VerifiedRoleAssignment | null;
  action: ManualUpiAction;
  requesterUid?: string;
  verifierUid?: string;
  approverUid?: string;
}): { allowed: boolean; blocker: string | null } {
  const { authenticatedUid, assignment, action, requesterUid, verifierUid, approverUid } = input;
  if (!authenticatedUid || !assignment || !assignment.active || assignment.uid !== authenticatedUid)
    return { allowed: false, blocker: 'TRUSTED_ROLE_REQUIRED' };
  if (!Object.prototype.hasOwnProperty.call(permissions, action) || !permissions[action].includes(assignment.role))
    return { allowed: false, blocker: 'ROLE_NOT_AUTHORIZED' };
  if (requesterUid && requesterUid === authenticatedUid)
    return { allowed: false, blocker: 'REQUESTER_CANNOT_REVIEW' };
  if (action === 'APPROVE_DISCOUNT' && (!verifierUid || verifierUid === authenticatedUid))
    return { allowed: false, blocker: 'INDEPENDENT_VERIFIER_REQUIRED' };
  if (action === 'VERIFY_BANK_CREDIT' && approverUid && approverUid === authenticatedUid)
    return { allowed: false, blocker: 'VERIFIER_CANNOT_APPROVE' };
  return { allowed: true, blocker: null };
}
