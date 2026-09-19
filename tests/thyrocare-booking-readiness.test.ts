import test from "node:test";
import assert from "node:assert/strict";
import { evaluateThyrocareBookingReadiness } from "../lib/thyrocare-booking-readiness";

const product = { active: true };
const partner = { active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true };
const offer = {
  active: true,
  availability: "AVAILABLE" as const,
  price: 500,
  tat: "24h",
  sourceReference: "verified-thyrocare-catalog",
  lastVerifiedAt: new Date("2026-09-19T00:00:00Z"),
};
const serviceability = { pincode: "500007", active: true, homeCollectionEnabled: true };

test("eligible Thyrocare offer can proceed for a supported home-collection pincode", () => {
  const result = evaluateThyrocareBookingReadiness(product, offer, partner, "500007", serviceability);
  assert.deepEqual(result, { bookable: true, reasons: [] });
});

test("eligible Thyrocare offer fails closed for an unsupported pincode", () => {
  const result = evaluateThyrocareBookingReadiness(product, offer, partner, "500999", null);
  assert.equal(result.bookable, false);
  assert.ok(result.reasons.includes("SERVICEABILITY_NOT_CONFIGURED"));
});

test("catalog eligibility still fails closed before serviceability can make an item bookable", () => {
  const result = evaluateThyrocareBookingReadiness(product, { ...offer, sourceReference: null }, partner, "500007", serviceability);
  assert.equal(result.bookable, false);
  assert.ok(result.reasons.includes("MISSING_SOURCE_REFERENCE"));
});
