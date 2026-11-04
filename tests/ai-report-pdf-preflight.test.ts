import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { inspectAiReportPdf, MAX_AI_PDF_PAGES } from '../lib/ai-report-pdf-preflight';

const encode = (bytes: Uint8Array) =>
  'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64');

test('preflight accepts a valid single-page PDF', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const result = await inspectAiReportPdf(encode(await doc.save()));
  assert.equal(result.pageCount, 1);
  assert.equal(result.bytes.subarray(0, 5).toString('ascii'), '%PDF-');
});

test('preflight rejects PDF files exceeding page limit', async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < MAX_AI_PDF_PAGES + 1; i++) doc.addPage();
  await assert.rejects(inspectAiReportPdf(encode(await doc.save())), /AI_PDF_PAGE_LIMIT/);
});

test('preflight rejects a forged PDF header with invalid structure', async () => {
  await assert.rejects(inspectAiReportPdf(encode(Buffer.from('%PDF-1.7\nnot-a-real-pdf'))), /AI_PDF_UNREADABLE_OR_ENCRYPTED/);
});
