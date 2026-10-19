import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessBankCredit,
  type BankCreditVerificationRequest,
  type TrustedBankEvidenceSource,
  type VerifiedBankCredit,
} from '../lib/manual-upi-bank-evidence-adapter';

const hash = (char: string) => char.repeat(64);
const request: BankCreditVerificationRequest = {
  bookingId: 'booking-test',
  expectedReferenceHash: hash('a'),
  expectedReceivingAccountHash: hash('b'),
  expectedAmountPaise: 250000,
};
const verified: VerifiedBankCredit = {
  bookingId: request.bookingId,
  referenceHash: request.expectedReferenceHash,
  receivingAccountHash: request.expectedReceivingAccountHash,
  amountPaise: request.expectedAmountPaise,
  currency: 'INR',
  settled: true,
  source: 'BANK_RECONCILIATION',
  verifiedAt: '2026-10-10T11:00:00.000Z',
  immutableEvidenceDigest: hash('c'),
};
const source = (result: VerifiedBankCredit | null): TrustedBankEvidenceSource => ({
  async verifyCredit() { return result; },
});

test('accepts a structurally matching trusted-source response (not proof of actual settlement)', async () => {
  const result = await assessBankCredit(source(verified), request);
  assert.equal(result.eligible, true);
});

test('fails closed without a trusted source or with no matched credit', async () => {
  assert.deepEqual(await assessBankCredit(null, request), {
    eligible: false, blockers: ['TRUSTED_BANK_SOURCE_UNAVAILABLE'],
  });
  assert.deepEqual(await assessBankCredit(source(null), request), {
    eligible: false, blockers: ['BANK_CREDIT_NOT_VERIFIED'],
  });
});

test('rejects malformed expected hashes, amount and booking before consulting source', async () => {
  let calls = 0;
  const guarded: TrustedBankEvidenceSource = {
    async verifyCredit() { calls++; return verified; },
  };
  const result = await assessBankCredit(guarded, {
    bookingId: ' ',
    expectedReferenceHash: 'invalid',
    expectedReceivingAccountHash: 'invalid',
    expectedAmountPaise: 0,
  });
  assert.equal(result.eligible, false);
  if (!result.eligible) assert.deepEqual(result.blockers, [
    'BOOKING_REQUIRED', 'REFERENCE_HASH_INVALID', 'ACCOUNT_HASH_INVALID', 'AMOUNT_INVALID',
  ]);
  assert.equal(calls, 0);
});

test('rejects each mismatched binding independently', async () => {
  for (const [field, value, blocker] of [
    ['bookingId', 'other-booking', 'BOOKING_MISMATCH'],
    ['referenceHash', hash('d'), 'REFERENCE_MISMATCH'],
    ['receivingAccountHash', hash('e'), 'ACCOUNT_MISMATCH'],
    ['amountPaise', 528000, 'AMOUNT_MISMATCH'],
  ] as const) {
    const result = await assessBankCredit(source({ ...verified, [field]: value }), request);
    assert.equal(result.eligible, false, field);
    if (!result.eligible) assert.ok(result.blockers.includes(blocker), field);
  }
});

test('rejects unconfirmed settlement, untrusted source and non-INR currency', async () => {
  for (const altered of [
    { settled: false },
    { source: 'SCREENSHOT' },
    { currency: 'USD' },
  ]) {
    const result = await assessBankCredit(
      source({ ...verified, ...altered } as VerifiedBankCredit), request,
    );
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.ok(result.blockers.includes('SETTLEMENT_NOT_TRUSTED'));
  }
});

test('rejects future or invalid verification times and malformed evidence digest', async () => {
  for (const [altered, blocker] of [
    [{ verifiedAt: 'not-a-date' }, 'VERIFICATION_TIMESTAMP_INVALID'],
    [{ verifiedAt: '2999-01-01T00:00:00.000Z' }, 'VERIFICATION_TIMESTAMP_INVALID'],
    [{ immutableEvidenceDigest: 'invalid' }, 'EVIDENCE_DIGEST_INVALID'],
  ] as const) {
    const result = await assessBankCredit(source({ ...verified, ...altered }), request);
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.ok(result.blockers.includes(blocker));
  }
});

test('fails closed when trusted adapter throws', async () => {
  const failing: TrustedBankEvidenceSource = {
    async verifyCredit() { throw new Error('provider unavailable'); },
  };
  assert.deepEqual(await assessBankCredit(failing, request), {
    eligible: false, blockers: ['TRUSTED_BANK_SOURCE_FAILED'],
  });
});
