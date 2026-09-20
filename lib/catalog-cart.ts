import { z } from 'zod';

export const cartItemSchema = z.object({
  productType: z.enum(['TEST', 'PROFILE', 'PACKAGE']),
  productIdentifier: z.string().min(1).max(160),
  productName: z.string().min(1).max(240).optional(),
  offerIdentifier: z.string().min(1).max(160),
  partnerIdentifier: z.string().min(1).max(160),
  partnerName: z.string().min(1).max(160).optional(),
  tat: z.string().min(1).max(160).nullable().optional(),
  mrp: z.number().int().positive().nullable().optional(),
  displayedPrice: z.number().int().positive(),
  homeCollectionCharge: z.number().int().min(0).max(500).optional().default(0),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
}).strict();

export type CatalogCartItem = z.infer<typeof cartItemSchema>;

export function parseCatalogCart(value: unknown): CatalogCartItem[] {
  if (!Array.isArray(value)) return [];

  // Cart data lives in browser storage across releases. A single stale or
  // malformed historical entry must not make every newly added valid item
  // disappear. Keep only valid items and cap the cart at 30 entries.
  return value
    .slice(-30)
    .map((item) => cartItemSchema.safeParse(item))
    .filter((result): result is { success: true; data: CatalogCartItem } => result.success)
    .map((result) => result.data);
}

export function readCatalogCart(raw: string | null) {
  if (!raw) return [];
  try {
    return parseCatalogCart(JSON.parse(raw));
  } catch {
    return [];
  }
}


import { findRedundantIndividualTests } from './catalog/containment';

type CatalogComposition = ReadonlyMap<string, readonly string[]>;

export function addCatalogItemWithContainment(
  current: readonly CatalogCartItem[],
  incoming: CatalogCartItem,
  composition: CatalogComposition,
) {
  const currentWithoutSameProduct = current.filter(
    (item) => item.productIdentifier !== incoming.productIdentifier,
  );

  if (incoming.productType === 'TEST') {
    const selectedContainers = currentWithoutSameProduct
      .filter((item) => item.productType !== 'TEST')
      .map((item) => ({ kind: 'package' as const, id: item.productIdentifier }));
    const covered = new Set<string>();
    for (const container of selectedContainers) {
      for (const testId of composition.get(container.id) ?? []) covered.add(testId);
    }
    if (covered.has(incoming.productIdentifier)) {
      return {
        status: 'already-included' as const,
        items: [...current],
        removedRedundantTestIds: [] as string[],
      };
    }
  }

  const candidate = [...currentWithoutSameProduct, incoming];
  const containmentItems = candidate.map((item) =>
    item.productType === 'TEST'
      ? { kind: 'test' as const, id: item.productIdentifier }
      : { kind: 'package' as const, id: item.productIdentifier },
  );
  const redundantIds = findRedundantIndividualTests(containmentItems, composition);
  const redundant = new Set(redundantIds);

  return {
    status: 'added' as const,
    items: candidate.filter(
      (item) => item.productType !== 'TEST' || !redundant.has(item.productIdentifier),
    ),
    removedRedundantTestIds: redundantIds,
  };
}
