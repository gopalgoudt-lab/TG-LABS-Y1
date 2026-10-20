import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessManualStatementReview, type ManualStatementReview } from '../lib/manual-upi-manual-statement-review';

const hash = 'a'.repeat(64);
const account = 'b'.repeat(64);
const evidence = 'c'.repeat(64);
const valid: ManualStatementReview = {
  bookingId: 'booking-test', requesterUid: 'requester', verifierUid: 'accounts',
  approverUid: 'owner',
  verifierAssignment: { uid: 'accounts', role: 'ACCOUNTS_STAFF', active: true },
  referenceHash: hash, expectedReferenceHash: hash,
  receivingAccountHash: account, expectedReceivingAccountHash: account,
  amountPaise: 250000, expectedAmountPaise: 250000, currency: 'INR',
  creditPosted: true, independentlyInspected: true, referenceAlreadyUsed: false,
  bankStatementPeriodStart: '2026-10-01', bankStatementPeriodEnd: '2026-10-19',
  creditDate: '2026-10-10', immutableStatementDigest: evidence,
  evidenceStorageReference: 'secure://synthetic-test-only',
};
test('valid independent statement review is eligible only for further review', () => {
  assert.deepEqual(assessManualStatementReview(valid), { eligibleForFurtherReview: true, blockers: [] });
});
const cases: Array<[string, Partial<ManualStatementReview>, string]> = [
  ['self-verification', { verifierUid: 'requester', verifierAssignment: { uid: 'requester', role: 'ACCOUNTS_STAFF', active: true } }, 'REQUESTER_CANNOT_REVIEW'],
  ['owner as verifier', { verifierAssignment: { uid: 'accounts', role: 'OWNER', active: true } }, 'ROLE_NOT_AUTHORIZED'],
  ['wrong amount', { amountPaise: 2500 }, 'BANK_AMOUNT_MISMATCH'],
  ['wrong reference', { referenceHash: 'd'.repeat(64) }, 'REFERENCE_MISMATCH'],
  ['wrong beneficiary', { receivingAccountHash: 'd'.repeat(64) }, 'RECEIVING_ACCOUNT_MISMATCH'],
  ['no bank credit', { creditPosted: false }, 'BANK_CREDIT_NOT_INDEPENDENTLY_CONFIRMED'],
  ['uninspected statement', { independentlyInspected: false }, 'BANK_CREDIT_NOT_INDEPENDENTLY_CONFIRMED'],
  ['duplicate reference', { referenceAlreadyUsed: true }, 'BANK_REFERENCE_ALREADY_USED'],
  ['missing evidence', { evidenceStorageReference: '' }, 'IMMUTABLE_EVIDENCE_REQUIRED'],
  ['credit outside period', { creditDate: '2026-09-01' }, 'BANK_STATEMENT_DATES_INVALID'],
];
for (const [name, patch, blocker] of cases) {
  test(name, () => assert.ok(assessManualStatementReview({ ...valid, ...patch }).blockers.includes(blocker)));
}
