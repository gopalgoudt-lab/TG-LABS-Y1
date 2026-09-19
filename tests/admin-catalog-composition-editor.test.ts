import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pagePath = "app/admin/catalog-editor/page.tsx";
const searchPath = "app/api/admin/catalog-editor/search/route.ts";
const patchPath = "app/api/admin/catalog-editor/[kind]/[id]/route.ts";

const page = fs.readFileSync(pagePath, "utf8");
const search = fs.readFileSync(searchPath, "utf8");
const patch = fs.readFileSync(patchPath, "utf8");

test("admin editor exposes patient detail image metadata", () => {
  assert.match(page, /Test details image/i);
  assert.match(page, /imageData/);
  assert.match(search, /imageData/);
  assert.match(patch, /imageData/);
});

test("package/profile editor exposes included test membership", () => {
  assert.match(page, /Included tests/i);
  assert.match(page, /includedTestIds/);
  assert.match(search, /includedTestIds/);
  assert.match(patch, /includedTestIds/);
  assert.match(patch, /packageItem/i);
});

test("composition write remains audited and cannot alter activation/serviceability", () => {
  assert.match(patch, /adminAuditLog/);
  assert.match(patch, /changedFields/);
  assert.doesNotMatch(patch, /bookingEnabled\s*:/);
  assert.doesNotMatch(patch, /operationalEnabled\s*:/);
  assert.doesNotMatch(patch, /displayEnabled\s*:/);
  assert.doesNotMatch(patch, /partnerServiceability\.(create|update|delete|upsert)/i);
});
