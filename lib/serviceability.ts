export type ServiceabilityRecord = {
  partnerId: string;
  pincode: string;
  active: boolean;
  homeCollectionEnabled: boolean;
};

export function normalizeIndianPincode(value: string) {
  return value.trim();
}

export function isValidIndianPincode(value: string) {
  return /^[1-9][0-9]{5}$/.test(normalizeIndianPincode(value));
}

export function isHomeCollectionServiceable(
  partnerId: string,
  pincode: string,
  records: ServiceabilityRecord[],
) {
  const normalized = normalizeIndianPincode(pincode);
  if (!isValidIndianPincode(normalized)) return false;

  return records.some(
    (record) =>
      record.partnerId === partnerId &&
      normalizeIndianPincode(record.pincode) === normalized &&
      record.active &&
      record.homeCollectionEnabled,
  );
}
