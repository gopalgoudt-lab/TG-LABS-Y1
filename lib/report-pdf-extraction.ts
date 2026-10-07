import 'server-only';

const PDF_DATA_PREFIX = 'data:application/pdf;base64,';
const MAX_EXTRACTED_TEXT = 120_000;

export type ExtractedPdfText = {
  text: string;
  pages: number;
  truncated: boolean;
};

/**
 * Extracts text from an already-validated diagnostic PDF entirely inside the
 * TG Labs server runtime. This utility deliberately does not call any external
 * service and does not interpret or persist clinical observations.
 */
export async function extractDiagnosticPdfText(dataUrl: string): Promise<ExtractedPdfText> {
  if (!dataUrl.startsWith(PDF_DATA_PREFIX)) throw new Error('INVALID_PDF_DATA_URL');

  const bytes = Buffer.from(dataUrl.slice(PDF_DATA_PREFIX.length), 'base64');
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('INVALID_PDF');
  }

  // pdf-parse owns its Node compatibility setup. In serverless runtimes the
  // worker must be supplied explicitly as embedded data so pdf.js never looks
  // for pdf.worker.mjs on the function filesystem.
  const { getData } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  PDFParse.setWorker(getData());

  const parser = new PDFParse({ data: new Uint8Array(bytes) });

  try {
    const result = await parser.getText();

    // Prefer pdf-parse's table extractor when getText() collapses a diagnostic
    // report to one physical line. Table extraction is coordinate/layout based
    // and gives us row boundaries without interpreting clinical meaning.
    let extractedText = result.text ?? '';
    if (!/[\r\n]/.test(extractedText)) {
      try {
        const tableResult = await parser.getTable();
        const tableRows = tableResult.pages.flatMap((page) =>
          page.tables.flatMap((table) =>
            table.map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join('\t')),
          ),
        ).filter(Boolean);
        console.info('Diagnostic PDF layout summary', {
          textCollapsed: true,
          tablePages: tableResult.pages.length,
          tableCount: tableResult.pages.reduce((sum, page) => sum + page.tables.length, 0),
          tableRowCount: tableRows.length,
        });
        if (tableRows.length) extractedText = tableRows.join('\n');
      } catch (error) {
        console.info('Diagnostic PDF layout summary', {
          textCollapsed: true,
          tableExtractionFailed: true,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        // Never log extracted report text or cell contents: reports may contain PHI.
        // Fail back to plain text. The observation parser remains fail-closed.
      }
    }
    // Preserve tabs and repeated spaces because diagnostic PDFs commonly use
    // them as table-column boundaries. The observation parser relies on those
    // boundaries to separate parameter, result, unit and reference range.
    const rawText = extractedText;

    // pdf.js may expose table rows as positioned text items while getText()
    // returns the whole page as one physical line. Recover conservative row
    // boundaries from large horizontal gaps before observation parsing. This
    // does not interpret clinical values; the downstream parser still fails
    // closed unless a row has a valid result/unit/range shape.
    const normalized = rawText
      .replace(/\0/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/([^\n\t ]) {3,}(?=[A-Za-z][A-Za-z0-9 (])/g, '$1\n')
      .replace(/[ \f\v]+$/gm, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

    if (!normalized) throw new Error('PDF_TEXT_NOT_FOUND');

    return {
      text: normalized.slice(0, MAX_EXTRACTED_TEXT),
      pages: Number.isFinite(result.total) ? result.total : 0,
      truncated: normalized.length > MAX_EXTRACTED_TEXT,
    };
  } finally {
    await parser.destroy();
  }
}
