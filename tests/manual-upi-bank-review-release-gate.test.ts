import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BANK_REVIEW_RELEASE_GATES, bankReviewReleaseReadiness,
} from '../lib/manual-upi-bank-review-release-gate';

test('bank review release is always disabled until independent review', () => {
  const result = bankReviewReleaseReadiness();
  assert.equal(result.enabled, false);
  assert.ok(result.blockers.includes('PRODUCTION_FINANCIAL_WRITES_PROHIBITED'));
});
test('bank review release requires encrypted evidence and immutable audit', () => {
  assert.ok(BANK_REVIEW_RELEASE_GATES.includes('PRIVATE_ENCRYPTED_MALWARE_SCANNED_EVIDENCE'));
  assert.ok(BANK_REVIEW_RELEASE_GATES.includes('SERIALIZABLE_VERIFICATION_AND_IMMUTABLE_AUDIT'));
});
test('owner approval remains separate from staff verification', () => {
  assert.ok(BANK_REVIEW_RELEASE_GATES.includes('SEPARATE_OWNER_APPROVAL_AFTER_VERIFICATION'));
});
