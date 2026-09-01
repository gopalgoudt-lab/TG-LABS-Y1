export type PartnerServiceabilityInput = {
  pincode: string;
  active: boolean;
  homeCollectionEnabled: boolean;
};

export type ServiceabilityReason =
  | 'INVALID_PINCODE'
  | 'SERVICEABILITY_NOT_CONFIGURED'
  | 'SERVICEABILITY_PINCODE_MISMATCH'
  | 'SERVICEABILITY_INACTIVE'
  | 'HOME_COLLECTION_DISABLED';

export type ServiceabilityResult = {
  serviceable: boolean;
  reasons: ServiceabilityReason[];
};

export function isValidIndianPincode(pincode: string) {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

export function evaluateHomeCollectionServiceability(
  pincode: string,
  serviceability?: PartnerServiceabilityInput | null,
): ServiceabilityResult {
  const reasons: ServiceabilityReason[] = [];

  if (!isValidIndianPincode(pincode)) reasons.push('INVALID_PINCODE');
  if (!serviceability) reasons.push('SERVICEABILITY_NOT_CONFIGURED');
  else {
    if (serviceability.pincode !== pincode) reasons.push('SERVICEABILITY_PINCODE_MISMATCH');
    if (!serviceability.active) reasons.push('SERVICEABILITY_INACTIVE');
    if (!serviceability.homeCollectionEnabled) reasons.push('HOME_COLLECTION_DISABLED');
  }

  return reasons.length ? { serviceable: false, reasons } : { serviceable: true, reasons: [] };
}
