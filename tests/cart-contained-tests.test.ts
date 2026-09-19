import test from "node:test";
import assert from "node:assert/strict";
import { addCatalogItemWithContainment } from "../lib/catalog-cart";

const composition = new Map<string, string[]>([
  ["profile-a", ["t1", "t2"]],
  ["package-b", ["t2", "t3"]],
]);

const item = (productType: "TEST" | "PROFILE" | "PACKAGE", id: string) => ({
  productType,
  productIdentifier: id,
  productName: id,
  offerIdentifier: `offer-${id}`,
  partnerIdentifier: "thyrocare",
  displayedPrice: 100,
});

test("blocks an individual test already contained by a selected profile", () => {
  const current = [item("PROFILE", "profile-a")];
  const result = addCatalogItemWithContainment(current, item("TEST", "t1"), composition);
  assert.equal(result.status, "already-included");
  assert.deepEqual(result.items.map((x) => x.productIdentifier), ["profile-a"]);
});

test("adding a profile removes only redundant individual tests", () => {
  const current = [item("TEST", "t1"), item("TEST", "t4")];
  const result = addCatalogItemWithContainment(current, item("PROFILE", "profile-a"), composition);
  assert.equal(result.status, "added");
  assert.deepEqual(result.removedRedundantTestIds, ["t1"]);
  assert.deepEqual(result.items.map((x) => x.productIdentifier).sort(), ["profile-a", "t4"]);
});

test("overlapping packages remain selected", () => {
  const current = [item("PROFILE", "profile-a"), item("TEST", "t2")];
  const result = addCatalogItemWithContainment(current, item("PACKAGE", "package-b"), composition);
  assert.deepEqual(result.items.map((x) => x.productIdentifier).sort(), ["package-b", "profile-a"]);
  assert.deepEqual(result.removedRedundantTestIds, ["t2"]);
});

test("unrelated tests preserve partner and price data", () => {
  const existing = { ...item("TEST", "t4"), partnerIdentifier: "sagepath-labs", displayedPrice: 275 };
  const result = addCatalogItemWithContainment([existing], item("PROFILE", "profile-a"), composition);
  const kept = result.items.find((x) => x.productIdentifier === "t4");
  assert.equal(kept?.partnerIdentifier, "sagepath-labs");
  assert.equal(kept?.displayedPrice, 275);
});
