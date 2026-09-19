import test from "node:test";
import assert from "node:assert/strict";
import { validateAndPriceBooking } from "../lib/booking-integrity";

const offers = [
  { id: "offer-t1", testId: "t1", price: 200, partner: { id: "thy", name: "Thyrocare" } },
];
const pkgA = { id: "profile-a", price: 500, tests: [{ test: { id: "t1" } }, { test: { id: "t2" } }] };
const pkgB = { id: "package-b", price: 700, tests: [{ test: { id: "t2" } }, { test: { id: "t3" } }] };

test("server rejects a direct test already contained in a selected profile/package", () => {
  assert.throws(
    () => validateAndPriceBooking([{ testId: "t1", offerId: "offer-t1" }], offers, [pkgA], 0),
    /TEST_ALREADY_INCLUDED_IN_PACKAGE/,
  );
});

test("overlapping packages remain legal when there is no redundant direct test", () => {
  const result = validateAndPriceBooking([], [], [pkgA, pkgB], 0);
  assert.equal(result.diagnosticAmount, 1200);
  assert.deepEqual([...result.packageTestIds].sort(), ["t1", "t2", "t3"]);
});

test("unrelated direct test remains chargeable alongside a package", () => {
  const unrelated = [{ id: "offer-t4", testId: "t4", price: 300, partner: { id: "thy", name: "Thyrocare" } }];
  const result = validateAndPriceBooking([{ testId: "t4", offerId: "offer-t4" }], unrelated, [pkgA], 0);
  assert.equal(result.diagnosticAmount, 800);
});
