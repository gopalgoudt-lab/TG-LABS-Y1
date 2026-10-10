import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { checkManualUpiIssuanceReadiness, type TrustedManualUpiEvidenceProvider } from '../lib/manual-upi-approval-issuance-readiness';

const snapshot = { total: 5280, lines: [{ name: 'Test', amount: 5280 }] };
const hash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const booking = { paymentStatus: 'PAID', totalAmount: 5280, paymentReceiptSnapshot: snapshot };
function db(record: unknown = booking): PrismaClient {
  return { booking: { findUnique: async () => record } } as unknown as PrismaClient;
}
function provider(overrides: Record<string, unknown> = {}): TrustedManualUpiEvidenceProvider {
  return { verify: async () => ({
    evidence: {
      requestedByUid: 'requester', verifiedByUid: 'verifier', approvedByUid: 'approver',
      paymentReferenceHash: 'phonepe-hash', bankCreditEvidenceReference: 'bank-credit-ref',
      originalReceiptEvidenceReference: hash, reason: 'Verified discrepancy',
      approvalRecordedAt: '2026-10-10T10:00:00.000Z',
    },
    authenticatedReviewerUid: 'approver', reviewerAuthorized: true,
    bankCreditConfirmedFromTrustedSource: true,
    phonePeReferenceConfirmedFromTrustedSource: true,
    discountAuthorizedFromTrustedSource: true,
    receiptHashMatchesFrozenSnapshot: true,
    existingPaymentRecordsReviewed: true,
    ...overrides,
  }) as ReturnType<TrustedManualUpiEvidenceProvider['verify']> };
}
test('missing booking ID and provider fail closed without database access', async () => {
  assert.deepEqual((await checkManualUpiIssuanceReadiness(db(), '', provider())).blockers, ['BOOKING_ID_REQUIRED']);
  assert.deepEqual((await checkManualUpiIssuanceReadiness(db(), 'booking', null)).blockers, ['TRUSTED_EVIDENCE_PROVIDER_UNAVAILABLE']);
});
test('unpaid, missing and mismatched frozen receipts are rejected', async () => {
  for (const record of [null, { ...booking, paymentStatus: 'PENDING' }, { ...booking, paymentReceiptSnapshot: null }]) {
    assert.deepEqual((await checkManualUpiIssuanceReadiness(db(record), 'booking', provider())).blockers, ['FROZEN_PAID_BOOKING_REQUIRED']);
  }
  const mismatch = { ...booking, paymentReceiptSnapshot: { total: 2500 } };
  assert.deepEqual((await checkManualUpiIssuanceReadiness(db(mismatch), 'booking', provider())).blockers, ['FROZEN_RECEIPT_TOTAL_MISMATCH']);
});
test('trusted independent evidence is required and snapshot remains unchanged', async () => {
  const before = JSON.stringify(snapshot);
  const valid = await checkManualUpiIssuanceReadiness(db(), 'booking', provider());
  assert.equal(valid.eligible, true);
  assert.equal(valid.originalReceiptHash, hash);
  assert.equal(JSON.stringify(snapshot), before);
  const wrong = provider();
  const rejected = await checkManualUpiIssuanceReadiness(db(), 'booking', {
    verify: async args => ({ ...(await wrong.verify(args)), evidence: { ...(await wrong.verify(args)).evidence, originalReceiptEvidenceReference: 'wrong' } }),
  });
  assert.deepEqual(rejected.blockers, ['RECEIPT_EVIDENCE_MISMATCH']);
  assert.equal((await checkManualUpiIssuanceReadiness(db(), 'booking', provider({ bankCreditConfirmedFromTrustedSource: false }))).eligible, false);
});
test('provider exceptions fail closed and do not leak exception messages', async () => {
  const result = await checkManualUpiIssuanceReadiness(db(), 'booking', { verify: async () => { throw new Error('secret bank data'); } });
  assert.deepEqual(result.blockers, ['TRUSTED_EVIDENCE_VERIFICATION_FAILED']);
  assert.equal(JSON.stringify(result).includes('secret bank data'), false);
});
