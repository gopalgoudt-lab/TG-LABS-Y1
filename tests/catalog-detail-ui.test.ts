import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "components/catalog/CatalogDetail.tsx"), "utf8");

test("patient detail supports an optional View test details image action", () => {
  assert.match(source, /imageData/);
  assert.match(source, /View test details/);
  assert.match(source, /product\.imageData\s*\?/);
});

test("profile and package details show included-test count and a View all tests action", () => {
  assert.match(source, /includedTestCount/);
  assert.match(source, /Includes/);
  assert.match(source, /View all tests/);
  assert.match(source, /includedTests/);
});

test("included tests link to their patient test detail pages", () => {
  assert.match(source, /\/tests\/\$\{test\.slug\}/);
});
