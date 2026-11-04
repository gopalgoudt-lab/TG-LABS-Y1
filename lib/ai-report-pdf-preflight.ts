import { PDFDocument } from 'pdf-lib';
import { decodeAiReportPdf } from './ai-report-pdf-input';

export const MAX_AI_PDF_PAGES = 20;

export async function inspectAiReportPdf(reportData: string) {
  const bytes = decodeAiReportPdf(reportData);

  let pageCount: number;

  try {
    const pdf = await PDFDocument.load(bytes, {
      updateMetadata: false,
    });
    pageCount = pdf.getPageCount();
  } catch {
    throw new Error('AI_PDF_UNREADABLE_OR_ENCRYPTED');
  }

  if (pageCount < 1 || pageCount > MAX_AI_PDF_PAGES) {
    throw new Error('AI_PDF_PAGE_LIMIT');
  }

  return { bytes, pageCount };
}
