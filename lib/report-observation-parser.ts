const MAX_OBSERVATIONS = 250;
const MAX_LINE = 500;
const MAX_FIELD = 160;

export type AutoExtractedObservation = {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
};

const IDENTITY_OR_HEADER = /\b(?:patient|name|age|gender|sex|mobile|phone|email|address|uhid|patient\s*id|booking\s*id|sample\s*id|lab\s*id|accession|referred\s*by|ref\.?\s*by|doctor|hospital|collection\s*(?:date|time)|reported\s*(?:date|time)|registered\s*(?:date|time))\b/i;
const INSTRUCTION_LIKE = /\b(?:ignore|instruction|prompt|system|assistant|developer|execute|command|javascript|http[s]?:\/\/|www\.)\b/i;
const VALUE_TOKEN = /^(?:[<>]=?\s*)?(?:\d+(?:\.\d+)?|positive|negative|reactive|non[- ]?reactive|detected|not\s+detected)$/i;
const FLAG_TOKEN = /^(?:normal|low|high|borderline|critical|abnormal|positive|negative|l|h)$/i;
const RANGE_TOKEN = /^(?:[<>]=?\s*)?\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*(?:[<>]=?\s*)?\d+(?:\.\d+)?$/i;

function clean(value: string | undefined, max = MAX_FIELD) {
  return (value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeLine(line: string) {
  const value = clean(line, MAX_LINE);
  if (!value || IDENTITY_OR_HEADER.test(value) || INSTRUCTION_LIKE.test(value)) return '';
  return value;
}

function normalizeFlag(value: string | undefined) {
  const flag = clean(value, 24);
  if (!flag || !FLAG_TOKEN.test(flag)) return undefined;
  if (/^h$/i.test(flag)) return 'High';
  if (/^l$/i.test(flag)) return 'Low';
  return flag;
}

function parseDelimited(line: string): AutoExtractedObservation | null {
  const delimiter = line.includes('\t') ? /\t+/ : line.includes('|') ? /\s*\|\s*/ : /\s{2,}/;
  const cells = line.split(delimiter).map((cell) => clean(cell)).filter(Boolean);
  if (cells.length < 2) return null;

  const valueIndex = cells.findIndex((cell, index) => index > 0 && VALUE_TOKEN.test(cell));
  if (valueIndex < 1) return null;

  const parameterName = clean(cells.slice(0, valueIndex).join(' '));
  const value = clean(cells[valueIndex]);
  if (!parameterName || parameterName.length < 2 || !/[A-Za-z]/.test(parameterName)) return null;
  if (IDENTITY_OR_HEADER.test(parameterName) || INSTRUCTION_LIKE.test(parameterName)) return null;

  const tail = cells.slice(valueIndex + 1);
  let flag: string | undefined;
  let referenceRange: string | undefined;
  let unit: string | undefined;

  for (const cell of tail) {
    if (!flag && FLAG_TOKEN.test(cell)) {
      flag = normalizeFlag(cell);
      continue;
    }
    if (!referenceRange && RANGE_TOKEN.test(cell)) {
      referenceRange = clean(cell);
      continue;
    }
    if (!unit && cell.length <= 40 && !INSTRUCTION_LIKE.test(cell)) unit = clean(cell, 40);
  }

  return {
    parameterName,
    value,
    ...(unit ? { unit } : {}),
    ...(referenceRange ? { referenceRange } : {}),
    ...(flag ? { flag } : {}),
  };
}

/**
 * Conservative local parser for text extracted from diagnostic PDFs.
 *
 * It intentionally accepts only table-like rows with an explicit result value.
 * Identity/header lines and instruction-like content are discarded. Ambiguous
 * lines fail closed instead of becoming AI input.
 */
export function parseDeidentifiedLabObservations(text: string): AutoExtractedObservation[] {
  if (!text) return [];

  const observations: AutoExtractedObservation[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split('\n')) {
    const line = safeLine(rawLine);
    if (!line) continue;

    const parsed = parseDelimited(line);
    if (!parsed) continue;

    const key = `${parsed.parameterName.toLowerCase()}\u0000${parsed.value.toLowerCase()}\u0000${(parsed.unit ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    observations.push(parsed);

    if (observations.length >= MAX_OBSERVATIONS) break;
  }

  return observations;
}
