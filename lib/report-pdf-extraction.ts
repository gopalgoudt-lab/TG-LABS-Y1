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

    const normalizeText = (value: string) =>
      value
        .replace(/\0/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/([^\n\t ]) {3,}(?=[A-Za-z][A-Za-z0-9 (])/g, '$1\n')
        .replace(/[ \f\v]+$/gm, '')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();

    // Decide whether the PDF is collapsed only after applying the same
    // normalization that downstream observation parsing receives.
    let extractedText = result.text ?? '';
    let normalized = normalizeText(extractedText);
    const rawMeaningfulLineCount = extractedText
      .replace(/\0/g, '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;
    const normalizedMeaningfulLineCount = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;

    let tableAttempted = false;
    let tableExtractionFailed = false;
    let tableCount = 0;
    let tableRowCount = 0;

    if (normalizedMeaningfulLineCount <= 1) {
      tableAttempted = true;
      try {
        const tableResult = await parser.getTable();
        const tableRows = tableResult.pages.flatMap((page) =>
          page.tables.flatMap((table) =>
            table.map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join('\t')),
          ),
        ).filter(Boolean);

        tableCount = tableResult.pages.reduce((sum, page) => sum + page.tables.length, 0);
        tableRowCount = tableRows.length;

        if (tableRows.length) {
          extractedText = tableRows.join('\n');
          normalized = normalizeText(extractedText);
        }
      } catch {
        tableExtractionFailed = true;
        // Never log report text, cells, values, names or error messages:
        // diagnostic reports may contain PHI.
      }
    }

    const finalMeaningfulLineCount = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;
    console.info('Diagnostic PDF extraction stages', {
      rawLength: extractedText.length,
      rawMeaningfulLineCount,
      normalizedLength: normalized.length,
      normalizedMeaningfulLineCount,
      tableAttempted,
      tableExtractionFailed,
      tableCount,
      tableRowCount,
      finalMeaningfulLineCount,
    });

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
