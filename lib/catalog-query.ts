import { z } from 'zod';

export const PRODUCT_TYPES = ['TEST', 'PROFILE', 'PACKAGE'] as const;
export const AVAILABILITIES = ['AVAILABLE', 'CHECK_AVAILABILITY', 'UNAVAILABLE'] as const;
export const CATALOG_SORTS = ['name-asc', 'price-asc', 'price-desc'] as const;
export const DEFAULT_CATALOG_LIMIT = 20;
export const MAX_CATALOG_LIMIT = 50;
export const MAX_SEARCH_LENGTH = 100;

const cursorSchema = z.object({ sort: z.string(), key: z.string().min(1).max(160) });

export type CatalogCursor = z.infer<typeof cursorSchema>;

export function encodeCatalogCursor(cursor: CatalogCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCatalogCursor(value: string | null): CatalogCursor | undefined {
  if (!value) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    throw new CatalogQueryError();
  }
}

export class CatalogQueryError extends Error {
  constructor() { super('INVALID_CATALOG_QUERY'); }
}

export type CatalogQuery = {
  search?: string;
  type?: typeof PRODUCT_TYPES[number];
  category?: string;
  partner?: string;
  availability?: typeof AVAILABILITIES[number];
  minPrice?: number;
  maxPrice?: number;
  limit: number;
  cursor?: CatalogCursor;
  sort: typeof CATALOG_SORTS[number];
};

export function normalizeCatalogSearch(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
}

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const rawSearch = params.get('q') ?? params.get('search') ?? '';
  if (rawSearch.length > MAX_SEARCH_LENGTH) throw new CatalogQueryError();
  const search = normalizeCatalogSearch(rawSearch);
  const type = params.get('type')?.toUpperCase();
  const availability = params.get('availability')?.toUpperCase();
  const sort = params.get('sort') ?? 'name-asc';
  const category = params.get('category')?.trim().toLowerCase();
  const partner = (params.get('partner') ?? params.get('lab'))?.trim().toLowerCase();
  const parseMoney = (key: string) => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    if (!/^\d+$/.test(raw)) throw new CatalogQueryError();
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value > 10_000_000) throw new CatalogQueryError();
    return value;
  };
  const minPrice = parseMoney('minPrice');
  const maxPrice = parseMoney('maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new CatalogQueryError();
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? DEFAULT_CATALOG_LIMIT : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CATALOG_LIMIT) throw new CatalogQueryError();
  if (type && !PRODUCT_TYPES.includes(type as never)) throw new CatalogQueryError();
  if (availability && !AVAILABILITIES.includes(availability as never)) throw new CatalogQueryError();
  if (!CATALOG_SORTS.includes(sort as never)) throw new CatalogQueryError();
  if (category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) throw new CatalogQueryError();
  if (partner && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(partner)) throw new CatalogQueryError();
  const cursor = decodeCatalogCursor(params.get('cursor'));
  if (cursor && cursor.sort !== sort) throw new CatalogQueryError();
  return { search: search || undefined, type: type as CatalogQuery['type'], category, partner, availability: availability as CatalogQuery['availability'], minPrice, maxPrice, limit, cursor, sort: sort as CatalogQuery['sort'] };
}
