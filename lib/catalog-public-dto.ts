type Partner = { slug: string; name: string; accreditationDisplay?: string | null; accreditationReference?: string | null; accreditationVerifiedAt?: Date | null };
type Offer = { id: string; price: number; mrp?: number | null; availability: string; tat?: string | null; partner: Partner };

export function categoryDto(value: { slug: string; name: string; description?: string | null }) {
  return { slug: value.slug, name: value.name, description: value.description ?? null };
}

export function partnerOfferDto(value: Offer) {
  const verifiedAccreditation = value.partner.accreditationDisplay?.trim() && value.partner.accreditationReference?.trim() && value.partner.accreditationVerifiedAt
    ? value.partner.accreditationDisplay.trim() : null;
  return { offerId: value.id, partner: { slug: value.partner.slug, name: value.partner.name, accreditation: verifiedAccreditation }, price: value.price, mrp: value.mrp && value.mrp >= value.price ? value.mrp : null, discountPercent: value.mrp && value.mrp > value.price ? Math.round(((value.mrp - value.price) / value.mrp) * 100) : 0, availability: value.availability, tat: value.tat ?? null };
}

type Product = { id: string; slug: string; name: string; description?: string | null; preparation?: string | null; fastingNeeded: boolean; fastingHours?: number | null; parameterCount?: number | null; sampleTypes: string[]; categories?: Array<{ category: { slug: string; name: string; description?: string | null } }>; partnerOffers?: Offer[]; tests?: Array<{ test: { slug: string; name: string; fastingNeeded?: boolean; sampleTypes?: string[] } }> };

function baseProduct(value: Product, type: 'TEST' | 'PROFILE' | 'PACKAGE') {
  return { id: value.id, type, slug: value.slug, name: value.name, description: value.description ?? null, fastingNeeded: value.fastingNeeded, fastingHours: value.fastingHours ?? null, parameterCount: value.parameterCount ?? null, sampleTypes: value.sampleTypes, categories: (value.categories ?? []).map((x) => categoryDto(x.category)), offers: (value.partnerOffers ?? []).map(partnerOfferDto) };
}
export const testSummaryDto = (v: Product) => baseProduct(v, 'TEST');
export const testDetailsDto = (v: Product) => ({ ...baseProduct(v, 'TEST'), preparation: v.preparation ?? null });
export const packageSummaryDto = (v: Product & { packageType?: string | null }) => baseProduct(v, v.packageType === 'PROFILE' ? 'PROFILE' : 'PACKAGE');
export const profileSummaryDto = (v: Product) => baseProduct(v, 'PROFILE');
export const packageDetailsDto = (v: Product & { packageType?: string | null }) => ({ ...packageSummaryDto(v), preparation: v.preparation ?? null, tests: (v.tests ?? []).map((x) => ({ slug: x.test.slug, name: x.test.name })) });
export const profileDetailsDto = (v: Product) => ({ ...baseProduct(v, 'PROFILE'), preparation: v.preparation ?? null, tests: (v.tests ?? []).map((x) => ({ slug: x.test.slug, name: x.test.name })) });
export const serviceabilityDto = (supported: boolean, partner?: Partner) => ({ supported, partner: partner ? { slug: partner.slug, name: partner.name } : null });
