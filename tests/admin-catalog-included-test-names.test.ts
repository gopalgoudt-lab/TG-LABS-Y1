import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");
const patch = fs.readFileSync("app/api/admin/catalog-editor/[kind]/[id]/route.ts", "utf8");

test("package composition accepts exact TG Labs test names as well as catalog IDs", () => {
  assert.match(page, /exact TG Labs test names or catalog IDs/i);
  assert.match(patch, /name:\s*\{ in: uniqueInputs, mode: 'insensitive' \}/);
  assert.match(patch, /test\.id === value/);
  assert.match(patch, /test\.name\.trim\(\)\.toLocaleLowerCase\(\)/);
});

test("invalid included tests return an actionable validation error", () => {
  assert.match(patch, /INVALID_INCLUDED_TEST/);
  assert.match(patch, /could not be matched uniquely/i);
  assert.match(page, /data\?\.error \|\| 'Save failed'/);
});

test("composition safeguards remain intact", () => {
  assert.match(patch, /adminAuditLog/);
  assert.doesNotMatch(patch, /bookingEnabled\s*:/);
  assert.doesNotMatch(patch, /operationalEnabled\s*:/);
  assert.doesNotMatch(patch, /displayEnabled\s*:/);
});
