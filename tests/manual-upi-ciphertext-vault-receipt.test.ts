import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateCiphertextVaultReceipt } from '../lib/manual-upi-ciphertext-vault-receipt';

const digest = 'a'.repeat(64);
const expected = { ciphertextSha256: digest };
test('accepts matching ciphertext digest and opaque vault key', () => {
  assert.deepEqual(validateCiphertextVaultReceipt(expected, {
    objectKey: 'private/statements/opaque_123', ciphertextSha256: digest,
  }), { objectKey: 'private/statements/opaque_123', ciphertextSha256: digest });
});
test('rejects mismatched ciphertext digest', () => {
  assert.throws(() => validateCiphertextVaultReceipt(expected, {
    objectKey: 'private/statements/opaque_123', ciphertextSha256: 'b'.repeat(64),
  }), /DIGEST_MISMATCH/);
});
test('rejects unsafe object keys, missing and malformed receipts', () => {
  for (const objectKey of ['../secret', '/private/123', 'https://example.com/secret', 'a//b/123456', 'short', 'private\\secret']) {
    assert.throws(() => validateCiphertextVaultReceipt(expected, {
      objectKey, ciphertextSha256: digest,
    }), /RECEIPT_INVALID/);
  }
  assert.throws(() => validateCiphertextVaultReceipt(expected, null), /RECEIPT_INVALID/);
  assert.throws(() => validateCiphertextVaultReceipt(expected, {
    objectKey: 'private/statements/opaque_123', ciphertextSha256: 'bad',
  }), /RECEIPT_INVALID/);
});
