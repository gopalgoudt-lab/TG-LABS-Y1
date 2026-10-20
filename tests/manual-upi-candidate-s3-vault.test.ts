import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createCandidateS3CiphertextVault } from '../lib/manual-upi-candidate-s3-vault';
import { assessCiphertextVaultActivation } from '../lib/manual-upi-ciphertext-vault-handoff';

const kmsKeyArn = 'arn:aws:kms:ap-south-1:123456789012:key/12345678-1234-1234-1234-123456789012';
const ciphertextJson = JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', nonce: 'abc', ciphertext: 'encrypted', tag: 'xyz' });
const payload = {
  bookingId: 'synthetic-booking',
  originalReceiptHash: 'a'.repeat(64),
  authenticatedVerifierUid: 'accounts-staff',
  ciphertextJson,
  ciphertextSha256: createHash('sha256').update(ciphertextJson).digest('hex'),
};
test('candidate adapter requests KMS, create-only object and ciphertext only', async () => {
  const requests: unknown[] = [];
  const vault = createCandidateS3CiphertextVault({
    bucketName: 'tglabs-private-evidence-test', kmsKeyArn,
    putObject: async request => { requests.push(request); },
  });
  const result = await vault.putEncryptedStatement(payload);
  assert.equal(requests.length, 1);
  const request = requests[0] as Record<string, string>;
  assert.equal(request.ServerSideEncryption, 'aws:kms');
  assert.equal(request.SSEKMSKeyId, kmsKeyArn);
  assert.equal(request.IfNoneMatch, '*');
  assert.equal(request.Body, ciphertextJson);
  assert.match(request.Key, /^manual-upi\/synthetic-booking\/[a-f0-9]{48}$/);
  assert.equal(result.ciphertextSha256, payload.ciphertextSha256);
  assert.equal(assessCiphertextVaultActivation(vault).enabled, false);
});
test('invalid digest never reaches storage', async () => {
  let called = false;
  const vault = createCandidateS3CiphertextVault({
    bucketName: 'tglabs-private-evidence-test', kmsKeyArn,
    putObject: async () => { called = true; },
  });
  await assert.rejects(vault.putEncryptedStatement({
    ...payload, ciphertextSha256: 'b'.repeat(64),
  }), /DIGEST_MISMATCH/);
  assert.equal(called, false);
});
test('storage failure propagates without receipt', async () => {
  const vault = createCandidateS3CiphertextVault({
    bucketName: 'tglabs-private-evidence-test', kmsKeyArn,
    putObject: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
  });
  await assert.rejects(vault.putEncryptedStatement(payload), /STORAGE_UNAVAILABLE/);
});
