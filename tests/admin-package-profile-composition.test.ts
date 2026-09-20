import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");
const search = fs.readFileSync("app/api/admin/catalog-editor/search/route.ts", "utf8");
const patch = fs.readFileSync("app/api/admin/catalog-editor/[kind]/[id]/route.ts", "utf8");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

test("package editor can search and select profiles", () => {
  assert.match(page, /Included profiles/);
  assert.match(page, /Search TG Labs profiles by name/);
  assert.match(page, /packageType=PROFILE/);
  assert.match(page, /includedProfileIds: selectedProfiles\.map/);
});

test("selected profiles are expandable and expose their linked tests", () => {
  assert.match(page, /<details key=\{profile\.id\}/);
  assert.match(page, /profile\.tests\.map/);
  assert.match(search, /includedTests:/);
  assert.match(search, /name: item\.test\.name/);
});

test("package-profile membership is explicit and validated", () => {
  assert.match(schema, /model PackageProfileItem/);
  assert.match(patch, /packageProfileItem\.createMany/);
  assert.match(patch, /packageType: 'PROFILE'/);
  assert.match(patch, /partnerId: partner\.id/);
  assert.match(patch, /uniqueProfileIds\.includes\(id\)/);
});

test("composition does not change booking or serviceability controls", () => {
  assert.doesNotMatch(patch, /bookingEnabled\s*:/);
  assert.doesNotMatch(patch, /operationalEnabled\s*:/);
  assert.doesNotMatch(patch, /displayEnabled\s*:/);
  assert.doesNotMatch(patch, /partnerServiceability\.(create|update|delete|upsert)/i);
});
