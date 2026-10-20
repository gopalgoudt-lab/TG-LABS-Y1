import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { decryptStatement } from '../lib/manual-upi-statement-encryption';
import { prepareBankStatementForPrivateVault } from '../lib/manual-upi-bank-statement-vault-preparation';

const key = randomBytes(32);
const receipt = 'a'.repeat(64);
const pdf = Buffer.from('%PDF-1.7\nSYNTHETIC TEST DATA\n');
const args = { bookingId: 'synthetic-booking', originalReceiptHash: receipt,
  verifiedServerSidePdfBytes: pdf, managedEncryptionKey: key };

test('prepares encrypted synthetic PDF without storage side effects', () => {
  const result = prepareBankStatementForPrivateVault(args);
  assert.deepEqual(decryptStatement(result.envelope, key, args.bookingId, receipt), pdf);
  assert.equal(result.plaintextBytes, pdf.length);
  assert.match(result.plaintextSha256, /^[a-f0-9]{64}$/);
});
test('rejects non-PDF content and weak keys', () => {
  assert.throws(() => prepareBankStatementForPrivateVault({
    ...args, verifiedServerSidePdfBytes: Buffer.from('not a pdf'),
  }), /PDF_SIGNATURE_INVALID/);
  assert.throws(() => prepareBankStatementForPrivateVault({
    ...args, managedEncryptionKey: randomBytes(8),
  }), /KEY_INVALID/);
});
test('cannot decrypt ciphertext against another booking', () => {
  const result = prepareBankStatementForPrivateVault(args);
  assert.throws(() => decryptStatement(result.envelope, key, 'different-booking', receipt));
});
