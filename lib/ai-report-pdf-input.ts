/**
 * Strict input boundary for Preview PDF-to-AI extraction.
 * This helper never fetches arbitrary URLs or reads patient records.
 * The authenticated caller must resolve ownership before passing stored bytes.
 */
export const MAX_AI_PDF_BYTES = 8 * 1024 * 1024;
const PREFIX = 'data:application/pdf;base64,';

export function decodeAiReportPdf(reportData: string): Buffer {
  if (!reportData.startsWith(PREFIX)) {
    // Legacy remote URLs and future S3 object keys need a separate, trusted
    // storage resolver; never fetch a URL supplied by the browser.
    throw new Error('AI_PDF_STORAGE_RESOLVER_REQUIRED');
  }
  const encoded = reportData.slice(PREFIX.length);
  if (!encoded || encoded.length > Math.ceil(MAX_AI_PDF_BYTES / 3) * 4 + 4) {
    throw new Error('AI_PDF_TOO_LARGE');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error('AI_PDF_INVALID_BASE64');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < 8 || bytes.length > MAX_AI_PDF_BYTES) {
    throw new Error('AI_PDF_INVALID_SIZE');
  }
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('AI_PDF_INVALID_SIGNATURE');
  }
  if (!/^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString('ascii'))) {
    throw new Error('AI_PDF_INVALID_HEADER');
  }
  return bytes;
}
