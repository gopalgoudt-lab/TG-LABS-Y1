import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");
const route = fs.readFileSync("app/api/admin/catalog-editor/[kind]/[id]/route.ts", "utf8");

test("admin editor submits only sample fields accepted by strict patch schema", () => {
  assert.match(route, /sampleTypes:/);
  assert.match(route, /sampleTypeOther:/);
  assert.doesNotMatch(page, /sampleType:\s*form\.sampleType/);
  assert.match(page, /sampleTypeOther:\s*form\.sampleType/);
});
