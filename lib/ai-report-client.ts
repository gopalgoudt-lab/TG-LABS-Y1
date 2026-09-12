export type AiReportResponse = {
  analysis: string;
  generatedAt: string;
  disclaimer: string;
  language?: string;
  languageName?: string;
  cached?: boolean;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function parseAiReportResponse(res: Response): Promise<AiReportResponse> {
  const contentType = res.headers.get('content-type') ?? '';
  let payload: unknown = null;

  if (contentType.toLowerCase().includes('application/json')) {
    payload = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const serverMessage = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error.trim()
      : '';

    if (serverMessage) throw new Error(serverMessage);
    if (RETRYABLE_STATUS.has(res.status)) {
      throw new Error('AI Report is temporarily unavailable. Please wait a moment and try again.');
    }
    throw new Error('Unable to generate AI Report right now. Please try again.');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('AI Report returned an unexpected response. Please try again.');
  }

  const candidate = payload as Partial<AiReportResponse>;
  if (typeof candidate.analysis !== 'string' || !candidate.analysis.trim() ||
      typeof candidate.generatedAt !== 'string' ||
      typeof candidate.disclaimer !== 'string') {
    throw new Error('AI Report returned incomplete information. Please try again.');
  }

  return candidate as AiReportResponse;
}
