import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync("components/catalog/CatalogDetail.tsx", "utf8");

test("package presentation distinguishes total parameters from linked standalone tests", () => {
  assert.match(detail, /parameterCount/);
  assert.match(detail, /standalone tests/);
  assert.match(detail, /calculated\/derived parameters/);
  assert.match(detail, /Math\.max\(0,\s*Number\(product\.parameterCount\)[\s\S]*includedTestCount/);
});

test("details image modal is presented as a centered responsive overlay", () => {
  assert.match(detail, /fixed inset-0/);
  assert.match(detail, /items-center/);
  assert.match(detail, /justify-center/);
  assert.match(detail, /max-h-\[90vh\]/);
  assert.match(detail, /max-w-/);
  assert.match(detail, /aria-label=["']Close test details image["']/);
});
