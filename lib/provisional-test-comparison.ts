export const COMPARISON_PARTNERS = ['sagepath-labs', 'thyrocare'] as const;

export type ProvisionalComparisonCandidate = {
  offerId: string;
  productSlug: string;
  productName: string;
  sampleTypes: string[];
  partnerSlug: (typeof COMPARISON_PARTNERS)[number];
  partnerName: string;
  price: number;
  mrp?: number | null;
};

export type ProvisionalComparisonRow = {
  key: string;
  displayName: string;
  matchBasis: 'Exact normalized name only';
  sagepath: ProvisionalComparisonCandidate;
  thyrocare: ProvisionalComparisonCandidate;
};

const NORMALIZATION_RULES: Array<[RegExp, string]> = [
  [/\bhaemoglobin\b/g, 'hemoglobin'],
  [/\bhaematology\b/g, 'hematology'],
  [/\bhaemogram\b/g, 'hemogram'],
  [/\bglycosylated\b/g, 'glycated'],
  [/\bsgpt\b/g, 'alanine aminotransferase'],
  [/\bsgot\b/g, 'aspartate aminotransferase'],
  [/\btsh\b/g, 'thyroid stimulating hormone'],
  [/\bhba1c\b/g, 'glycated hemoglobin'],
  [/\bcrp\b/g, 'c reactive protein'],
  [/\besr\b/g, 'erythrocyte sedimentation rate'],
  [/\bcbc\b/g, 'complete blood count'],
  [/\bvit\b/g, 'vitamin'],
  [/\bquantitative\b/g, ''],
  [/\bqualitative\b/g, ''],
  [/\btest\b/g, ''],
  [/\bserum\b/g, ''],
  [/\bplasma\b/g, ''],
  [/\bmethod\b/g, ''],
  [/\boutlab\b/g, ''],
  [/\binlab\b/g, ''],
];

export function normalizeProvisionalTestName(value: string) {
  let normalized = value
    .normalize('NFKD')
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  for (const [pattern, replacement] of NORMALIZATION_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }

  return [...new Set(normalized.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean))]
    .sort()
    .join(' ');
}

export function buildProvisionalComparisonRows(candidates: ProvisionalComparisonCandidate[]) {
  const groups = new Map<string, Partial<Record<(typeof COMPARISON_PARTNERS)[number], ProvisionalComparisonCandidate[]>>>();

  for (const candidate of candidates) {
    const key = normalizeProvisionalTestName(candidate.productName);
    if (!key || !COMPARISON_PARTNERS.includes(candidate.partnerSlug)) continue;
    const group = groups.get(key) ?? {};
    const partnerCandidates = group[candidate.partnerSlug] ?? [];
    partnerCandidates.push(candidate);
    group[candidate.partnerSlug] = partnerCandidates;
    groups.set(key, group);
  }

  const rows: ProvisionalComparisonRow[] = [];
  for (const [key, group] of groups) {
    const sagepath = group['sagepath-labs']?.toSorted((a, b) => a.price - b.price)[0];
    const thyrocare = group.thyrocare?.toSorted((a, b) => a.price - b.price)[0];
    if (!sagepath || !thyrocare) continue;
    rows.push({ key, displayName: sagepath.productName, matchBasis: 'Exact normalized name only', sagepath, thyrocare });
  }

  return rows.toSorted((a, b) => a.displayName.localeCompare(b.displayName, 'en-IN'));
}
