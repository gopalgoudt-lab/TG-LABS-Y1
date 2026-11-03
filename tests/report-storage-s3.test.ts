import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Static regression checks keep this test independent of AWS credentials.
// Runtime signing and HTTP mock tests are still required before Preview rollout.
const source = readFileSync(new URL('../lib/report-storage-s3.ts', import.meta.url), 'utf8');

test('S3 report adapter is server-only and keeps credentials in environment', () => {
  assert.match(source, /import ["']server-only["']/);
  for (const name of ['REPORT_STORAGE_BUCKET', 'REPORT_STORAGE_REGION', 'REPORT_STORAGE_ACCESS_KEY', 'REPORT_STORAGE_SECRET_KEY']) {
    assert.ok(source.includes('process.env.' + name), name);
  }
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
});

test('S3 report uploads require PDF magic bytes and enforce 25 MiB limit', () => {
  assert.match(source, /25 \* 1024 \* 1024/);
  assert.match(source, /%PDF-/);
  assert.match(source, /REPORT_INVALID_PDF/);
  assert.match(source, /REPORT_TOO_LARGE/);
  assert.match(source, /validatePatientReportPdf\(data\)/);
});

test('S3 object keys are generated server-side and constrained to patient reports', () => {
  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /patient-reports\//);
  assert.match(source, /validateKey\(key\)/);
  assert.match(source, /INVALID_REPORT_OBJECT_KEY/);
});

test('S3 calls use AWS SigV4 with no-store and no sensitive AWS error body', () => {
  assert.match(source, /AWS4-HMAC-SHA256/);
  assert.match(source, /x-amz-content-sha256/);
  assert.match(source, /x-amz-server-side-encryption/);
  assert.match(source, /cache: ["']no-store["']/);
  assert.match(source, /REPORT_STORAGE_REQUEST_FAILED_/);
  assert.doesNotMatch(source, /response\.text\(/);
});

test('S3 downloads enforce a streamed byte limit without Content-Length', () => {
  assert.match(source, /response\.body\.getReader\(\)/);
  assert.match(source, /bytes \+= value\.byteLength/);
  assert.match(source, /bytes > MAX_REPORT_BYTES/);
  assert.match(source, /reader\.cancel\(\)/);
  assert.match(source, /validatePatientReportPdf\(Buffer\.concat\(chunks, bytes\)\)/);
});
