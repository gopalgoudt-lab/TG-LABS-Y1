import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessBankCredit, type TrustedBankEvidenceSource, type VerifiedBankCredit,
} from '../lib/manual-upi-bank-evidence-adapter';

const hash = (letter: string) => letter.repeat(64);
const request = {
  bookingId: 'booking-1', expectedReferenceHash: hash('a'),
  expectedReceivingAccountHash: hash('b'), expectedAmountPaise: 250000,
};
const evidence: VerifiedBankCredit = {
  bookingId: 'booking-1', referenceHash: hash('a'), receivingAccountHash: hash('b'),
  amountPaise: 250000, currency: 'INR', settled: true,
  source: 'BANK_RECONCILIATION', verifiedAt: '2026-10-10T10:00:00.000Z',
  immutableEvidenceDigest: hash('c'),
};
const provider = (value: VerifiedBankCredit | null): TrustedBankEvidenceSource => ({
  verifyCredit: async () => value,
});

test('fails closed without a trusted provider', async () => {
  assert.deepEqual(await assessBankCredit(null, request), {
    eligible: false, blockers: ['TRUSTED_BANK_SOURCE_UNAVAILABLE'],
  });
});
test('accepts structurally consistent trusted-provider evidence', async () => {
  assert.equal((await assessBankCredit(provider(evidence), request)).eligible, true);
});
test('rejects mismatched booking, reference, account, amount and untrusted settlement', async () => {
  for (const mutation of [
    { bookingId: 'other' }, { referenceHash: hash('d') },
    { receivingAccountHash: hash('e') }, { amountPaise: 528000 },
    { settled: false }, { source: 'SCREENSHOT' }, { currency: 'USD' },
    { immutableEvidenceDigest: 'invalid' },
  ]) {
    assert.equal((await assessBankCredit(provider({ ...evidence, ...mutation } as VerifiedBankCredit), request)).eligible, false);
  }
});
test('rejects invalid request before provider is called', async () => {
  let called = false;
  const source: TrustedBankEvidenceSource = { verifyCredit: async () => { called = true; return evidence; } };
  assert.equal((await assessBankCredit(source, { ...request, expectedAmountPaise: -1 })).eligible, false);
  assert.equal(called, false);
});
test('provider exceptions fail closed without exposing details', async () => {
  const source: TrustedBankEvidenceSource = { verifyCredit: async () => { throw new Error('secret bank data'); } };
  assert.deepEqual(await assessBankCredit(source, request), {
    eligible: false, blockers: ['TRUSTED_BANK_SOURCE_FAILED'],
  });
});
