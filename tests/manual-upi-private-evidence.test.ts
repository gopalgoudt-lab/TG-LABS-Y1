import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  evidenceHmac, statementSha256, matchingEvidenceDigest,
  assessPrivateEvidenceDescriptor,
} from '../lib/manual-upi-private-evidence';

const secret = 'test-only-key-material-at-least-thirty-two-bytes';
const descriptor = {
  objectKey: 'manual-upi/test-booking/abcdefghijklmnop',
  digest: 'a'.repeat(64),
  encryptedAtRest: true as const,
  accessAuditEnabled: true as const,
  privateAccess: true as const,
};
test('identifier HMAC is stable, keyed and not plain SHA256', () => {
  assert.equal(evidenceHmac('ref-1', secret), evidenceHmac('ref-1', secret));
  assert.notEqual(evidenceHmac('ref-1', secret), evidenceHmac('ref-1', secret + 'changed'));
});
test('weak or absent HMAC key is rejected', () => {
  assert.throws(() => evidenceHmac('ref-1', 'short'), /KEY_NOT_CONFIGURED/);
  assert.throws(() => evidenceHmac('', secret), /IDENTIFIER_INVALID/);
});
test('statement digest is stable and detects changes', () => {
  const a = statementSha256(new TextEncoder().encode('synthetic statement'));
  const b = statementSha256(new TextEncoder().encode('altered statement'));
  assert.equal(a.length, 64);
  assert.ok(matchingEvidenceDigest(a, a));
  assert.ok(!matchingEvidenceDigest(a, b));
  assert.ok(!matchingEvidenceDigest('not-a-hash', a));
});
test('empty evidence file is rejected', () => {
  assert.throws(() => statementSha256(new Uint8Array()), /STATEMENT_BYTES_REQUIRED/);
});
test('private vault metadata requires all security properties', () => {
  assert.equal(assessPrivateEvidenceDescriptor(descriptor).eligible, true);
  assert.equal(assessPrivateEvidenceDescriptor(null).eligible, false);
  assert.equal(assessPrivateEvidenceDescriptor({ ...descriptor, privateAccess: false } as never).eligible, false);
  assert.equal(assessPrivateEvidenceDescriptor({ ...descriptor, objectKey: '../secret' }).eligible, false);
  assert.equal(assessPrivateEvidenceDescriptor({ ...descriptor, digest: 'bad' }).eligible, false);
});
