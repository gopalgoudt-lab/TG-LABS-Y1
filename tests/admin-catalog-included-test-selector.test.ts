import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");

test("package editor provides searchable included-test selection", () => {
  assert.match(page, /Search TG Labs tests by name/);
  assert.match(page, /Search tests/);
  assert.match(page, /searchIncludedTests/);
  assert.match(page, /kind=test/);
});

test("included tests are selected by canonical catalog ID", () => {
  assert.match(page, /addIncludedTest/);
  assert.match(page, /ids\.push\(test\.id\)/);
  assert.match(page, /Selected catalog IDs are saved internally/);
  assert.match(page, /readOnly aria-label="Selected included test catalog IDs"/);
});

test("selected included tests can be removed without affecting protected controls", () => {
  assert.match(page, /removeIncludedTest/);
  assert.doesNotMatch(page, /bookingEnabled\s*:/);
  assert.doesNotMatch(page, /operationalEnabled\s*:/);
  assert.doesNotMatch(page, /displayEnabled\s*:/);
});
