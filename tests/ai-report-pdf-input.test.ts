import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAiReportPdf, MAX_AI_PDF_BYTES } from '../lib/ai-report-pdf-input';

const data = (bytes: Buffer) => 'data:application/pdf;base64,' + bytes.toString('base64');

test('accepts a bounded PDF header', () => {
  const bytes = Buffer.from('%PDF-1.7\n%%EOF');
  assert.deepEqual(decodeAiReportPdf(data(bytes)), bytes);
});
test('rejects non-PDF data', () => {
  assert.throws(() => decodeAiReportPdf(data(Buffer.from('not a pdf'))), /AI_PDF_INVALID_SIGNATURE/);
});
test('rejects URL storage references rather than fetching them', () => {
  assert.throws(() => decodeAiReportPdf('https://example.com/private.pdf'), /AI_PDF_STORAGE_RESOLVER_REQUIRED/);
});
test('rejects invalid base64', () => {
  assert.throws(() => decodeAiReportPdf('data:application/pdf;base64,%%%%'), /AI_PDF_INVALID_BASE64/);
});
test('rejects oversized reports', () => {
  assert.throws(() => decodeAiReportPdf(data(Buffer.alloc(MAX_AI_PDF_BYTES + 1))), /AI_PDF_TOO_LARGE/);
});
