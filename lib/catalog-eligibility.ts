export type CatalogOfferAvailability = 'AVAILABLE' | 'CHECK_AVAILABILITY' | 'UNAVAILABLE';

export type CatalogProductEligibilityInput = {
  active: boolean;
};

export type CatalogPartnerEligibilityInput = {
  active: boolean;
  bookingEnabled: boolean;
  operationalEnabled: boolean;
  displayEnabled?: boolean;
};

export type CatalogOfferEligibilityInput = {
  active: boolean;
  availability: CatalogOfferAvailability;
  price: number;
  tat?: string | null;
  sourceReference?: string | null;
  lastVerifiedAt?: Date | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
};

export type CatalogEligibilityReason =
  | 'PRODUCT_INACTIVE'
  | 'OFFER_INACTIVE'
  | 'OFFER_NOT_AVAILABLE'
  | 'INVALID_PRICE'
  | 'MISSING_TAT'
  | 'MISSING_SOURCE_REFERENCE'
  | 'MISSING_LAST_VERIFIED_AT'
  | 'PARTNER_INACTIVE'
  | 'PARTNER_BOOKING_DISABLED'
  | 'PARTNER_OPERATIONAL_DISABLED'
  | 'OFFER_NOT_YET_EFFECTIVE'
  | 'OFFER_EXPIRED'
  | 'INVALID_EFFECTIVE_DATE';

export type CatalogEligibilityResult = {
  bookable: boolean;
  reasons: CatalogEligibilityReason[];
};

function isValidDate(value: Date) {
  return Number.isFinite(value.getTime());
}

export function evaluateCatalogOfferEligibility(
  product: CatalogProductEligibilityInput,
  offer: CatalogOfferEligibilityInput,
  partner: CatalogPartnerEligibilityInput,
  now = new Date(),
): CatalogEligibilityResult {
  const reasons: CatalogEligibilityReason[] = [];

  if (!product.active) reasons.push('PRODUCT_INACTIVE');
  if (!offer.active) reasons.push('OFFER_INACTIVE');
  if (offer.availability !== 'AVAILABLE') reasons.push('OFFER_NOT_AVAILABLE');
  if (!Number.isSafeInteger(offer.price) || offer.price <= 0) reasons.push('INVALID_PRICE');
  if (!offer.tat?.trim()) reasons.push('MISSING_TAT');
  if (!offer.sourceReference?.trim()) reasons.push('MISSING_SOURCE_REFERENCE');
  if (!offer.lastVerifiedAt || !isValidDate(offer.lastVerifiedAt)) reasons.push('MISSING_LAST_VERIFIED_AT');
  if (!partner.active) reasons.push('PARTNER_INACTIVE');
  if (!partner.bookingEnabled) reasons.push('PARTNER_BOOKING_DISABLED');
  if (!partner.operationalEnabled) reasons.push('PARTNER_OPERATIONAL_DISABLED');

  if (!isValidDate(now)) {
    reasons.push('INVALID_EFFECTIVE_DATE');
  } else {
    if (offer.effectiveFrom) {
      if (!isValidDate(offer.effectiveFrom)) reasons.push('INVALID_EFFECTIVE_DATE');
      else if (offer.effectiveFrom.getTime() > now.getTime()) reasons.push('OFFER_NOT_YET_EFFECTIVE');
    }
    if (offer.effectiveTo) {
      if (!isValidDate(offer.effectiveTo)) reasons.push('INVALID_EFFECTIVE_DATE');
      else if (offer.effectiveTo.getTime() < now.getTime()) reasons.push('OFFER_EXPIRED');
    }
  }

  return reasons.length ? { bookable: false, reasons } : { bookable: true, reasons: [] };
}

export function isCatalogOfferDisplayable(product: CatalogProductEligibilityInput, offer: CatalogOfferEligibilityInput, partner: CatalogPartnerEligibilityInput, now = new Date()) {
  if (!partner.displayEnabled) return false;
  const result = evaluateCatalogOfferEligibility(product, offer, { ...partner, bookingEnabled: true, operationalEnabled: true }, now);
  return result.bookable;
}

export const evaluateTestOfferEligibility = evaluateCatalogOfferEligibility;
export const evaluatePackageOfferEligibility = evaluateCatalogOfferEligibility;
