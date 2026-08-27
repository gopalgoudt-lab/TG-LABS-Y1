export type PricedOffer = {
  id: string;
  testId: string;
  price: number;
  partner: { id: string; name: string };
  tat?: string | null;
};

export type PricedPackage = {
  id: string;
  price: number;
  tests: { test: { id: string } }[];
};

export function validateAndPriceBooking(
  selections: { testId: string; offerId: string }[],
  offers: PricedOffer[],
  packages: PricedPackage[],
  printedReportFee: number,
) {
  if (new Set(selections.map((selection) => selection.testId)).size !== selections.length) {
    throw new Error('DUPLICATE_TEST_SELECTION');
  }

  if (offers.length !== selections.length) throw new Error('OFFER_UNAVAILABLE');
  const requestedOfferByTest = new Map(selections.map((selection) => [selection.testId, selection.offerId]));
  if (offers.some((offer) => requestedOfferByTest.get(offer.testId) !== offer.id)) {
    throw new Error('OFFER_TEST_MISMATCH');
  }

  const packageTestIds = new Set(packages.flatMap((pkg) => pkg.tests.map((item) => item.test.id)));
  const diagnosticAmount =
    packages.reduce((sum, pkg) => sum + pkg.price, 0) +
    offers.reduce((sum, offer) => sum + (packageTestIds.has(offer.testId) ? 0 : offer.price), 0);

  return {
    diagnosticAmount,
    totalAmount: diagnosticAmount + printedReportFee,
    packageTestIds,
  };
}

export function assertBookingOwner(patientPhone: string, authenticatedPhone: string) {
  if (patientPhone !== authenticatedPhone) throw new Error('BOOKING_FORBIDDEN');
}

export function assertOnlinePaymentEligible(booking: {
  status: string;
  workflowStatus: string;
  paymentMode: string | null;
  paymentStatus: string;
}) {
  if (booking.paymentStatus === 'PAID') throw new Error('BOOKING_ALREADY_PAID');
  if (booking.status !== 'PENDING' || booking.workflowStatus !== 'BOOKING_CREATED') {
    throw new Error('BOOKING_NOT_ONLINE_PAYABLE');
  }
  if (booking.paymentMode !== 'ONLINE' && booking.paymentMode !== 'UPI') {
    throw new Error('BOOKING_NOT_ONLINE_PAYABLE');
  }
}
