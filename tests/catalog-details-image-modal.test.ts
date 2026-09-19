import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("components/catalog/CatalogDetail.tsx", "utf8");

test("test details image opens in an in-page modal instead of navigating to a data URL", () => {
  assert.match(source, /showDetailsImage/);
  assert.match(source, /setShowDetailsImage\(true\)/);
  assert.doesNotMatch(source, /href=\{detailsImage\}/);
});

test("details modal renders the safe image and an accessible close control", () => {
  assert.match(source, /role=["']dialog["']/);
  assert.match(source, /aria-modal=["']true["']/);
  assert.match(source, /src=\{detailsImage\}/);
  assert.match(source, /setShowDetailsImage\(false\)/);
  assert.match(source, /aria-label=["']Close test details image["']/);
});
