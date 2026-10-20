import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessPrivateS3SecuritySettings, type PrivateS3SecuritySettings } from '../lib/manual-upi-s3-security-preflight';

const settings: PrivateS3SecuritySettings = {
  bucketName: 'tglabs-private-evidence-test',
  region: 'ap-south-1',
  blockPublicAccess: true,
  objectOwnershipBucketOwnerEnforced: true,
  enforceTls: true,
  serverSideEncryption: 'aws:kms',
  kmsKeyArn: 'arn:aws:kms:ap-south-1:123456789012:key/12345678-1234-1234-1234-123456789012',
  objectDataEventsEnabled: true,
  versioningEnabled: true,
  retentionPolicyApproved: true,
  malwareScanGateEnabled: true,
  independentAccountsStaffPolicyApproved: true,
};
test('configuration-only preflight never enables storage writes', () => {
  const result = assessPrivateS3SecuritySettings(settings);
  assert.equal(result.readyForSecurityReview, true);
  assert.equal(result.storageWritesEnabled, false);
});
test('missing KMS, public access and object audit fail closed', () => {
  const result = assessPrivateS3SecuritySettings({
    ...settings, blockPublicAccess: false, serverSideEncryption: 'AES256',
    kmsKeyArn: undefined, objectDataEventsEnabled: false,
  });
  assert.equal(result.readyForSecurityReview, false);
  assert.ok(result.blockers.includes('PRIVATE_BUCKET_PUBLIC_ACCESS_NOT_BLOCKED'));
  assert.ok(result.blockers.includes('PRIVATE_BUCKET_CUSTOMER_KMS_NOT_CONFIGURED'));
  assert.ok(result.blockers.includes('PRIVATE_BUCKET_OBJECT_AUDIT_NOT_ENABLED'));
  assert.equal(result.storageWritesEnabled, false);
});
test('null configuration fails closed', () => {
  const result = assessPrivateS3SecuritySettings(null);
  assert.equal(result.readyForSecurityReview, false);
  assert.equal(result.storageWritesEnabled, false);
});
