import test from "node:test";
import assert from "node:assert/strict";
import {
  testDetailsDto,
  packageDetailsDto,
  profileDetailsDto,
} from "../lib/catalog-public-dto";

const offer = {
  id: "offer-1",
  price: 500,
  mrp: 600,
  availability: "AVAILABLE",
  tat: "24h",
  partner: { slug: "thyrocare", name: "Thyrocare" },
};

const base = {
  id: "product-1",
  slug: "product-1",
  name: "Product One",
  aliases: [],
  description: "Description",
  preparation: null,
  fastingNeeded: false,
  fastingHours: null,
  parameterCount: null,
  sampleTypes: [],
  partnerOffers: [offer],
};

test("test details expose optional imageData", () => {
  const dto = testDetailsDto({ ...base, imageData: "data:image/png;base64,abc" });
  assert.equal(dto.imageData, "data:image/png;base64,abc");
});

test("missing imageData serializes as null", () => {
  const dto = testDetailsDto(base);
  assert.equal(dto.imageData, null);
});

test("package details expose package type, included test ids and count", () => {
  const dto = packageDetailsDto({
    ...base,
    packageType: "PACKAGE",
    imageData: "data:image/png;base64,pkg",
    tests: [
      { test: { id: "t1", slug: "cbc", name: "CBC" } },
      { test: { id: "t2", slug: "tsh", name: "TSH" } },
    ],
  });
  assert.equal(dto.type, "PACKAGE");
  assert.equal(dto.imageData, "data:image/png;base64,pkg");
  assert.equal(dto.includedTestCount, 2);
  assert.deepEqual(dto.includedTests, [
    { id: "t1", slug: "cbc", name: "CBC" },
    { id: "t2", slug: "tsh", name: "TSH" },
  ]);
});

test("profile details expose PROFILE type and included tests", () => {
  const dto = profileDetailsDto({
    ...base,
    packageType: "PROFILE",
    tests: [{ test: { id: "t1", slug: "cbc", name: "CBC" } }],
  });
  assert.equal(dto.type, "PROFILE");
  assert.equal(dto.includedTestCount, 1);
  assert.deepEqual(dto.includedTests, [{ id: "t1", slug: "cbc", name: "CBC" }]);
});
