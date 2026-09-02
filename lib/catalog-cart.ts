import { z } from 'zod';

export const cartItemSchema = z.object({
  productType: z.enum(['TEST', 'PROFILE', 'PACKAGE']),
  productIdentifier: z.string().min(1).max(160),
  offerIdentifier: z.string().min(1).max(160),
  partnerIdentifier: z.string().min(1).max(160),
  displayedPrice: z.number().int().positive(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
}).strict();
export type CatalogCartItem = z.infer<typeof cartItemSchema>;
export function parseCatalogCart(value: unknown): CatalogCartItem[] {
  const parsed = z.array(cartItemSchema).max(30).safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function readCatalogCart(raw: string | null) {
  if (!raw) return [];
  try { return parseCatalogCart(JSON.parse(raw)); } catch { return []; }
}
