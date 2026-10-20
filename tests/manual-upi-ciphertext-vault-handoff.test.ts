import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { prepareBankStatementForPrivateVault } from '../lib/manual-upi-bank-statement-vault-preparation';
import { prepareCiphertextVaultPayload, assessCiphertextVaultActivation } from '../lib/manual-upi-ciphertext-vault-handoff';

const prepared = prepareBankStatementForPrivateVault({
  bookingId: 'synthetic-booking',
  originalReceiptHash: 'a'.repeat(64),
  verifiedServerSidePdfBytes: Buffer.from('%PDF-1.7\nSYNTHETIC TEST ONLY'),
  managedEncryptionKey: randomBytes(32),
});
test('vault handoff contains ciphertext only and digest', () => {
  const result = prepareCiphertextVaultPayload(prepared, 'accounts-staff-1');
  assert.match(result.ciphertextSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.ciphertextJson.includes('SYNTHETIC TEST ONLY'), false);
  assert.equal(result.authenticatedVerifierUid, 'accounts-staff-1');
});
test('missing authenticated verifier fails closed', () => {
  assert.throws(() => prepareCiphertextVaultPayload(prepared, '  '), /VERIFIER_REQUIRED/);
});
test('provider object cannot activate unreviewed storage', () => {
  const result = assessCiphertextVaultActivation({
    providerId: 'unreviewed-provider',
    putEncryptedStatement: async () => ({ objectKey: 'fake', ciphertextSha256: 'a'.repeat(64) }),
  });
  assert.equal(result.enabled, false);
  assert.ok(result.blockers.includes('FINANCIAL_WRITES_DISABLED'));
});
