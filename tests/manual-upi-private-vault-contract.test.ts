import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessVaultInstallation, assessVaultResult } from '../lib/manual-upi-private-vault-contract';

test('no vault installed fails closed', () => {
  assert.deepEqual(assessVaultInstallation(null), {
    available: false, blockers: ['TRUSTED_PRIVATE_EVIDENCE_VAULT_NOT_INSTALLED'],
  });
});
test('an object with no valid storage function fails closed', () => {
  assert.equal(assessVaultInstallation({ providerId: 'test' } as never).available, false);
});
test('even a declared vault needs security review', () => {
  const vault = { providerId: 'synthetic-vault', storeStatement: async () => {
    throw new Error('DO_NOT_STORE');
  } };
  assert.deepEqual(assessVaultInstallation(vault), {
    available: false, blockers: ['VAULT_PROVIDER_SECURITY_REVIEW_REQUIRED'],
  });
});
test('untrusted metadata is rejected', () => {
  assert.equal(assessVaultResult(null).eligible, false);
  assert.equal(assessVaultResult({
    objectKey: '../escape', digest: 'a'.repeat(64),
    encryptedAtRest: true, privateAccess: true, accessAuditEnabled: true,
  }).eligible, false);
});
