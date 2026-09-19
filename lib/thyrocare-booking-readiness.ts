import {
  evaluateCatalogOfferEligibility,
  type CatalogEligibilityReason,
  type CatalogOfferEligibilityInput,
  type CatalogPartnerEligibilityInput,
  type CatalogProductEligibilityInput,
} from './catalog-eligibility';
import {
  evaluateHomeCollectionServiceability,
  type PartnerServiceabilityInput,
  type ServiceabilityReason,
} from './serviceability';

export type ThyrocareBookingReadinessReason = CatalogEligibilityReason | ServiceabilityReason;

export type ThyrocareBookingReadinessResult = {
  bookable: boolean;
  reasons: ThyrocareBookingReadinessReason[];
};

export function evaluateThyrocareBookingReadiness(
  product: CatalogProductEligibilityInput,
  offer: CatalogOfferEligibilityInput,
  partner: CatalogPartnerEligibilityInput,
  pincode: string,
  serviceability?: PartnerServiceabilityInput | null,
  now = new Date(),
): ThyrocareBookingReadinessResult {
  const catalog = evaluateCatalogOfferEligibility(product, offer, partner, now);
  const homeCollection = evaluateHomeCollectionServiceability(pincode, serviceability);
  const reasons: ThyrocareBookingReadinessReason[] = [
    ...catalog.reasons,
    ...homeCollection.reasons,
  ];

  return reasons.length
    ? { bookable: false, reasons }
    : { bookable: true, reasons: [] };
}
