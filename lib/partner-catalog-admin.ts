export const PARTNER_ACTIVATION_FIELDS = [
  'active',
  'bookingEnabled',
  'operationalEnabled',
  'displayEnabled',
  'serviceability',
  'homeCollectionEnabled',
] as const;

export const PARTNER_CREATE_SAFETY_DEFAULTS = {
  active: false,
  bookingEnabled: false,
  operationalEnabled: false,
  displayEnabled: false,
} as const;

const blocked = new Set<string>(PARTNER_ACTIVATION_FIELDS);

export function findBlockedPartnerMutationFields(input: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (blocked.has(key)) found.add(key);
      visit(child);
    }
  };
  visit(input);
  return [...found].sort();
}

export function partnerActivationMutationMessage(fields: string[]) {
  return fields.length
    ? `Phase 2C-4 does not permit activation or serviceability changes: ${fields.join(', ')}`
    : '';
}
