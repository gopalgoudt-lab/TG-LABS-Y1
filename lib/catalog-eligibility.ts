import { isHomeCollectionServiceable, type ServiceabilityRecord } from './serviceability';

export type CommercialPartner = {
  id: string;
  active: boolean;
  bookingEnabled: boolean;
  operationalEnabled: boolean;
};

export type CommercialOffer = {
  active: boolean;
  availability: 'AVAILABLE' | 'CHECK_AVAILABILITY' | 'UNAVAILABLE';
  price: number;
  mrp?: number | null;
  tat?: string | null;
  sourceReference?: string | null;
  lastVerifiedAt?: Date | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
};

export type CommercialEligibilityInput = {
  product: { active: boolean };
  partner: CommercialPartner;
  offer: CommercialOffer;
  collection:
    | { mode: 'HOME'; pincode: string; serviceability: ServiceabilityRecord[] }
    | { mode: 'CENTRE'; centreCollectionConfigured: boolean };
  now?: Date;
};

export type CommercialIneligibilityReason =
  | 'PRODUCT_INACTIVE'
  | 'PARTNER_INACTIVE'
  | 'PARTNER_BOOKING_DISABLED'
  | 'PARTNER_OPERATIONAL_DISABLED'
  | 'OFFER_INACTIVE'
  | 'OFFER_NOT_AVAILABLE'
  | 'OFFER_PRICE_INVALID'
  | 'OFFER_PRICE_EXCEEDS_MRP'
  | 'OFFER_TAT_MISSING'
  | 'OFFER_SOURCE_MISSING'
  | 'OFFER_VERIFICATION_MISSING'
  | 'OFFER_NOT_YET_EFFECTIVE'
  | 'OFFER_EXPIRED'
  | 'HOME_COLLECTION_UNSERVICEABLE'
  | 'CENTRE_COLLECTION_NOT_CONFIGURED';

export function commercialIneligibilityReasons(input: CommercialEligibilityInput) {
  const reasons: CommercialIneligibilityReason[] = [];
  const now = input.now ?? new Date();

  if (!input.product.active) reasons.push('PRODUCT_INACTIVE');
  if (!input.partner.active) reasons.push('PARTNER_INACTIVE');
  if (!input.partner.bookingEnabled) reasons.push('PARTNER_BOOKING_DISABLED');
  if (!input.partner.operationalEnabled) reasons.push('PARTNER_OPERATIONAL_DISABLED');
  if (!input.offer.active) reasons.push('OFFER_INACTIVE');
  if (input.offer.availability !== 'AVAILABLE') reasons.push('OFFER_NOT_AVAILABLE');
  if (!Number.isInteger(input.offer.price) || input.offer.price <= 0) reasons.push('OFFER_PRICE_INVALID');
  if (input.offer.mrp != null && (input.offer.mrp <= 0 || input.offer.price > input.offer.mrp)) {
    reasons.push('OFFER_PRICE_EXCEEDS_MRP');
  }
  if (!input.offer.tat?.trim()) reasons.push('OFFER_TAT_MISSING');
  if (!input.offer.sourceReference?.trim()) reasons.push('OFFER_SOURCE_MISSING');
  if (!input.offer.lastVerifiedAt) reasons.push('OFFER_VERIFICATION_MISSING');
  if (input.offer.effectiveFrom && input.offer.effectiveFrom > now) reasons.push('OFFER_NOT_YET_EFFECTIVE');
  if (input.offer.effectiveTo && input.offer.effectiveTo < now) reasons.push('OFFER_EXPIRED');

  if (input.collection.mode === 'HOME') {
    if (!isHomeCollectionServiceable(input.partner.id, input.collection.pincode, input.collection.serviceability)) {
      reasons.push('HOME_COLLECTION_UNSERVICEABLE');
    }
  } else if (!input.collection.centreCollectionConfigured) {
    reasons.push('CENTRE_COLLECTION_NOT_CONFIGURED');
  }

  return reasons;
}

export function isCommerciallyEligible(input: CommercialEligibilityInput) {
  return commercialIneligibilityReasons(input).length === 0;
}

export function assertCommerciallyEligible(input: CommercialEligibilityInput) {
  const reasons = commercialIneligibilityReasons(input);
  if (reasons.length) {
    throw new Error(`CATALOG_NOT_BOOKABLE:${reasons.join(',')}`);
  }
}
