import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookingPage = readFileSync(new URL('../app/admin/bookings/[id]/page.tsx', import.meta.url), 'utf8');
const operationsPage = readFileSync(new URL('../app/admin/operations/page.tsx', import.meta.url), 'utf8');
const reportRoute = readFileSync(new URL('../app/api/admin/reports/route.ts', import.meta.url), 'utf8');
const aiRoute = readFileSync(new URL('../app/api/patient/reports/[id]/ai/route.ts', import.meta.url), 'utf8');

test('admin booking workflow preserves multi-PDF preparation and safe preview before publish', () => {
  assert.ok(bookingPage.includes('PDFDocument.create()'));
  assert.ok(bookingPage.includes('copyPages'));
  assert.ok(bookingPage.includes('openReport'));
  assert.ok(bookingPage.includes("window.open(url, '_blank', 'noopener,noreferrer')"));
  assert.ok(bookingPage.includes('Publish Report'));
});

test('admin booking workflow preserves optional corrected final page numbering', () => {
  assert.ok(bookingPage.includes('correctPageNumbers'));
  assert.ok(bookingPage.includes('renumberPages'));
  assert.ok(bookingPage.includes('Page ${index + 1} of ${total}'));
  assert.ok(bookingPage.includes('TG-Labs-Corrected-Pages-'));
});

test('report API preserves explicit partial and full publishing semantics', () => {
  assert.ok(reportRoute.includes("z.enum(['PARTIAL', 'FULL'])"));
  assert.ok(reportRoute.includes("body.reportType === 'PARTIAL'"));
  assert.ok(reportRoute.includes("workflowStatus: isFull"));
  assert.ok(reportRoute.includes("'REPORT_READY'"));
  assert.ok(reportRoute.includes("'PROCESSING'"));
  assert.ok(reportRoute.includes('A partial report cannot replace a completed or delivered final report.'));
});

test('report API preserves corrected-page processing and audit metadata', () => {
  assert.ok(reportRoute.includes('replaceExistingPageNumbers'));
  assert.ok(reportRoute.includes('requestsCorrectedPageNumbers'));
  assert.ok(reportRoute.includes('pageNumbersReplaced'));
  assert.ok(reportRoute.includes("action: existing.reportData ? 'REPORT_REPLACED' : 'REPORT_PUBLISHED'"));
});

test('operations page preserves multi-file merge and partial/full selection', () => {
  assert.ok(operationsPage.includes('multiple accept="application/pdf,.pdf"'));
  assert.ok(operationsPage.includes('PDFDocument.create()'));
  assert.ok(operationsPage.includes('copyPages'));
  assert.ok(operationsPage.includes("type ReportType='PARTIAL'|'FULL'"));
  assert.ok(operationsPage.includes('Partial report keeps the booking in Processing'));
});

test('AI report preserves conservative next-test suggestions and multilingual parity hardening', () => {
  assert.ok(aiRoute.includes('SUGGESTED NEXT TESTS TO DISCUSS WITH YOUR DOCTOR'));
  assert.ok(aiRoute.includes('Suggest no more than 5 next tests'));
  assert.ok(aiRoute.includes('canonicalNextTests'));
  assert.ok(aiRoute.includes('LANGUAGE PARITY REQUIREMENT'));
  assert.ok(aiRoute.includes('Section 6 is mandatory in every language'));
});
