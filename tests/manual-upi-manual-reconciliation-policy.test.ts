import assert from 'node:assert/strict';
import test from 'node:test';
import { assessManualReconciliationReview, type ManualReconciliationReview } from '../lib/manual-upi-manual-reconciliation-policy';

const valid: ManualReconciliationReview = {
  requestedByUid: 'requester', verifiedByUid: 'verifier', approvedByUid: 'approver',
  verifierAuthorized: true, approverAuthorized: true,
  bankStatementReconciled: true, bankCreditReferenceMatched: true,
  receivingAccountMatched: true, collectionAccountType: 'BUSINESS',
  personalAccountCollectionAuthorizationRecorded: false,
  discountRequestedPaise: 0, discountExplicitlyAuthorized: false,
};
test('accepts independently reconciled business collection without discount', () => {
  assert.deepEqual(assessManualReconciliationReview(valid), { eligible: true, blockers: [] });
});
test('blocks same-person verification or approval', () => {
  for (const patch of [{ verifiedByUid: 'requester' }, { approvedByUid: 'verifier' }, { approvedByUid: '' }]) {
    assert.ok(assessManualReconciliationReview({ ...valid, ...patch }).blockers.includes('INDEPENDENT_STAFF_REQUIRED'));
  }
});
test('personal collection requires recorded business authorization', () => {
  const personal = { ...valid, collectionAccountType: 'PERSONAL' as const };
  assert.ok(assessManualReconciliationReview(personal).blockers.includes('PERSONAL_ACCOUNT_AUTHORIZATION_REQUIRED'));
  assert.equal(assessManualReconciliationReview({ ...personal, personalAccountCollectionAuthorizationRecorded: true }).eligible, true);
});
test('discount is never automatic', () => {
  assert.ok(assessManualReconciliationReview({ ...valid, discountRequestedPaise: 278000 }).blockers.includes('DISCOUNT_APPROVAL_REQUIRED'));
  assert.equal(assessManualReconciliationReview({ ...valid, discountRequestedPaise: 278000, discountExplicitlyAuthorized: true }).eligible, true);
});
test('unverified bank evidence and unauthorized staff fail closed', () => {
  for (const patch of [
    { verifierAuthorized: false }, { approverAuthorized: false },
    { bankStatementReconciled: false }, { bankCreditReferenceMatched: false },
    { receivingAccountMatched: false }, { collectionAccountType: 'UNKNOWN' as const },
    { discountRequestedPaise: -1 },
  ]) assert.equal(assessManualReconciliationReview({ ...valid, ...patch }).eligible, false);
});
