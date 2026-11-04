import { PDFDocument } from 'pdf-lib';
import { decodeAiReportPdf } from './ai-report-pdf-input';

export const MAX_AI_PDF_PAGES = 20;

/**
 * Preview-only preflight. A valid PDF signature is not sufficient to prove that
 * the document can be processed. Never return original PDF bytes to the client.
 * This is not text extraction or verification of clinical observations.
 */
export async function inspectAiReportPdf(reportData: string) {
  const bytes = decodeAiReportPdf(reportData);
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    throw new Error('AI_PDF_UNREADABLE_OR_ENCRYPTED');
  }
  const pageCount = pdf.getPageCount();
  if (pageCount < 1 || pageCount > MAX_AI_PDF_PAGES) {
    throw new Error('AI_PDF_PAGE_LIMIT');
  }
  return { bytes, pageCount };
}
